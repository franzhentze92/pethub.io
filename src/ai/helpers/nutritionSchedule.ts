export type MealTypeValue = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function parseTimeTo24h(raw: string): string | null {
  const token = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const hhmm = token.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = Math.min(23, Math.max(0, parseInt(hhmm[1], 10)));
    return `${String(h).padStart(2, '0')}:${hhmm[2]}`;
  }

  const am = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(?:a\.?\s*m\.?|am)$/);
  if (am) {
    let h = parseInt(am[1], 10);
    if (h === 12) h = 0;
    const m = am[2] ?? '00';
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  const pm = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(?:p\.?\s*m\.?|pm)$/);
  if (pm) {
    let h = parseInt(pm[1], 10);
    if (h < 12) h += 12;
    if (h > 23) h = 23;
    const m = pm[2] ?? '00';
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  return null;
}

export function inferMealTypeFromTime(time: string): MealTypeValue {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour >= 5 && hour <= 10) return 'breakfast';
  if (hour >= 11 && hour <= 14) return 'lunch';
  if (hour >= 18 && hour <= 21) return 'dinner';
  return 'snack';
}

export function extractTimesFromText(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|am|p\.?\s*m\.?|pm)\b/gi)) {
    const parsed = parseTimeTo24h(match[0]);
    if (parsed) found.add(parsed);
  }

  for (const match of text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    const parsed = parseTimeTo24h(`${match[1]}:${match[2]}`);
    if (parsed) found.add(parsed);
  }

  return [...found].sort();
}

export function normalizeTimesInput(times?: string[]): string[] {
  if (!times?.length) return [];
  const normalized: string[] = [];
  for (const raw of times) {
    const parsed = parseTimeTo24h(raw);
    if (parsed) normalized.push(parsed);
  }
  return [...new Set(normalized)].sort();
}

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse YYYY-MM-DD, D/M/YYYY, or "30 de junio 2026" from free text. */
export function extractDateFromText(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slash) {
    return toIsoDate(Number(slash[3]), Number(slash[2]), Number(slash[1]));
  }

  const spanish = text.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(20\d{2}))?\b/i,
  );
  if (spanish) {
    const month = SPANISH_MONTHS[spanish[2].toLowerCase()];
    const year = spanish[3] ? Number(spanish[3]) : new Date().getFullYear();
    return toIsoDate(year, month, Number(spanish[1]));
  }

  return null;
}
