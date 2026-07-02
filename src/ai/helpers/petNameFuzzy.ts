/** Common speech-to-text mis-hearings for pet names (especially short/unusual names). */
const STT_PET_ALIASES: Record<string, string[]> = {
  atis: ['beatis', 'the aries', 'aries', 'artis', 'a tis', 'hattis', 'attis', '8tis', 'a ties', 'the atis'],
  sasha: ['sacha', 'sasa', 'saxa', 'sacha'],
  shaggy: ['shagi', 'shagui', 'chagui', 'chagy', 'shagie'],
};

function normalizePetToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/^(the|a|be|de|el|la|mi|mis)\s+/gi, '')
    .replace(/\s+/g, '')
    .replace(/[.,!?¿¡'"]/g, '');
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

/** Match a spoken or typed fragment to one of the user's pet names. */
export function fuzzyMatchPetName(rawName: string, userPetNames: string[]): string | undefined {
  const needle = normalizePetToken(rawName);
  if (!needle || userPetNames.length === 0) return undefined;

  for (const name of userPetNames) {
    const key = normalizePetToken(name);
    if (needle === key) return name;
    if (needle.includes(key) || key.includes(needle)) return name;
  }

  for (const name of userPetNames) {
    const key = name.toLowerCase();
    const aliases = STT_PET_ALIASES[key] ?? [];
    for (const alias of aliases) {
      const aliasNorm = normalizePetToken(alias);
      if (needle === aliasNorm || needle.includes(aliasNorm) || aliasNorm.includes(needle)) {
        return name;
      }
    }
  }

  if (needle.length >= 3 && needle.length <= 14) {
    let best: { name: string; dist: number } | null = null;
    for (const name of userPetNames) {
      const key = normalizePetToken(name);
      const dist = levenshtein(needle, key);
      const threshold = key.length <= 5 ? 2 : 3;
      if (dist <= threshold && (!best || dist < best.dist)) {
        best = { name, dist };
      }
    }
    if (best) return best.name;
  }

  return undefined;
}

/** Fix common voice transcripts before sending to the AI. */
export function normalizeVoiceTranscript(text: string, petNames: string[] = []): string {
  let out = text.trim();
  if (!out) return out;

  for (const name of [...petNames].sort((a, b) => b.length - a.length)) {
    const aliases = STT_PET_ALIASES[name.toLowerCase()] ?? [];
    for (const alias of aliases) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      out = out.replace(re, name);
    }
  }

  const words = out.split(/\s+/);
  if (words.length <= 3 && petNames.length > 0) {
    const fuzzy = fuzzyMatchPetName(out, petNames);
    if (fuzzy && normalizePetToken(out) !== normalizePetToken(fuzzy)) {
      return fuzzy;
    }
  }

  return out;
}
