import type { PostgrestError } from '@supabase/supabase-js';

export function getSupabaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Error desconocido';
  const e = error as PostgrestError;
  return e.message?.trim() || e.details?.trim() || 'Error desconocido';
}

export function isMissingDogWalkSchema(error: unknown): boolean {
  const msg = getSupabaseErrorMessage(error).toLowerCase();
  const code = (error as PostgrestError | undefined)?.code;
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('dog_walker_profiles') ||
    msg.includes('dog_walk_requests') ||
    msg.includes('dog_walk_request_pets')
  );
}

export function dogWalkSchemaErrorHint(): string {
  return 'Las tablas de Paseos no están en la base de datos. Ejecuta las migraciones en Supabase (SQL Editor o scripts/apply-dog-walk-migrations.mjs).';
}
