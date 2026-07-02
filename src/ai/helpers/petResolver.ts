import { supabase } from '@/lib/supabase';
import type { AiExecutionContext } from '../types';
import { fuzzyMatchPetName } from './petNameFuzzy';

export type UserPet = {
  id: string;
  name: string;
  species: string;
  weight: number | null;
};

export const ALL_PETS_PATTERN =
  /\b(todos|todas|para todos|para todas|a todos|a todas|los tres|las tres|los 3|las 3|mis mascotas|mis tres mascotas|mis 3 mascotas|mis perros|mis tres perros|mis gatos|mis tres gatos|todas mis mascotas|todos mis perros|mis tres|mis \d+|cada una|cada uno|cada mascota|todas las mascotas|todos los perros|todos los gatos|las tres mascotas|los tres perros)\b/i;

export function wantsAllPets(text?: string): boolean {
  if (!text?.trim()) return false;
  if (ALL_PETS_PATTERN.test(text)) return true;
  return /\b(mis perros|mis gatos|mis mascotas)\b/i.test(text);
}

export async function enrichContextWithPets(ctx: AiExecutionContext): Promise<AiExecutionContext> {
  if (!ctx.userId || ctx.userPetNames?.length) return ctx;
  try {
    const pets = await loadUserPets(ctx);
    return {
      ...ctx,
      userPetNames: pets.map((p) => p.name),
      userPetCount: pets.length,
    };
  } catch {
    return ctx;
  }
}

export function formatUserPetsForPrompt(ctx: AiExecutionContext): string {
  if (!ctx.userPetNames?.length) {
    return 'El usuario no tiene mascotas registradas en PetHub.';
  }
  const count = ctx.userPetCount ?? ctx.userPetNames.length;
  return `El usuario tiene ${count} mascota(s) registrada(s): ${ctx.userPetNames.join(', ')}.`;
}

export async function loadUserPets(ctx: AiExecutionContext): Promise<UserPet[]> {
  if (!ctx.userId) return [];

  const { data, error } = await supabase
    .from('pets')
    .select('id, name, species, weight')
    .eq('owner_id', ctx.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species ?? '',
    weight: p.weight ?? null,
  }));
}

export function matchPetByName(pets: UserPet[], rawName: string): UserPet | undefined {
  const needle = rawName.trim().toLowerCase();
  const exact =
    pets.find((p) => p.name.toLowerCase() === needle) ??
    pets.find((p) => p.name.toLowerCase().includes(needle)) ??
    pets.find((p) => needle.includes(p.name.toLowerCase()));
  if (exact) return exact;

  const fuzzy = fuzzyMatchPetName(rawName, pets.map((p) => p.name));
  if (fuzzy) {
    return pets.find((p) => p.name.toLowerCase() === fuzzy.toLowerCase());
  }

  return undefined;
}

export async function resolvePets(
  ctx: AiExecutionContext,
  petName?: string,
): Promise<{ pets: UserPet[] } | { error: string; pets?: string[]; message?: string }> {
  const pets = await loadUserPets(ctx);

  if (pets.length === 0) {
    return { error: 'NO_PETS', pets: [] };
  }

  if (!petName?.trim()) {
    if (pets.length === 1) return { pets: [pets[0]] };
    return { error: 'PET_REQUIRED', pets: pets.map((p) => p.name) };
  }

  if (wantsAllPets(petName)) {
    return { pets };
  }

  const parts = petName
    .split(/,| y /i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    const resolved: UserPet[] = [];
    const missing: string[] = [];
    for (const part of parts) {
      const match = matchPetByName(pets, part);
      if (match) resolved.push(match);
      else missing.push(part);
    }
    if (resolved.length === 0) {
      return {
        error: 'PET_NOT_FOUND',
        pets: pets.map((p) => p.name),
        message: `No encontré esas mascotas. Las tuyas son: ${pets.map((p) => p.name).join(', ')}`,
      };
    }
    if (missing.length > 0) {
      return {
        error: 'PET_NOT_FOUND',
        pets: pets.map((p) => p.name),
        message: `No encontré: ${missing.join(', ')}. Las tuyas son: ${pets.map((p) => p.name).join(', ')}`,
      };
    }
    return { pets: resolved };
  }

  const match = matchPetByName(pets, petName);
  if (!match) {
    return {
      error: 'PET_NOT_FOUND',
      pets: pets.map((p) => p.name),
      message: `No encontré esa mascota. Las tuyas son: ${pets.map((p) => p.name).join(', ')}`,
    };
  }

  return { pets: [match] };
}

export function formatPetNamesForPreview(petName?: unknown): string | null {
  if (petName === null || petName === undefined || petName === '') return null;
  const value = String(petName).trim();
  if (!value) return null;
  if (wantsAllPets(value) || value.toLowerCase() === 'todos') {
    return 'Todas las mascotas';
  }
  return value;
}
