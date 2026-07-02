const EXERCISE_TYPE_LABELS: Record<string, string> = {
  walk: 'Caminata',
  run: 'Carrera',
  play: 'Juego',
  swimming: 'Natación',
  agility: 'Agilidad',
  training: 'Entrenamiento',
  fetch: 'Buscar pelota',
  hiking: 'Senderismo',
  tug: 'Tirar de la cuerda',
  hide: 'Buscar y encontrar',
  obstacle: 'Carrera de obstáculos',
  other: 'Otro',
  walking: 'Caminata',
  running: 'Carrera',
  playing: 'Juego',
};

const INTENSITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

export function formatExerciseTypeLabel(type: unknown): string {
  if (type === null || type === undefined || type === '') return '—';
  const key = String(type).trim().toLowerCase();
  return EXERCISE_TYPE_LABELS[key] ?? String(type);
}

export function formatExerciseIntensityLabel(intensity: unknown): string {
  if (intensity === null || intensity === undefined || intensity === '') return 'Media';
  const key = String(intensity).trim().toLowerCase();
  return INTENSITY_LABELS[key] ?? String(intensity);
}
