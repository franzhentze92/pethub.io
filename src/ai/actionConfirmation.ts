import type { PetBuddyMessage, PetBuddyPendingAction } from './types';
import type { AiExecutionContext } from './types';
import { formatPetNamesForPreview } from './helpers/petResolver';
import { formatExerciseIntensityLabel, formatExerciseTypeLabel } from '@/utils/exerciseDisplay';
import { getAppointmentTypeLabel } from '@/lib/veterinaryTypes';

export type PendingActionIntent = 'confirm' | 'cancel' | 'edit';

const CONFIRM_PATTERNS =
  /^(s[ií]|ok|vale|perfecto|de acuerdo|adelante|procede|hazlo|listo|correcto|est[aá]\s*bien|aprobado|dale|vamos|yes|confirm|confirmo|confirmar|confirmado|confirma|s[ií]\s*confirmo)$/i;
const CANCEL_PATTERNS =
  /^(no|cancelar|cancela|cancelado|anula|anular|descarta|olv[idí]dalo|no\s+quiero|mejor\s+no|detente|para)$/i;
const EDIT_PATTERNS = /^(editar|edita|modificar|modifica|cambiar|cambia|corregir|corrige|ajustar|ajusta)$/i;

/** Detect if the user wants to confirm, cancel, or edit a pending action preview. */
export function detectPendingActionIntent(text: string): PendingActionIntent | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (EDIT_PATTERNS.test(trimmed) || /\b(editar|modificar|cambiar|corregir)\b/i.test(trimmed)) {
    return 'edit';
  }
  if (
    CANCEL_PATTERNS.test(trimmed) ||
    /\b(cancelar|cancela|anular|no\s+quiero)\b/i.test(trimmed)
  ) {
    return 'cancel';
  }
  if (
    CONFIRM_PATTERNS.test(trimmed) ||
    /\b(confirmo|confirmar|confirmado|confirma)\b/i.test(trimmed)
  ) {
    return 'confirm';
  }
  return null;
}

export function findLatestPendingActionMessage(
  messages: PetBuddyMessage[],
): PetBuddyMessage | undefined {
  return [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.pendingAction?.status === 'pending');
}

export function buildConfirmationMessage(
  title: string,
  voiceMode?: boolean,
): string {
  if (voiceMode) {
    return `Revisa los detalles de **${title}**. Di **confirmar**, **cancelar** o **editar** para continuar:`;
  }
  return `Revisa los detalles de **${title}** y confirma para continuar:`;
}

const CONFIRMATION_TOOLS = new Set([
  'exercise_register_session',
  'nutrition_register_meal',
  'nutrition_create_schedule',
  'veterinary_register_visit',
  'veterinary_register_vaccination',
  'veterinary_set_follow_up',
  'veterinary_update_session',
  'reminders_create',
  'reminders_update',
  'pets_create',
  'pets_update',
  'adoption_apply',
  'lost_pets_report',
  'lost_pets_mark_found',
  'breeding_enable_pet',
  'breeding_send_request',
  'profile_update',
  'marketplace_add_favorite',
  'cart_add_item',
  'bookings_add_to_cart',
  'catalog_create_product',
  'catalog_create_service',
  'catalog_import_from_url',
]);

