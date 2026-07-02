import { addDays, addMonths, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';

export type PetSpeciesGroup = 'dog' | 'cat' | 'bird' | 'other';

export type VaccinationStatus = 'current' | 'due_soon' | 'overdue' | 'unknown';

export interface VaccineCatalogEntry {
  slug: string;
  name: string;
  species: string[];
  interval_months: number;
  description?: string | null;
  is_core: boolean;
  sort_order: number;
}

/** Fallback catalog when DB is unavailable (matches seed migration). */
export const VACCINE_CATALOG_FALLBACK: VaccineCatalogEntry[] = [
  { slug: 'rabies', name: 'Antirrábica', species: ['dog', 'cat'], interval_months: 12, is_core: true, sort_order: 10 },
  { slug: 'dhpp', name: 'Quintuple (DHPP)', species: ['dog'], interval_months: 12, is_core: true, sort_order: 20 },
  { slug: 'bordetella', name: 'Bordetella', species: ['dog'], interval_months: 12, is_core: false, sort_order: 30 },
  { slug: 'leptospirosis', name: 'Leptospirosis', species: ['dog'], interval_months: 12, is_core: false, sort_order: 40 },
  { slug: 'fvrcp', name: 'Triple Felina (FVRCP)', species: ['cat'], interval_months: 12, is_core: true, sort_order: 20 },
  { slug: 'felv', name: 'Leucemia Felina (FeLV)', species: ['cat'], interval_months: 12, is_core: false, sort_order: 30 },
  { slug: 'deworming', name: 'Desparasitación', species: ['dog', 'cat'], interval_months: 3, is_core: false, sort_order: 50 },
  { slug: 'other', name: 'Otra vacuna', species: ['dog', 'cat', 'bird', 'other'], interval_months: 12, is_core: false, sort_order: 99 },
];

const VACCINE_KEYWORDS: Record<string, RegExp> = {
  rabies: /\b(antirr[aá]bica|antirrabica|rabia|rabies)\b/i,
  dhpp: /\b(dhpp|quintuple|pentavalente|polivalente|distemper|moquillo)\b/i,
  bordetella: /\bbordetella\b/i,
  leptospirosis: /\bleptospir/i,
  fvrcp: /\b(fvrcp|triple felina|triple)\b/i,
  felv: /\b(felv|leucemia felina|leucemia)\b/i,
  deworming: /\b(desparasit|antiparasit)\b/i,
};

export function normalizePetSpecies(species?: string | null): PetSpeciesGroup {
  const lower = (species ?? '').trim().toLowerCase();
  if (['dog', 'perro', 'canino', 'canine'].some((s) => lower.includes(s))) return 'dog';
  if (['cat', 'gato', 'felino', 'feline'].some((s) => lower.includes(s))) return 'cat';
  if (['bird', 'ave', 'pájaro', 'pajaro'].some((s) => lower.includes(s))) return 'bird';
  return 'other';
}

export function getVaccinesForSpecies(
  species: string | null | undefined,
  catalog: VaccineCatalogEntry[] = VACCINE_CATALOG_FALLBACK,
): VaccineCatalogEntry[] {
  const group = normalizePetSpecies(species);
  return catalog
    .filter((entry) => entry.slug !== 'other' && entry.species.includes(group))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getVaccineBySlug(
  slug: string | null | undefined,
  catalog: VaccineCatalogEntry[] = VACCINE_CATALOG_FALLBACK,
): VaccineCatalogEntry | undefined {
  if (!slug?.trim()) return undefined;
  return catalog.find((entry) => entry.slug === slug.trim());
}

export function matchVaccineSlugFromText(
  text?: string | null,
  species?: string | null,
): string | null {
  const haystack = (text ?? '').trim();
  if (!haystack) return null;

  for (const [slug, pattern] of Object.entries(VACCINE_KEYWORDS)) {
    if (pattern.test(haystack)) return slug;
  }

  const group = normalizePetSpecies(species);
  if (group === 'dog') return 'dhpp';
  if (group === 'cat') return 'fvrcp';
  return null;
}

export function resolveVaccineName(
  vaccineSlug: string | null | undefined,
  customName: string | null | undefined,
  catalog: VaccineCatalogEntry[] = VACCINE_CATALOG_FALLBACK,
): string {
  const trimmed = customName?.trim();
  if (trimmed) return trimmed;
  return getVaccineBySlug(vaccineSlug, catalog)?.name ?? 'Vacunación';
}

export function computeNextDueDate(administeredAt: string, intervalMonths: number): string {
  const base = parseISO(administeredAt);
  return addMonths(base, intervalMonths).toISOString().split('T')[0];
}

export function computeVaccinationStatus(
  nextDueDate?: string | null,
  dueSoonDays = 30,
): VaccinationStatus {
  if (!nextDueDate?.trim()) return 'unknown';
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(nextDueDate));
  if (isBefore(due, today)) return 'overdue';
  if (isBefore(due, addDays(today, dueSoonDays))) return 'due_soon';
  return 'current';
}

export function getVaccinationStatusLabel(status: VaccinationStatus): string {
  const labels: Record<VaccinationStatus, string> = {
    current: 'Al día',
    due_soon: 'Próxima pronto',
    overdue: 'Vencida',
    unknown: 'Sin fecha programada',
  };
  return labels[status];
}

export function resolveNextDueDate(params: {
  administeredAt: string;
  vaccineSlug?: string | null;
  explicitNextDue?: string | null;
  catalog?: VaccineCatalogEntry[];
}): string | null {
  if (params.explicitNextDue?.trim()) return params.explicitNextDue.trim();
  const vaccine = getVaccineBySlug(params.vaccineSlug, params.catalog);
  if (!vaccine) return computeNextDueDate(params.administeredAt, 12);
  return computeNextDueDate(params.administeredAt, vaccine.interval_months);
}
