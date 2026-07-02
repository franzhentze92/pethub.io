import { subDays, subMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  getAppointmentTypeLabel,
  inferAppointmentTypeFromText,
  isVaccinationType,
  normalizeAppointmentType,
} from '@/lib/veterinaryTypes';
import { parseVetDocument } from '@/lib/parseVetDocument';
import type { VetDocumentExtraction } from '@/lib/vetDocumentTypes';
import { queryVetDocument } from '../helpers/veterinaryDocumentQuery';
import {
  getVaccinationStatusLabel,
  getVaccineBySlug,
  matchVaccineSlugFromText,
  resolveNextDueDate,
} from '@/lib/vaccinationCatalog';
import {
  buildVaccinationSchedule,
  getLatestVaccinationPerSlug,
  loadVaccineCatalog,
  mapPetVaccinationRow,
  upsertPetVaccinationFromSession,
  type PetVaccinationRow,
} from '@/lib/petVaccinations';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { loadUserPets, matchPetByName, resolvePets, wantsAllPets } from '../helpers/petResolver';

type SessionRow = {
  id: string;
  pet_id: string;
  appointment_type: string;
  date: string;
  veterinarian_name: string;
  veterinary_clinic?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  prescription?: string | null;
  follow_up_date?: string | null;
  follow_up_completed_at?: string | null;
  cost?: number | null;
  pdf_url?: string | null;
  invoice_url?: string | null;
  pets?: { name?: string } | null;
};

const SESSION_SELECT = `
  id,
  pet_id,
  appointment_type,
  date,
  veterinarian_name,
  veterinary_clinic,
  diagnosis,
  treatment,
  notes,
  prescription,
  follow_up_date,
  follow_up_completed_at,
  cost,
  pdf_url,
  invoice_url,
  pets(name)
`;

function mapSession(row: SessionRow) {
  return {
    id: row.id,
    pet_name: row.pets?.name ?? 'Mascota',
    appointment_type: normalizeAppointmentType(row.appointment_type),
    appointment_label: getAppointmentTypeLabel(row.appointment_type),
    date: row.date,
    veterinarian_name: row.veterinarian_name,
    veterinary_clinic: row.veterinary_clinic ?? null,
    diagnosis: row.diagnosis ?? null,
    treatment: row.treatment ?? null,
    prescription: row.prescription ?? null,
    notes: row.notes ?? null,
    follow_up_date: row.follow_up_date ?? null,
    follow_up_completed: Boolean(row.follow_up_completed_at),
    has_documents: Boolean(row.pdf_url || row.invoice_url),
    cost: row.cost != null ? Number(row.cost) : null,
  };
}

