/** Canonical appointment_type slugs for veterinary_sessions (Spanish). */
export const VETERINARY_APPOINTMENT_TYPES = [
  { value: 'consulta_general', label: 'Consulta General' },
  { value: 'vacunacion', label: 'Vacunación' },
  { value: 'revision_medica', label: 'Revisión Médica' },
  { value: 'emergencia', label: 'Emergencia' },
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'cuidado_dental', label: 'Cuidado Dental' },
  { value: 'aseo', label: 'Aseo' },
  { value: 'otro', label: 'Otro' },
] as const;

export type VeterinaryAppointmentType =
  (typeof VETERINARY_APPOINTMENT_TYPES)[number]['value'];

const LEGACY_TYPE_MAP: Record<string, VeterinaryAppointmentType> = {
  checkup: 'consulta_general',
  consultation: 'consulta_general',
  consulta: 'consulta_general',
  general: 'consulta_general',
  vaccination: 'vacunacion',
  vaccine: 'vacunacion',
  vacuna: 'vacunacion',
  treatment: 'otro',
  tratamiento: 'otro',
  emergency: 'emergencia',
  surgery: 'cirugia',
  grooming: 'aseo',
  dental: 'cuidado_dental',
  'follow-up': 'revision_medica',
  followup: 'revision_medica',
  revision: 'revision_medica',
  other: 'otro',
};

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  VETERINARY_APPOINTMENT_TYPES.map((t) => [t.value, t.label]),
);

/** Normalize legacy or mixed appointment_type values to canonical slugs. */
export function normalizeAppointmentType(type: string | null | undefined): string {
  if (!type?.trim()) return 'consulta_general';
  const lower = type.trim().toLowerCase();
  if (TYPE_LABELS[lower]) return lower;
  return LEGACY_TYPE_MAP[lower] ?? lower;
}

/** Human-readable label for any appointment_type (canonical or legacy). */
export function getAppointmentTypeLabel(type: string | null | undefined): string {
  if (!type?.trim()) return 'Consulta General';
  const normalized = normalizeAppointmentType(type);
  return TYPE_LABELS[normalized] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

/** Whether the appointment type represents a vaccination visit. */
export function isVaccinationType(type: string | null | undefined): boolean {
  const normalized = normalizeAppointmentType(type);
  return normalized === 'vacunacion' || normalized.includes('vacun');
}

/** Infer appointment type from natural language (Spanish/English). */
export function inferAppointmentTypeFromText(text?: string): VeterinaryAppointmentType {
  const lower = (text ?? '').toLowerCase();
  if (/\b(vacuna|vacunaci[oó]n|antirr[aá]bica|pentavalente)\b/.test(lower)) return 'vacunacion';
  if (/\b(emergencia|urgencia)\b/.test(lower)) return 'emergencia';
  if (/\b(cirug[ií]a|operaci[oó]n)\b/.test(lower)) return 'cirugia';
  if (/\b(revisi[oó]n|checkup|control)\b/.test(lower)) return 'revision_medica';
  if (/\b(dental|dientes)\b/.test(lower)) return 'cuidado_dental';
  if (/\b(aseo|grooming|baño)\b/.test(lower)) return 'aseo';
  if (/\b(tratamiento|medicina)\b/.test(lower)) return 'otro';
  if (text?.trim()) return normalizeAppointmentType(text) as VeterinaryAppointmentType;
  return 'consulta_general';
}

/** Map Health Journal quick-form values to canonical slugs. */
export function healthJournalVisitTypeToAppointmentType(
  visitType: string,
): VeterinaryAppointmentType {
  const map: Record<string, VeterinaryAppointmentType> = {
    checkup: 'consulta_general',
    vaccination: 'vacunacion',
    treatment: 'otro',
    emergency: 'emergencia',
    surgery: 'cirugia',
  };
  return map[visitType] ?? 'consulta_general';
}

/** Map canonical slug back to Health Journal display key. */
export function appointmentTypeToHealthJournalVisitType(
  type: string,
): HealthRecordVisitType {
  const normalized = normalizeAppointmentType(type);
  const map: Record<string, HealthRecordVisitType> = {
    consulta_general: 'checkup',
    vacunacion: 'vaccination',
    revision_medica: 'checkup',
    emergencia: 'emergency',
    cirugia: 'surgery',
    cuidado_dental: 'treatment',
    aseo: 'treatment',
    otro: 'treatment',
  };
  return map[normalized] ?? 'checkup';
}

export type HealthRecordVisitType =
  | 'checkup'
  | 'vaccination'
  | 'treatment'
  | 'emergency'
  | 'surgery';

export const HEALTH_JOURNAL_VISIT_TYPES: { value: HealthRecordVisitType; label: string }[] = [
  { value: 'checkup', label: 'Revisión general' },
  { value: 'vaccination', label: 'Vacunación' },
  { value: 'treatment', label: 'Tratamiento' },
  { value: 'emergency', label: 'Emergencia' },
  { value: 'surgery', label: 'Cirugía' },
];
