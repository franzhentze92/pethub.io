/** Valores canónicos en español para la columna species en BD */
export const SPECIES_ES = {
  PERRO: 'Perro',
  GATO: 'Gato',
  AVE: 'Ave',
  PEZ: 'Pez',
  CONEJO: 'Conejo',
  OTRO: 'Otro',
} as const;

export type SpeciesEs = (typeof SPECIES_ES)[keyof typeof SPECIES_ES];

const SPECIES_INPUT_TO_ES: Record<string, string> = {
  dog: SPECIES_ES.PERRO,
  Dog: SPECIES_ES.PERRO,
  perro: SPECIES_ES.PERRO,
  perros: SPECIES_ES.PERRO,
  cat: SPECIES_ES.GATO,
  Cat: SPECIES_ES.GATO,
  gato: SPECIES_ES.GATO,
  gatos: SPECIES_ES.GATO,
  bird: SPECIES_ES.AVE,
  Bird: SPECIES_ES.AVE,
  ave: SPECIES_ES.AVE,
  fish: SPECIES_ES.PEZ,
  Fish: SPECIES_ES.PEZ,
  pez: SPECIES_ES.PEZ,
  rabbit: SPECIES_ES.CONEJO,
  Rabbit: SPECIES_ES.CONEJO,
  conejo: SPECIES_ES.CONEJO,
  other: SPECIES_ES.OTRO,
  Other: SPECIES_ES.OTRO,
  otro: SPECIES_ES.OTRO,
};

export const SPECIES_FORM_OPTIONS: { value: SpeciesEs; label: string }[] = [
  { value: SPECIES_ES.PERRO, label: 'Perro' },
  { value: SPECIES_ES.GATO, label: 'Gato' },
  { value: SPECIES_ES.AVE, label: 'Ave' },
  { value: SPECIES_ES.PEZ, label: 'Pez' },
  { value: SPECIES_ES.OTRO, label: 'Otro' },
];

export const ADOPTION_SPECIES_FORM_OPTIONS: { value: SpeciesEs; label: string }[] = [
  { value: SPECIES_ES.PERRO, label: 'Perro' },
  { value: SPECIES_ES.GATO, label: 'Gato' },
];

export const GENDER_FORM_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
] as const;

export type PetGender = (typeof GENDER_FORM_OPTIONS)[number]['value'];

/** Normaliza cualquier entrada (inglés/español) al valor canónico en español para BD */
export function normalizeSpeciesToSpanish(
  species?: string | null,
  fallback: SpeciesEs = SPECIES_ES.PERRO,
): string {
  if (!species?.trim()) return fallback;
  const trimmed = species.trim();
  return SPECIES_INPUT_TO_ES[trimmed] ?? SPECIES_INPUT_TO_ES[trimmed.toLowerCase()] ?? trimmed;
}

export function formatSpeciesLabel(species?: string | null): string {
  if (!species) return '—';
  return normalizeSpeciesToSpanish(species, SPECIES_ES.OTRO);
}

/** Resuelve filtros de UI (perro, Dog, etc.) al valor almacenado en BD */
export function resolveSpeciesFilter(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  return normalizeSpeciesToSpanish(value);
}

export function formatPetOptionLabel(
  pet: { name: string; species?: string | null; breed?: string | null },
  mode: 'species' | 'breed' = 'species',
): string {
  const detail =
    mode === 'breed' ? pet.breed || formatSpeciesLabel(pet.species) : formatSpeciesLabel(pet.species);
  return `${pet.name} (${detail})`;
}

export function isDogSpecies(species?: string | null): boolean {
  const normalized = normalizeSpeciesToSpanish(species, SPECIES_ES.OTRO);
  return normalized === SPECIES_ES.PERRO;
}

export function isCatSpecies(species?: string | null): boolean {
  const normalized = normalizeSpeciesToSpanish(species, SPECIES_ES.OTRO);
  return normalized === SPECIES_ES.GATO;
}

export function getPetSpeciesEmoji(species?: string | null): string {
  if (isDogSpecies(species)) return '🐕';
  if (isCatSpecies(species)) return '🐱';
  const s = (species ?? '').toLowerCase();
  if (s.includes('bird') || s.includes('ave')) return '🐦';
  if (s.includes('fish') || s.includes('pez')) return '🐠';
  return '🐾';
}

export function formatGenderLabel(gender?: string | null): string {
  if (!gender?.trim()) return 'Sin dato';
  const g = gender.toLowerCase().trim();
  if (g === 'macho' || g === 'm' || g === 'male') return 'Macho';
  if (g === 'hembra' || g === 'h' || g === 'f' || g === 'female') return 'Hembra';
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

export function isMaleGender(gender?: string | null): boolean {
  const g = (gender ?? '').toLowerCase().trim();
  return g === 'macho' || g === 'm' || g === 'male';
}

export function formatPetAge(age?: number | null): string {
  if (age == null) return '—';
  return `${age} ${age === 1 ? 'año' : 'años'}`;
}

export function formatPetWeight(weight?: number | null): string {
  if (weight == null || Number.isNaN(weight)) return '—';
  return `${weight} kg`;
}