async function loadOwnerSessions(ctx: AiExecutionContext) {
  if (!ctx.userId) {
    return { error: 'Usuario no autenticado', sessions: [] as ReturnType<typeof mapSession>[] };
  }

  const { data, error } = await supabase
    .from('veterinary_sessions')
    .select(SESSION_SELECT)
    .eq('owner_id', ctx.userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return { sessions: (data ?? []).map((row) => mapSession(row as SessionRow)) };
}

function filterSessionsByPetName(
  sessions: ReturnType<typeof mapSession>[],
  petName?: string,
) {
  if (!petName?.trim()) return sessions;
  const needle = petName.trim().toLowerCase();
  return sessions.filter((s) => s.pet_name.toLowerCase().includes(needle));
}

function vaccinationStatusFromRecord(record: ReturnType<typeof mapPetVaccinationRow>) {
  return {
    pet_name: record.pet_name,
    vaccine_slug: record.vaccine_slug,
    vaccine_name: record.vaccine_name,
    last_vaccination_date: record.administered_at,
    next_due_date: record.next_due_date,
    status: record.status,
    status_label: getVaccinationStatusLabel(record.status),
    veterinarian_name: record.veterinarian_name,
    veterinary_clinic: record.veterinary_clinic,
  };
}

function normalizeVisitDate(raw?: string): string {
  const today = new Date();
  const lower = (raw ?? '').trim().toLowerCase();
  if (!raw?.trim() || lower === 'hoy' || lower === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (lower === 'ayer' || lower === 'yesterday') {
    return subDays(today, 1).toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }
  return today.toISOString().split('T')[0];
}

export const veterinaryModule: AiModuleDefinition = {
  id: 'veterinary',
  name: 'Veterinaria',
  description:
    'Consultar, registrar y analizar historial veterinario, visitas, vacunas, documentos PDF y gastos',
  basePath: '/veterinaria',
  tools: [
    {
      name: 'veterinary_list_sessions',
      description:
        'Lista visitas veterinarias del usuario. Usar cuando pregunte por historial médico, visitas al vet, citas pasadas o registros de salud. Filtra por mascota, tipo de cita o período.',
      keywords: [
        'historial veterinario',
        'visitas veterinarias',
        'visitas al vet',
        'citas veterinarias',
        'registros médicos',
        'historial médico',
        'última visita',
        'ultima visita',
        'qué visitas',
        'que visitas',
        'cuándo fui al vet',
        'cuando fui al vet',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Filtrar por nombre de mascota' },
          appointment_type: {
            type: 'string',
            description:
              'Filtrar por tipo: consulta_general, vacunacion, revision_medica, emergencia, cirugia, cuidado_dental, aseo, otro',
          },
          limit: { type: 'number', description: 'Máximo de visitas (default 10)' },
          days_back: { type: 'number', description: 'Solo visitas de los últimos N días' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          appointment_type?: string;
          limit?: number;
          days_back?: number;
        },
        ctx: AiExecutionContext,
      ) => {
        const loaded = await loadOwnerSessions(ctx);
        if ('error' in loaded) return loaded;

        let sessions = loaded.sessions;

        if (params.pet_name?.trim()) {
          const pets = await loadUserPets(ctx);
          const match = matchPetByName(pets, params.pet_name);
          if (!match) {
            return {
              error: 'PET_NOT_FOUND',
              message: `No encontré esa mascota. Las tuyas son: ${pets.map((p) => p.name).join(', ')}`,
              pets: pets.map((p) => p.name),
            };
          }
          sessions = sessions.filter((s) => s.pet_name.toLowerCase() === match.name.toLowerCase());
        }

        if (params.appointment_type?.trim()) {
          const normalized = normalizeAppointmentType(params.appointment_type);
          sessions = sessions.filter((s) => s.appointment_type === normalized);
        }

        if (params.days_back && params.days_back > 0) {
          const cutoff = subDays(new Date(), params.days_back).toISOString().split('T')[0];
          sessions = sessions.filter((s) => s.date >= cutoff);
        }

        const limit = Math.min(params.limit ?? 10, 25);
        sessions = sessions.slice(0, limit);

        return {
          total: sessions.length,
          sessions,
          disclaimer:
            'Información de historial registrada en PetHub. No sustituye consejo veterinario profesional.',
        };
      },
    },
    {
      name: 'veterinary_get_session',
      description:
        'Obtiene el detalle de una visita veterinaria: diagnóstico, tratamiento, receta, notas y documentos. Usar cuando pregunte qué dijo el veterinario, el diagnóstico, tratamiento o detalles de una visita específica.',
      keywords: [
        'diagnóstico',
        'diagnostico',
        'qué dijo el veterinario',
        'que dijo el veterinario',
        'tratamiento',
        'receta',
        'prescripción',
        'prescripcion',
        'detalle de la visita',
        'última visita veterinaria',
        'ultima visita veterinaria',
      ],
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'ID de la visita (si se conoce)' },
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          most_recent: {
            type: 'boolean',
            description: 'Si true, devuelve la visita más reciente de la mascota (default true)',
          },
        },
        additionalProperties: false,
      },
      execute: async (
        params: { session_id?: string; pet_name?: string; most_recent?: boolean },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado' };
        }

        if (params.session_id?.trim()) {
          const { data, error } = await supabase
            .from('veterinary_sessions')
            .select(SESSION_SELECT)
            .eq('owner_id', ctx.userId)
            .eq('id', params.session_id.trim())
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            return { error: 'SESSION_NOT_FOUND', message: 'No encontré esa visita veterinaria.' };
          }

          return {
            session: mapSession(data as SessionRow),
            disclaimer:
              'Resumen del historial registrado. Consulta siempre a un veterinario para decisiones clínicas.',
          };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿De cuál mascota quieres el detalle? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? `No encontré esa mascota.`,
            pets: petResult.pets,
          };
        }

        const petIds = petResult.pets.map((p) => p.id);
        const { data, error } = await supabase
          .from('veterinary_sessions')
          .select(SESSION_SELECT)
          .eq('owner_id', ctx.userId)
          .in('pet_id', petIds)
          .order('date', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (!data?.length) {
          return {
            error: 'NO_SESSIONS',
            message: `No hay visitas veterinarias registradas para ${petResult.pets.map((p) => p.name).join(', ')}.`,
            actionPath: '/veterinaria',
          };
        }

        return {
          session: mapSession(data[0] as SessionRow),
          disclaimer:
            'Resumen del historial registrado. Consulta siempre a un veterinario para decisiones clínicas.',
        };
      },
    },
    {
      name: 'veterinary_vaccination_status',
      description:
        'Consulta el estado de vacunación: última vacuna, próxima fecha y si está al día. Usar cuando pregunte por vacunas, calendario de vacunación o si le toca vacuna.',
      keywords: [
        'vacuna',
        'vacunas',
        'vacunación',
        'vacunacion',
        'calendario de vacunas',
        'próxima vacuna',
        'proxima vacuna',
        'le toca vacuna',
        'está al día',
        'esta al dia',
        'antirrábica',
        'antirrabica',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota (opcional si solo hay una)' },
        },
        additionalProperties: false,
      },
      execute: async (params: { pet_name?: string }, ctx: AiExecutionContext) => {
        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿De cuál mascota quieres el estado de vacunas? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        const petIds = petResult.pets.map((p) => p.id);
        const { data, error } = await supabase
          .from('pet_vaccinations')
          .select(`
            *,
            pets(name, species)
          `)
          .eq('owner_id', ctx.userId!)
          .in('pet_id', petIds)
          .order('administered_at', { ascending: false });

        if (error) throw error;

        const vaccinations = (data ?? []).map((row) =>
          mapPetVaccinationRow(row as PetVaccinationRow),
        );

        const statusByPet = petResult.pets.map((pet) => {
          const petVaccinations = getLatestVaccinationPerSlug(
            vaccinations.filter((v) => v.pet_id === pet.id),
          );

          if (petVaccinations.length === 0) {
            return {
              pet_name: pet.name,
              has_vaccination_records: false,
              vaccinations: [],
              message: 'No hay vacunas registradas.',
            };
          }

          const records = petVaccinations.map(vaccinationStatusFromRecord);
          const overdueCount = records.filter((r) => r.status === 'overdue').length;
          const dueSoonCount = records.filter((r) => r.status === 'due_soon').length;

          return {
            pet_name: pet.name,
            has_vaccination_records: true,
            vaccinations: records,
            overdue_count: overdueCount,
            due_soon_count: dueSoonCount,
            total_vaccines_tracked: records.length,
          };
        });

        return {
          pets: statusByPet,
          disclaimer:
            'Basado en el registro estructurado de vacunas. Confirma el calendario con tu veterinario.',
        };
      },
    },
    {
      name: 'veterinary_spending_summary',
      description:
        'Resume gastos veterinarios: total, promedio y cantidad de visitas. Usar cuando pregunte cuánto ha gastado en veterinaria o costos de salud.',
      keywords: [
        'gasto veterinario',
        'gastos veterinarios',
        'cuánto gasté',
        'cuanto gaste',
        'cuánto he gastado',
        'cuanto he gastado',
        'costo veterinario',
        'costos de salud',
        'gastos en veterinaria',
        'presupuesto veterinario',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Filtrar por mascota' },
          months: { type: 'number', description: 'Período en meses (default 12)' },
        },
        additionalProperties: false,
      },
      execute: async (params: { pet_name?: string; months?: number }, ctx: AiExecutionContext) => {
        const loaded = await loadOwnerSessions(ctx);
        if ('error' in loaded) return loaded;

        const months = params.months && params.months > 0 ? Math.min(params.months, 36) : 12;
        const cutoff = subMonths(new Date(), months).toISOString().split('T')[0];

        let sessions = loaded.sessions.filter((s) => s.date >= cutoff && s.cost != null && s.cost > 0);

        if (params.pet_name?.trim()) {
          sessions = filterSessionsByPetName(sessions, params.pet_name);
        }

        const totalCost = sessions.reduce((sum, s) => sum + (s.cost ?? 0), 0);
        const visitCount = sessions.length;
        const averageCost = visitCount > 0 ? totalCost / visitCount : 0;

        const byPet = sessions.reduce<Record<string, { total: number; visits: number }>>((acc, s) => {
          if (!acc[s.pet_name]) acc[s.pet_name] = { total: 0, visits: 0 };
          acc[s.pet_name].total += s.cost ?? 0;
          acc[s.pet_name].visits += 1;
          return acc;
        }, {});

        return {
          period_months: months,
          total_cost: Math.round(totalCost * 100) / 100,
          average_cost: Math.round(averageCost * 100) / 100,
          visit_count: visitCount,
          currency: 'GTQ',
          by_pet: Object.entries(byPet).map(([pet_name, stats]) => ({
            pet_name,
            total_cost: Math.round(stats.total * 100) / 100,
            visit_count: stats.visits,
          })),
        };
      },
    },
    {
      name: 'veterinary_register_visit',
      description:
        'Registra una visita veterinaria en el historial. Usar cuando el usuario pida guardar/anotar una visita al vet, vacuna, consulta o emergencia. Requiere veterinario y diagnóstico. Una mascota por registro.',
      keywords: [
        'registrar visita',
        'registra visita',
        'anotar visita',
        'guardar visita',
        'fui al vet',
        'fui al veterinario',
        'llevé al vet',
        'lleve al vet',
        'visita veterinaria',
        'registrar vacuna',
        'registra vacuna',
        'poner vacuna',
        'le pusieron',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota (opcional si solo hay una)' },
          appointment_type: {
            type: 'string',
            description:
              'Tipo: consulta_general, vacunacion, revision_medica, emergencia, cirugia, cuidado_dental, aseo, otro',
          },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD, "hoy" o "ayer" (default hoy)' },
          veterinarian_name: { type: 'string', description: 'Nombre del veterinario (requerido)' },
          veterinary_clinic: { type: 'string', description: 'Nombre de la clínica' },
          diagnosis: { type: 'string', description: 'Diagnóstico o motivo de la visita (requerido)' },
          treatment: { type: 'string', description: 'Tratamiento indicado' },
          prescription: { type: 'string', description: 'Receta o medicamentos' },
          notes: { type: 'string', description: 'Notas adicionales' },
          cost: { type: 'number', description: 'Costo en quetzales' },
          follow_up_date: { type: 'string', description: 'Fecha de seguimiento YYYY-MM-DD' },
          vaccine_slug: {
            type: 'string',
            description:
              'Slug de vacuna si es vacunación: rabies, dhpp, bordetella, leptospirosis, fvrcp, felv, deworming, other',
          },
        },
        required: ['veterinarian_name', 'diagnosis'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          appointment_type?: string;
          date?: string;
          veterinarian_name: string;
          veterinary_clinic?: string;
          diagnosis: string;
          treatment?: string;
          prescription?: string;
          notes?: string;
          cost?: number;
          follow_up_date?: string;
          vaccine_slug?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado' };
        }

        if (params.pet_name?.trim() && wantsAllPets(params.pet_name)) {
          return {
            error: 'SINGLE_PET_REQUIRED',
            message:
              'Las visitas veterinarias se registran una mascota a la vez. Indica el nombre de la mascota.',
          };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿Para cuál mascota es la visita? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        if (petResult.pets.length > 1) {
          return {
            error: 'PET_REQUIRED',
            message: `¿Para cuál mascota es la visita? Tienes: ${petResult.pets.map((p) => p.name).join(', ')}.`,
            pets: petResult.pets.map((p) => p.name),
          };
        }

        const vetName = params.veterinarian_name?.trim();
        const diagnosis = params.diagnosis?.trim();
        if (!vetName) {
          return { error: 'VET_REQUIRED', message: '¿Cuál es el nombre del veterinario?' };
        }
        if (!diagnosis) {
          return { error: 'DIAGNOSIS_REQUIRED', message: '¿Cuál fue el diagnóstico o motivo de la visita?' };
        }

        const pet = petResult.pets[0];
        const appointmentType = normalizeAppointmentType(
          params.appointment_type ?? inferAppointmentTypeFromText(diagnosis),
        );
        const date = normalizeVisitDate(params.date);
        const followUpDate =
          params.follow_up_date && /^\d{4}-\d{2}-\d{2}$/.test(params.follow_up_date)
            ? params.follow_up_date
            : isVaccinationType(appointmentType)
              ? resolveNextDueDate({
                  administeredAt: date,
                  vaccineSlug:
                    params.vaccine_slug?.trim() ||
                    matchVaccineSlugFromText(diagnosis, pet.species),
                  catalog: await loadVaccineCatalog(),
                })
              : null;
        const cost =
          params.cost != null && Number.isFinite(Number(params.cost)) ? Number(params.cost) : null;

        const { data, error } = await supabase
          .from('veterinary_sessions')
          .insert({
            pet_id: pet.id,
            owner_id: ctx.userId,
            appointment_type: appointmentType,
            date,
            veterinarian_name: vetName,
            veterinary_clinic: params.veterinary_clinic?.trim() || null,
            diagnosis,
            treatment: params.treatment?.trim() || null,
            prescription: params.prescription?.trim() || null,
            notes: params.notes?.trim() || null,
            follow_up_date: followUpDate,
            cost,
          })
          .select(SESSION_SELECT)
          .single();

        if (error) throw error;

        if (isVaccinationType(appointmentType)) {
          await upsertPetVaccinationFromSession({
            petId: pet.id,
            ownerId: ctx.userId,
            administeredAt: date,
            vaccineSlug: params.vaccine_slug?.trim() || null,
            vaccineName: diagnosis,
            nextDueDate: followUpDate,
            veterinarianName: vetName,
            veterinaryClinic: params.veterinary_clinic?.trim() || null,
            sessionId: (data as SessionRow).id,
            notes: params.notes?.trim() || null,
            petSpecies: pet.species,
          });
        }

        const session = mapSession(data as SessionRow);
        return {
          success: true,
          session,
          message: `Visita registrada para ${pet.name}.`,
        };
      },
    },
    {
      name: 'veterinary_set_follow_up',
      description:
        'Programa o actualiza la fecha de seguimiento de una visita veterinaria (recordatorio de vacuna o cita de control). Usar cuando el usuario quiera agendar próxima vacuna, recordatorio de seguimiento o fecha de control.',
      keywords: [
        'seguimiento veterinario',
        'recordatorio vacuna',
        'próxima vacuna',
        'proxima vacuna',
        'agendar seguimiento',
        'programar seguimiento',
        'fecha de control',
        'recordatorio veterinario',
        'cita de seguimiento',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          session_id: { type: 'string', description: 'ID de la visita (si se conoce)' },
          follow_up_date: { type: 'string', description: 'Fecha de seguimiento YYYY-MM-DD (requerida)' },
          use_latest_visit: {
            type: 'boolean',
            description: 'Si true, aplica a la visita más reciente de la mascota (default true)',
          },
        },
        required: ['follow_up_date'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          session_id?: string;
          follow_up_date: string;
          use_latest_visit?: boolean;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado' };
        }

        if (!params.follow_up_date?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(params.follow_up_date.trim())) {
          return {
            error: 'FOLLOW_UP_DATE_REQUIRED',
            message: '¿Cuál es la fecha de seguimiento? Usa formato AAAA-MM-DD.',
          };
        }

        const followUpDate = params.follow_up_date.trim();
        let sessionId = params.session_id?.trim();

        if (!sessionId) {
          const petResult = await resolvePets(ctx, params.pet_name);
          if ('error' in petResult) {
            if (petResult.error === 'NO_PETS') {
              return {
                error: 'NO_PETS',
                message: 'Primero debes registrar una mascota en PetHub.',
                actionPath: '/pet-creation',
              };
            }
            if (petResult.error === 'PET_REQUIRED') {
              return {
                error: 'PET_REQUIRED',
                message: `¿Para cuál mascota es el seguimiento? Tienes: ${petResult.pets?.join(', ')}.`,
                pets: petResult.pets,
              };
            }
            return {
              error: 'PET_NOT_FOUND',
              message: petResult.message ?? 'No encontré esa mascota.',
              pets: petResult.pets,
            };
          }

          if (petResult.pets.length > 1) {
            return {
              error: 'PET_REQUIRED',
              message: `¿Para cuál mascota? Tienes: ${petResult.pets.map((p) => p.name).join(', ')}.`,
              pets: petResult.pets.map((p) => p.name),
            };
          }

          const { data: latest, error: latestError } = await supabase
            .from('veterinary_sessions')
            .select('id')
            .eq('owner_id', ctx.userId)
            .eq('pet_id', petResult.pets[0].id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestError) throw latestError;
          if (!latest) {
            return {
              error: 'NO_SESSIONS',
              message: `No hay visitas registradas para ${petResult.pets[0].name}. Primero registra una visita.`,
              actionPath: '/veterinaria',
            };
          }
          sessionId = latest.id;
        }

        const { data, error } = await supabase
          .from('veterinary_sessions')
          .update({
            follow_up_date: followUpDate,
            follow_up_completed_at: null,
          })
          .eq('owner_id', ctx.userId)
          .eq('id', sessionId)
          .select(SESSION_SELECT)
          .single();

        if (error) throw error;
        if (!data) {
          return { error: 'SESSION_NOT_FOUND', message: 'No encontré esa visita veterinaria.' };
        }

        const session = mapSession(data as SessionRow);
        return {
          success: true,
          session,
          message: `Seguimiento programado para ${session.pet_name} el ${followUpDate}.`,
        };
      },
    },
    {
      name: 'veterinary_analyze_document',
      description:
        'Resume y analiza el PDF o documento de resultados veterinarios de una visita (laboratorio, análisis de sangre, factura). Usar cuando pregunte qué salió en el análisis, valores altos/bajos, o quiera entender el documento subido.',
      keywords: [
        'analiza el pdf',
        'analiza el documento',
        'resultados de laboratorio',
        'análisis de sangre',
        'analisis de sangre',
        'valores del examen',
        'qué salió en el análisis',
        'que salio en el analisis',
        'interpretar resultados',
        'pdf veterinario',
        'documento veterinario',
      ],
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'ID de la visita veterinaria' },
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          document_type: {
            type: 'string',
            description: 'lab_results o invoice (default lab_results)',
          },
          reparse: { type: 'boolean', description: 'Forzar nuevo análisis del documento' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: {
          session_id?: string;
          pet_name?: string;
          document_type?: string;
          reparse?: boolean;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado' };
        }

        const documentType = params.document_type === 'invoice' ? 'invoice' : 'lab_results';
        let sessionRow: SessionRow | null = null;

        if (params.session_id?.trim()) {
          const { data, error } = await supabase
            .from('veterinary_sessions')
            .select(SESSION_SELECT)
            .eq('owner_id', ctx.userId)
            .eq('id', params.session_id.trim())
            .maybeSingle();
          if (error) throw error;
          sessionRow = (data as SessionRow) ?? null;
        } else {
          const petResult = await resolvePets(ctx, params.pet_name);
          if ('error' in petResult) {
            if (petResult.error === 'NO_PETS') {
              return {
                error: 'NO_PETS',
                message: 'Primero debes registrar una mascota en PetHub.',
                actionPath: '/pet-creation',
              };
            }
            if (petResult.error === 'PET_REQUIRED') {
              return {
                error: 'PET_REQUIRED',
                message: petResult.message ?? '¿De cuál mascota quieres analizar el documento?',
                pets: petResult.pets,
              };
            }
            return {
              error: 'PET_NOT_FOUND',
              message: petResult.message ?? 'No encontré esa mascota.',
              pets: petResult.pets,
            };
          }

          const petIds = petResult.pets.map((p) => p.id);
          const { data, error } = await supabase
            .from('veterinary_sessions')
            .select(SESSION_SELECT)
            .eq('owner_id', ctx.userId)
            .in('pet_id', petIds)
            .not(documentType === 'invoice' ? 'invoice_url' : 'pdf_url', 'is', null)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          sessionRow = (data as SessionRow) ?? null;
        }

        if (!sessionRow) {
          return {
            error: 'NO_DOCUMENT',
            message: 'No encontré una visita con documento para analizar.',
            actionPath: '/veterinaria',
          };
        }

        const session = mapSession(sessionRow);
        const documentUrl =
          documentType === 'invoice' ? sessionRow.invoice_url : sessionRow.pdf_url;

        if (!documentUrl) {
          return {
            error: 'NO_DOCUMENT',
            message:
              documentType === 'invoice'
                ? 'Esta visita no tiene factura adjunta.'
                : 'Esta visita no tiene PDF de resultados adjunto.',
            actionPath: '/veterinaria',
          };
        }

        let extraction: VetDocumentExtraction | null = null;

        const { data: existing } = await supabase
          .from('vet_document_extractions')
          .select('*')
          .eq('session_id', sessionRow.id)
          .eq('document_url', documentUrl)
          .maybeSingle();

        if (existing && existing.parse_status === 'completed' && !params.reparse) {
          extraction = existing as VetDocumentExtraction;
        } else {
          const parsed = await parseVetDocument({
            sessionId: sessionRow.id,
            documentUrl,
            documentType,
            forceReparse: params.reparse ?? false,
          });

          if (!parsed.success || !parsed.extraction) {
            return {
              error: 'PARSE_FAILED',
              message:
                parsed.error ||
                'No se pudo analizar el documento. Verifica que el PDF sea legible.',
              actionPath: '/veterinaria',
            };
          }
          extraction = parsed.extraction;
        }

        const structured = extraction.structured_data ?? {};

        return {
          session,
          extraction: {
            document_type: extraction.document_type,
            summary: extraction.summary,
            parse_status: extraction.parse_status,
            structured_data: structured,
          },
          disclaimer:
            'Resumen informativo del documento. No sustituye la interpretación de un veterinario profesional.',
        };
      },
    },
    {
      name: 'veterinary_query_document',
      description:
        'Responde preguntas específicas sobre un documento veterinario ya analizado (glucosa, creatinina, valores altos, etc.). Usar cuando pregunte por un analito concreto del PDF sin pedir el resumen completo.',
      keywords: [
        'glucosa',
        'creatinina',
        'hemoglobina',
        'qué valor',
        'que valor',
        'cuánto salió',
        'cuanto salio',
        'está alto',
        'esta alto',
        'está bajo',
        'analito',
        'resultado de',
        'valor de',
      ],
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Pregunta sobre el documento (ej. cuál es la glucosa)' },
          session_id: { type: 'string', description: 'ID de la visita veterinaria' },
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          document_type: {
            type: 'string',
            description: 'lab_results o invoice (default lab_results)',
          },
        },
        required: ['question'],
        additionalProperties: false,
      },
      execute: async (
        params: {
          question: string;
          session_id?: string;
          pet_name?: string;
          document_type?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado' };
        }

        const documentType = params.document_type === 'invoice' ? 'invoice' : 'lab_results';
        let sessionRow: SessionRow | null = null;

        if (params.session_id?.trim()) {
          const { data, error } = await supabase
            .from('veterinary_sessions')
            .select(SESSION_SELECT)
            .eq('owner_id', ctx.userId)
            .eq('id', params.session_id.trim())
            .maybeSingle();
          if (error) throw error;
          sessionRow = (data as SessionRow) ?? null;
        } else {
          const petResult = await resolvePets(ctx, params.pet_name);
          if ('error' in petResult) {
            return {
              error: petResult.error,
              message: petResult.message ?? '¿De cuál mascota es el documento?',
              pets: petResult.pets,
            };
          }

          const petIds = petResult.pets.map((p) => p.id);
          const { data, error } = await supabase
            .from('veterinary_sessions')
            .select(SESSION_SELECT)
            .eq('owner_id', ctx.userId)
            .in('pet_id', petIds)
            .not(documentType === 'invoice' ? 'invoice_url' : 'pdf_url', 'is', null)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          sessionRow = (data as SessionRow) ?? null;
        }

        if (!sessionRow) {
          return {
            error: 'NO_DOCUMENT',
            message: 'No encontré una visita con documento para consultar.',
            actionPath: '/veterinaria',
          };
        }

        const documentUrl =
          documentType === 'invoice' ? sessionRow.invoice_url : sessionRow.pdf_url;
        if (!documentUrl) {
          return {
            error: 'NO_DOCUMENT',
            message: 'Esta visita no tiene documento adjunto.',
            actionPath: '/veterinaria',
          };
        }

        const { data: existing } = await supabase
          .from('vet_document_extractions')
          .select('*')
          .eq('session_id', sessionRow.id)
          .eq('document_url', documentUrl)
          .maybeSingle();

        let extraction: VetDocumentExtraction | null =
          existing && existing.parse_status === 'completed' ? (existing as VetDocumentExtraction) : null;

        if (!extraction) {
          const parsed = await parseVetDocument({
            sessionId: sessionRow.id,
            documentUrl,
            documentType,
          });
          if (!parsed.success || !parsed.extraction) {
            return {
              error: 'PARSE_FAILED',
              message: parsed.error ?? 'No se pudo leer el documento.',
              actionPath: '/veterinaria',
            };
          }
          extraction = parsed.extraction;
        }

        const queryResult = queryVetDocument(
          extraction.structured_data,
          extraction.raw_text,
          params.question,
        );

        return {
          session: mapSession(sessionRow),
          question: params.question,
          answer: queryResult.answer,
          sources: queryResult.sources,
          findings_matched: queryResult.findings_matched,
          disclaimer:
            'Información extraída del documento. No sustituye la interpretación de un veterinario profesional.',
        };
      },
    },
    {
      name: 'veterinary_vaccination_schedule',
      description:
        'Muestra el calendario de vacunación recomendado por especie y qué vacunas ya tiene la mascota. Usar cuando pregunte qué vacunas le tocan, calendario de vacunas, vacunas pendientes o esquema de vacunación.',
      keywords: [
        'calendario de vacunas',
        'calendario de vacunación',
        'vacunas pendientes',
        'qué vacunas le tocan',
        'que vacunas le tocan',
        'esquema de vacunación',
        'esquema de vacunas',
        'vacunas recomendadas',
        'plan de vacunación',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota (opcional si solo hay una)' },
        },
        additionalProperties: false,
      },
      execute: async (params: { pet_name?: string }, ctx: AiExecutionContext) => {
        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿De cuál mascota quieres el calendario de vacunas? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        const catalog = await loadVaccineCatalog();
        const petIds = petResult.pets.map((p) => p.id);
        const { data, error } = await supabase
          .from('pet_vaccinations')
          .select(`
            *,
            pets(name, species)
          `)
          .eq('owner_id', ctx.userId!)
          .in('pet_id', petIds)
          .order('administered_at', { ascending: false });

        if (error) throw error;

        const administered = (data ?? []).map((row) => mapPetVaccinationRow(row as PetVaccinationRow));

        const schedules = petResult.pets.map((pet) => ({
          pet_name: pet.name,
          species: pet.species,
          schedule: buildVaccinationSchedule(
            pet.species,
            catalog,
            administered.filter((record) => record.pet_id === pet.id),
          ),
        }));

        return {
          pets: schedules,
          disclaimer:
            'Calendario orientativo según especie. Tu veterinario puede ajustar fechas e intervalos.',
        };
      },
    },
    {
      name: 'veterinary_register_vaccination',
      description:
        'Registra una vacuna aplicada a la mascota con cálculo automático de próxima fecha. Usar cuando el usuario diga que le pusieron una vacuna específica (antirrábica, quintuple, triple felina, etc.).',
      keywords: [
        'registrar vacuna',
        'registra vacuna',
        'le pusieron vacuna',
        'aplicaron vacuna',
        'vacuna antirrábica',
        'vacuna antirrabica',
        'quintuple',
        'triple felina',
        'desparasitación',
      ],
      parameters: {
        type: 'object',
        properties: {
          pet_name: { type: 'string', description: 'Nombre de la mascota' },
          vaccine_slug: {
            type: 'string',
            description: 'Slug: rabies, dhpp, bordetella, leptospirosis, fvrcp, felv, deworming, other',
          },
          vaccine_name: { type: 'string', description: 'Nombre de la vacuna si no usas slug' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD, hoy o ayer (default hoy)' },
          veterinarian_name: { type: 'string', description: 'Nombre del veterinario' },
          veterinary_clinic: { type: 'string', description: 'Clínica veterinaria' },
          next_due_date: { type: 'string', description: 'Próxima fecha manual YYYY-MM-DD' },
          notes: { type: 'string', description: 'Notas adicionales' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: {
          pet_name?: string;
          vaccine_slug?: string;
          vaccine_name?: string;
          date?: string;
          veterinarian_name?: string;
          veterinary_clinic?: string;
          next_due_date?: string;
          notes?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'Usuario no autenticado' };
        }

        const petResult = await resolvePets(ctx, params.pet_name);
        if ('error' in petResult) {
          if (petResult.error === 'NO_PETS') {
            return {
              error: 'NO_PETS',
              message: 'Primero debes registrar una mascota en PetHub.',
              actionPath: '/pet-creation',
            };
          }
          if (petResult.error === 'PET_REQUIRED') {
            return {
              error: 'PET_REQUIRED',
              message: `¿Para cuál mascota es la vacuna? Tienes: ${petResult.pets?.join(', ')}.`,
              pets: petResult.pets,
            };
          }
          return {
            error: 'PET_NOT_FOUND',
            message: petResult.message ?? 'No encontré esa mascota.',
            pets: petResult.pets,
          };
        }

        if (petResult.pets.length > 1) {
          return {
            error: 'PET_REQUIRED',
            message: `¿Para cuál mascota es la vacuna? Tienes: ${petResult.pets.map((p) => p.name).join(', ')}.`,
            pets: petResult.pets.map((p) => p.name),
          };
        }

        const pet = petResult.pets[0];
        const catalog = await loadVaccineCatalog();
        const vaccineSlug =
          params.vaccine_slug?.trim() ||
          matchVaccineSlugFromText(params.vaccine_name ?? params.notes, pet.species) ||
          'other';
        const vaccine = getVaccineBySlug(vaccineSlug, catalog);
        const vaccineName = params.vaccine_name?.trim() || vaccine?.name || 'Vacunación';
        const date = normalizeVisitDate(params.date);
        const nextDueDate =
          params.next_due_date && /^\d{4}-\d{2}-\d{2}$/.test(params.next_due_date)
            ? params.next_due_date
            : resolveNextDueDate({
                administeredAt: date,
                vaccineSlug,
                catalog,
              });

        const vetName = params.veterinarian_name?.trim() || 'Veterinario';

        const { data: session, error: sessionError } = await supabase
          .from('veterinary_sessions')
          .insert({
            pet_id: pet.id,
            owner_id: ctx.userId,
            appointment_type: 'vacunacion',
            date,
            veterinarian_name: vetName,
            veterinary_clinic: params.veterinary_clinic?.trim() || null,
            diagnosis: vaccineName,
            notes: params.notes?.trim() || null,
            follow_up_date: nextDueDate,
          })
          .select(SESSION_SELECT)
          .single();

        if (sessionError) throw sessionError;

        const vaccination = await upsertPetVaccinationFromSession({
          petId: pet.id,
          ownerId: ctx.userId,
          administeredAt: date,
          vaccineSlug,
          vaccineName,
          nextDueDate,
          veterinarianName: vetName,
          veterinaryClinic: params.veterinary_clinic?.trim() || null,
          sessionId: (session as SessionRow).id,
          notes: params.notes?.trim() || null,
          petSpecies: pet.species,
          catalog,
        });

        return {
          success: true,
          pet_name: pet.name,
          vaccine_name: vaccineName,
          administered_at: date,
          next_due_date: nextDueDate,
          vaccination_id: vaccination?.id,
          session: mapSession(session as SessionRow),
          message: `Vacuna ${vaccineName} registrada para ${pet.name}.`,
        };
      },
    },
    {
      name: 'veterinary_update_session',
      description:
        'Edita una visita veterinaria existente del usuario (diagnóstico, tratamiento, costo, seguimiento, etc.).',
      keywords: [
        'editar visita veterinaria',
        'actualizar visita',
        'modificar visita vet',
        'corregir visita',
        'cambiar diagnóstico',
      ],
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          pet_name: { type: 'string', description: 'Para buscar la visita más reciente de esa mascota' },
          appointment_type: { type: 'string' },
          date: { type: 'string' },
          veterinarian_name: { type: 'string' },
          veterinary_clinic: { type: 'string' },
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          prescription: { type: 'string' },
          notes: { type: 'string' },
          cost: { type: 'number' },
          follow_up_date: { type: 'string' },
        },
        additionalProperties: false,
      },
      execute: async (
        params: {
          session_id?: string;
          pet_name?: string;
          appointment_type?: string;
          date?: string;
          veterinarian_name?: string;
          veterinary_clinic?: string;
          diagnosis?: string;
          treatment?: string;
          prescription?: string;
          notes?: string;
          cost?: number;
          follow_up_date?: string;
        },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) return { error: 'Usuario no autenticado' };

        let sessionId = params.session_id;
        if (!sessionId) {
          let query = supabase
            .from('veterinary_sessions')
            .select('id, pets(name)')
            .eq('owner_id', ctx.userId)
            .order('date', { ascending: false })
            .limit(5);

          if (params.pet_name?.trim()) {
            const petResult = await resolvePets(ctx, params.pet_name);
            if ('error' in petResult) {
              return { error: petResult.error, message: petResult.message, pets: petResult.pets };
            }
            query = query.eq('pet_id', petResult.pets[0].id);
          }

          const { data, error } = await query;
          if (error) throw error;
          if (!data?.length) {
            return { error: 'NOT_FOUND', message: 'No encontré visitas veterinarias para editar.' };
          }
          sessionId = data[0].id;
        }

        const updates: Record<string, unknown> = {};
        if (params.appointment_type) updates.appointment_type = normalizeAppointmentType(params.appointment_type);
        if (params.date) updates.date = params.date;
        if (params.veterinarian_name?.trim()) updates.veterinarian_name = params.veterinarian_name.trim();
        if (params.veterinary_clinic !== undefined) {
          updates.veterinary_clinic = params.veterinary_clinic?.trim() || null;
        }
        if (params.diagnosis?.trim()) updates.diagnosis = params.diagnosis.trim();
        if (params.treatment !== undefined) updates.treatment = params.treatment?.trim() || null;
        if (params.prescription !== undefined) updates.prescription = params.prescription?.trim() || null;
        if (params.notes !== undefined) updates.notes = params.notes?.trim() || null;
        if (params.cost !== undefined) updates.cost = params.cost;
        if (params.follow_up_date !== undefined) updates.follow_up_date = params.follow_up_date || null;

        if (Object.keys(updates).length === 0) {
          return { error: 'FIELDS_REQUIRED', message: 'Indica qué campo de la visita quieres actualizar.' };
        }

        const { data, error } = await supabase
          .from('veterinary_sessions')
          .update(updates)
          .eq('id', sessionId)
          .eq('owner_id', ctx.userId)
          .select(SESSION_SELECT)
          .single();

        if (error) throw error;

        return {
          success: true,
          session: mapSession(data as SessionRow),
          message: 'Visita veterinaria actualizada.',
        };
      },
    },
  ],
};
