import { supabase } from '@/lib/supabase';
import {
  computeVaccinationStatus,
  getVaccineBySlug,
  matchVaccineSlugFromText,
  normalizePetSpecies,
  resolveNextDueDate,
  resolveVaccineName,
  type VaccinationStatus,
  type VaccineCatalogEntry,
  VACCINE_CATALOG_FALLBACK,
} from '@/lib/vaccinationCatalog';

export interface PetVaccinationRow {
  id: string;
  pet_id: string;
  owner_id: string;
  vaccine_slug: string | null;
  vaccine_name: string;
  administered_at: string;
  next_due_date: string | null;
  batch_number?: string | null;
  veterinarian_name?: string | null;
  veterinary_clinic?: string | null;
  session_id?: string | null;
  notes?: string | null;
  reminder_completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  pets?: { name?: string; species?: string } | null;
}

export interface PetVaccinationDisplay {
  id: string;
  pet_id: string;
  pet_name: string;
  vaccine_slug: string | null;
  vaccine_name: string;
  administered_at: string;
  next_due_date: string | null;
  status: VaccinationStatus;
  veterinarian_name?: string | null;
  veterinary_clinic?: string | null;
  session_id?: string | null;
}

export async function loadVaccineCatalog(): Promise<VaccineCatalogEntry[]> {
  const { data, error } = await supabase
    .from('vaccine_catalog')
    .select('slug, name, species, interval_months, description, is_core, sort_order')
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return VACCINE_CATALOG_FALLBACK;
  }

  return data as VaccineCatalogEntry[];
}

export function mapPetVaccinationRow(
  row: PetVaccinationRow,
  petName = row.pets?.name ?? 'Mascota',
): PetVaccinationDisplay {
  return {
    id: row.id,
    pet_id: row.pet_id,
    pet_name: petName,
    vaccine_slug: row.vaccine_slug,
    vaccine_name: row.vaccine_name,
    administered_at: row.administered_at,
    next_due_date: row.next_due_date,
    status: computeVaccinationStatus(row.next_due_date),
    veterinarian_name: row.veterinarian_name,
    veterinary_clinic: row.veterinary_clinic,
    session_id: row.session_id,
  };
}

export interface UpsertPetVaccinationInput {
  petId: string;
  ownerId: string;
  administeredAt: string;
  vaccineSlug?: string | null;
  vaccineName?: string | null;
  nextDueDate?: string | null;
  veterinarianName?: string | null;
  veterinaryClinic?: string | null;
  sessionId?: string | null;
  notes?: string | null;
  batchNumber?: string | null;
  petSpecies?: string | null;
  catalog?: VaccineCatalogEntry[];
}

export async function upsertPetVaccinationFromSession(
  input: UpsertPetVaccinationInput,
): Promise<PetVaccinationRow | null> {
  const catalog = input.catalog ?? (await loadVaccineCatalog());
  const vaccineSlug =
    input.vaccineSlug?.trim() ||
    matchVaccineSlugFromText(input.vaccineName, input.petSpecies) ||
    null;
  const vaccineName = resolveVaccineName(vaccineSlug, input.vaccineName, catalog);
  const nextDueDate = resolveNextDueDate({
    administeredAt: input.administeredAt,
    vaccineSlug,
    explicitNextDue: input.nextDueDate,
    catalog,
  });

  const payload = {
    pet_id: input.petId,
    owner_id: input.ownerId,
    vaccine_slug: vaccineSlug,
    vaccine_name: vaccineName,
    administered_at: input.administeredAt,
    next_due_date: nextDueDate,
    batch_number: input.batchNumber?.trim() || null,
    veterinarian_name: input.veterinarianName?.trim() || null,
    veterinary_clinic: input.veterinaryClinic?.trim() || null,
    session_id: input.sessionId ?? null,
    notes: input.notes?.trim() || null,
    reminder_completed_at: null,
    updated_at: new Date().toISOString(),
  };

  if (input.sessionId) {
    const { data: existing } = await supabase
      .from('pet_vaccinations')
      .select('id')
      .eq('session_id', input.sessionId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('pet_vaccinations')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as PetVaccinationRow;
    }
  }

  const { data, error } = await supabase
    .from('pet_vaccinations')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as PetVaccinationRow;
}

export function getLatestVaccinationPerSlug(
  vaccinations: PetVaccinationDisplay[],
): PetVaccinationDisplay[] {
  const byKey = new Map<string, PetVaccinationDisplay>();

  for (const record of vaccinations) {
    const key = record.vaccine_slug ?? record.vaccine_name.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || record.administered_at > existing.administered_at) {
      byKey.set(key, record);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.administered_at.localeCompare(a.administered_at));
}

export function buildVaccinationSchedule(
  species: string | null | undefined,
  catalog: VaccineCatalogEntry[],
  administered: PetVaccinationDisplay[],
) {
  const latestBySlug = new Map<string, PetVaccinationDisplay>();
  for (const record of administered) {
    const slug = record.vaccine_slug ?? 'other';
    const existing = latestBySlug.get(slug);
    if (!existing || record.administered_at > existing.administered_at) {
      latestBySlug.set(slug, record);
    }
  }

  const speciesGroup = normalizePetSpecies(species);
  const relevant = catalog.filter(
    (entry) => entry.slug !== 'other' && entry.species.includes(speciesGroup),
  );

  return relevant.map((entry) => {
    const latest = latestBySlug.get(entry.slug);
    return {
      vaccine_slug: entry.slug,
      vaccine_name: entry.name,
      is_core: entry.is_core,
      interval_months: entry.interval_months,
      description: entry.description ?? null,
      last_administered_at: latest?.administered_at ?? null,
      next_due_date: latest?.next_due_date ?? null,
      status: latest ? latest.status : ('unknown' as VaccinationStatus),
      administered: Boolean(latest),
    };
  });
}