const TOOL_TITLES: Record<string, string> = {
  exercise_register_session: 'Registrar ejercicio',
  nutrition_register_meal: 'Registrar comida',
  nutrition_create_schedule: 'Crear horario de alimentación',
  veterinary_register_visit: 'Registrar visita veterinaria',
  veterinary_register_vaccination: 'Registrar vacuna',
  veterinary_set_follow_up: 'Programar seguimiento veterinario',
  veterinary_update_session: 'Actualizar visita veterinaria',
  reminders_create: 'Crear recordatorio',
  reminders_update: 'Actualizar recordatorio',
  pets_create: 'Registrar mascota',
  pets_update: 'Actualizar mascota',
  adoption_apply: 'Solicitar adopción',
  lost_pets_report: 'Reportar mascota perdida',
  lost_pets_mark_found: 'Marcar como encontrada',
  breeding_enable_pet: 'Activar mascota para parejas',
  breeding_send_request: 'Enviar solicitud de pareja',
  profile_update: 'Actualizar perfil',
  marketplace_add_favorite: 'Guardar en favoritos',
  cart_add_item: 'Agregar al carrito',
  bookings_add_to_cart: 'Reservar servicio',
  catalog_create_product: 'Crear producto',
  catalog_create_service: 'Crear servicio',
  catalog_import_from_url: 'Importar producto',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function field(label: string, value: unknown) {
  const formatted = formatValue(value);
  if (formatted === '—') return null;
  return { label, value: formatted };
}

function isSpecificExerciseType(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  const key = String(raw).trim().toLowerCase();
  if (!key) return false;
  const generic = new Set(['other', 'otro', 'ejercicio', 'exercise', 'actividad', 'actividad física']);
  return !generic.has(key);
}

function hasValidDurationMinutes(raw: unknown): boolean {
  if (raw === null || raw === undefined || raw === '') return false;
  const duration = Math.round(Number(raw));
  return Number.isFinite(duration) && duration > 0;
}

export function needsConfirmation(toolName: string, params: Record<string, unknown>, ctx?: Pick<AiExecutionContext, 'userPetNames'>): boolean {
  if (!CONFIRMATION_TOOLS.has(toolName)) return false;
  if (getRegisterIncompletePrompt(toolName, params, ctx)) return false;
  if (toolName === 'catalog_import_from_url') {
    return params.auto_create !== false;
  }
  return true;
}

function formatPetScope(
  params: Record<string, unknown>,
  ctx?: Pick<AiExecutionContext, 'userPetNames'>,
): string {
  if (params.pet_name === 'todos' && ctx?.userPetNames?.length) {
    return ` para **${ctx.userPetNames.join(', ')}**`;
  }
  const label = formatPetNamesForPreview(params.pet_name);
  return label ? ` para **${label}**` : '';
}

/** If required register fields are missing, return a conversational prompt instead of confirming. */
export function getRegisterIncompletePrompt(
  toolName: string,
  params: Record<string, unknown>,
  ctx?: Pick<AiExecutionContext, 'userPetNames'>,
): string | null {
  switch (toolName) {
    case 'exercise_register_session': {
      const hasDuration = hasValidDurationMinutes(params.duration_minutes);
      const hasType = isSpecificExerciseType(params.exercise_type);
      const petScope = formatPetScope(params, ctx);

      if (!hasType && !hasDuration) {
        return (
          `¡Perfecto! Para registrar el ejercicio${petScope}, necesito dos datos:\n\n` +
          `1. **¿Qué actividad fue?** (caminata, juego, carrera, natación, entrenamiento…)\n` +
          `2. **¿Cuántos minutos duró?**`
        );
      }
      if (!hasType) {
        return `¿Qué tipo de actividad fue${petScope}? (caminata, juego, carrera, natación, entrenamiento…)`;
      }
      if (!hasDuration) {
        return `¿Cuántos **minutos** duró la actividad${petScope}?`;
      }
      return null;
    }

    case 'nutrition_register_meal': {
      const quantity = Number(params.quantity_grams);
      const hasGrams = Number.isFinite(quantity) && quantity > 0;
      const hasFood = Boolean(params.food_name) && String(params.food_name).trim() !== '';
      const petScope = formatPetScope(params, ctx);

      if (!hasFood && !hasGrams) {
        return (
          `Para registrar la comida${petScope}, dime:\n\n` +
          `1. **¿Qué alimento?**\n` +
          `2. **¿Cuántos gramos?**`
        );
      }
      if (!hasFood) {
        return `¿Qué alimento le diste${petScope}?`;
      }
      if (!hasGrams) {
        return `¿Cuántos **gramos** de ${params.food_name}${petScope}?`;
      }
      return null;
    }

    case 'nutrition_create_schedule': {
      const times = Array.isArray(params.times) ? params.times : [];
      const hasTimes = times.length > 0;
      const quantity = Number(params.quantity_grams ?? 0);
      const hasGrams = Number.isFinite(quantity) && quantity > 0;
      const hasFood = Boolean(params.food_name) && String(params.food_name).trim() !== '';
      const petScope = formatPetScope(params, ctx);

      if (!hasTimes) {
        return `¿A qué **horas** quieres programar las comidas${petScope}? (ej. 7:00 am y 7:00 pm)`;
      }
      if (!hasFood && !hasGrams) {
        return `¿Qué **alimento** y cuántos **gramos** por comida${petScope}?`;
      }
      if (!hasFood) {
        return `¿Qué alimento quieres usar en el horario${petScope}?`;
      }
      if (!hasGrams) {
        return `¿Cuántos **gramos** de ${params.food_name} por comida${petScope}?`;
      }
      return null;
    }

    case 'veterinary_register_visit': {
      const petScope = formatPetScope(params, ctx);
      const hasVet = Boolean(params.veterinarian_name) && String(params.veterinarian_name).trim() !== '';
      const hasDiagnosis = Boolean(params.diagnosis) && String(params.diagnosis).trim() !== '';
      const needsPet = (ctx?.userPetNames?.length ?? 0) > 1 && !params.pet_name;

      if (needsPet && !hasVet && !hasDiagnosis) {
        return (
          `Para registrar la visita veterinaria${petScope}, dime:\n\n` +
          `1. **¿Para qué mascota?** (una a la vez)\n` +
          `2. **¿Quién fue el veterinario?**\n` +
          `3. **¿Cuál fue el diagnóstico o motivo?**`
        );
      }
      if (needsPet) {
        return `¿Para qué **mascota** fue la visita? (las visitas se registran una a la vez)`;
      }
      if (!hasVet && !hasDiagnosis) {
        return (
          `Para registrar la visita${petScope}, dime:\n\n` +
          `1. **¿Quién fue el veterinario?**\n` +
          `2. **¿Cuál fue el diagnóstico o motivo de la visita?**`
        );
      }
      if (!hasVet) {
        return `¿Quién fue el **veterinario**${petScope}?`;
      }
      if (!hasDiagnosis) {
        return `¿Cuál fue el **diagnóstico** o motivo de la visita${petScope}?`;
      }
      return null;
    }

    default:
      return null;
  }
}

export function buildActionPreview(
  toolName: string,
  params: Record<string, unknown>,
): Omit<PetBuddyPendingAction, 'status'> {
  const fields: Array<{ label: string; value: string }> = [];

  switch (toolName) {
    case 'exercise_register_session':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name) ?? undefined),
        field('Actividad', formatExerciseTypeLabel(params.exercise_type)),
        field('Duración (min)', params.duration_minutes),
        field('Intensidad', formatExerciseIntensityLabel(params.intensity ?? 'medium')),
        field('Fecha', params.date ?? new Date().toISOString().split('T')[0]),
        field('Notas', params.notes),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'nutrition_register_meal':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Alimento', params.food_name),
        field('Cantidad (g)', params.quantity_grams),
        field('Comida', params.meal_type),
        field('Fecha', params.date),
        field('Hora', params.feeding_time),
        field('Notas', params.notes),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'nutrition_create_schedule':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Alimento', params.food_name),
        field('Cantidad (g)', params.quantity_grams),
        field('Horarios', Array.isArray(params.times) ? params.times.join(', ') : params.times),
        field('Días activos', params.active_days),
        field('Notas', params.notes),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'veterinary_register_visit':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Tipo', getAppointmentTypeLabel(String(params.appointment_type ?? 'consulta_general'))),
        field('Fecha', params.date ?? new Date().toISOString().split('T')[0]),
        field('Veterinario', params.veterinarian_name),
        field('Clínica', params.veterinary_clinic),
        field('Vacuna', params.vaccine_slug),
        field('Diagnóstico', params.diagnosis),
        field('Tratamiento', params.treatment),
        field('Receta', params.prescription),
        field('Costo (Q)', params.cost),
        field('Seguimiento', params.follow_up_date),
        field('Notas', params.notes),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'veterinary_register_vaccination':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Vacuna', params.vaccine_name ?? params.vaccine_slug),
        field('Fecha', params.date ?? new Date().toISOString().split('T')[0]),
        field('Veterinario', params.veterinarian_name),
        field('Clínica', params.veterinary_clinic),
        field('Próxima fecha', params.next_due_date),
        field('Notas', params.notes),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'veterinary_set_follow_up':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Visita ID', params.session_id),
        field('Fecha de seguimiento', params.follow_up_date),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'veterinary_update_session':
      [
        field('Visita ID', params.session_id),
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Tipo', params.appointment_type),
        field('Fecha', params.date),
        field('Veterinario', params.veterinarian_name),
        field('Diagnóstico', params.diagnosis),
        field('Tratamiento', params.treatment),
        field('Costo (Q)', params.cost),
        field('Seguimiento', params.follow_up_date),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'reminders_create':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Título', params.title),
        field('Tipo', params.reminder_type),
        field('Fecha', params.scheduled_date),
        field('Hora', params.scheduled_time),
        field('Descripción', params.description),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'reminders_update':
      [
        field('Recordatorio', params.title_query ?? params.reminder_id),
        field('Nuevo título', params.new_title),
        field('Fecha', params.scheduled_date),
        field('Hora', params.scheduled_time),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'pets_create':
      [
        field('Nombre', params.name),
        field('Especie', params.species),
        field('Raza', params.breed),
        field('Edad', params.age),
        field('Peso (kg)', params.weight),
        field('Disponible para parejas', params.available_for_breeding),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'pets_update':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Nuevo nombre', params.name),
        field('Raza', params.breed),
        field('Edad', params.age),
        field('Peso (kg)', params.weight),
        field('Disponible para parejas', params.available_for_breeding),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'adoption_apply':
      [
        field('Mascota', params.pet_name),
        field('Mensaje', params.message),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'lost_pets_report':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Ubicación', params.last_location),
        field('Última vez visto', params.last_seen),
        field('Teléfono', params.contact_phone),
        field('Descripción', params.description),
        field('Recompensa (Q)', params.reward),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'lost_pets_mark_found':
      [
        field('Mascota', params.pet_name),
        field('Reporte ID', params.report_id),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'breeding_enable_pet':
      [
        field('Mascota', formatPetNamesForPreview(params.pet_name)),
        field('Disponible', params.available !== false ? 'Sí' : 'No'),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'breeding_send_request':
      [
        field('Tu mascota', params.my_pet_name),
        field('Mascota objetivo', params.target_pet_name),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'profile_update':
      [
        field('Nombre', params.full_name),
        field('Teléfono', params.phone),
        field('Dirección', params.address),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'marketplace_add_favorite':
      [
        field('Producto', params.product_name),
        field('Servicio', params.service_name),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'cart_add_item':
      [
        field('Producto', params.product_name),
        field('Cantidad', params.quantity ?? 1),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'bookings_add_to_cart':
      [
        field('Servicio', params.service_name),
        field('Fecha', params.date),
        field('Hora', params.time),
        field('Notas', params.notes),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'catalog_create_product':
      [
        field('Nombre', params.product_name),
        field('Categoría', params.product_category),
        field('Descripción', params.description),
        field('Marca', params.brand),
        field('Precio (Q)', params.price),
        field('Stock', params.stock_quantity),
        field('Alerta stock', params.min_stock_alert),
        field('Peso (kg)', params.weight_kg),
        field('Dimensiones', params.dimensions_cm),
        field('Activo', params.is_active ?? true),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'catalog_create_service':
      [
        field('Nombre', params.service_name),
        field('Categoría', params.service_category),
        field('Descripción', params.description),
        field('Duración (min)', params.duration_minutes),
        field('Precio (Q)', params.price),
        field('Activo', params.is_active ?? true),
      ].forEach((f) => f && fields.push(f));
      break;

    case 'catalog_import_from_url':
      [
        field('URL', params.url),
        field('Stock inicial', params.stock_quantity),
        field('Crear en catálogo', params.auto_create !== false ? 'Sí' : 'No'),
      ].forEach((f) => f && fields.push(f));
      break;

    default:
      Object.entries(params).forEach(([key, value]) => {
        const f = field(key, value);
        if (f) fields.push(f);
      });
  }

  return {
    id: crypto.randomUUID(),
    toolName,
    params,
    title: TOOL_TITLES[toolName] ?? 'Confirmar acción',
    fields,
  };
}

export function buildEditPrompt(preview: Pick<PetBuddyPendingAction, 'title' | 'fields'>): string {
  const summary = preview.fields.map((f) => `${f.label}: ${f.value}`).join(', ');
  return `Quiero editar ${preview.title.toLowerCase()}: ${summary}. Cambiar: `;
}
