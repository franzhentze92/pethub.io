import type { PetBuddyVoiceProfile } from '@/lib/blueprint/blueprintMascots';

/** Preferred BCP-47 tag for STT/TTS in PetHub (Latinoamérica). */
export const PET_BUDDY_VOICE_LANG = 'es-GT';

const SPAIN_VOICE_PATTERN =
  /helena|laura|pablo|elvira|spanish\s*spain|españa|castellano|es-es/i;
const LATAM_VOICE_PATTERN =
  /paulina|dalia|jorge|sabina|mexic|latino|latam|america|juana|monica|diego|google.*es|español.*estados|español.*mex|raúl|raul|lucia|lucía|sofia|sofía|carlos|maria|maría/i;

const MALE_VOICE_PATTERN =
  /jorge|diego|carlos|raul|raúl|pablo|male|masculin|hombre/i;
const FEMALE_VOICE_PATTERN =
  /paulina|dalia|sabina|juana|monica|mónica|lucia|lucía|sofia|sofía|maria|maría|helena|laura|elvira|female|femenin|mujer/i;

/** Preferred voice name hints per mascot (LatAm first). */
const MASCOT_VOICE_HINTS: Record<PetBuddyVoiceProfile, RegExp[]> = {
  atis: [/jorge/i, /diego/i, /raul|raúl/i, /carlos/i],
  shaggy: [/carlos/i, /raul|raúl/i, /diego/i, /jorge/i],
  sasha: [/paulina/i, /dalia/i, /juana/i, /monica|mónica/i, /sabina/i, /lucia|lucía/i],
};

function scoreSpanishVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = 0;

  if (lang === 'es-gt') score += 120;
  else if (lang === 'es-mx') score += 110;
  else if (lang.startsWith('es-419')) score += 105;
  else if (lang === 'es-us') score += 95;
  else if (lang.startsWith('es-') && !lang.startsWith('es-es')) score += 70;
  else if (lang === 'es-es') score -= 40;

  if (SPAIN_VOICE_PATTERN.test(label)) score -= 100;
  if (LATAM_VOICE_PATTERN.test(label)) score += 35;
  if (voice.localService) score += 8;
  if (!voice.default) score += 2;

  return score;
}

function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (FEMALE_VOICE_PATTERN.test(label)) return false;
  return MALE_VOICE_PATTERN.test(label);
}

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (MALE_VOICE_PATTERN.test(label)) return false;
  return FEMALE_VOICE_PATTERN.test(label);
}

export function getRankedSpanishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  const spanish = voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
  const ranked = [...spanish].sort((a, b) => scoreSpanishVoice(b) - scoreSpanishVoice(a));

  const seen = new Set<string>();
  return ranked.filter((v) => {
    const key = `${v.name}::${v.lang}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  const region = voice.lang.replace(/^es-/i, '').toUpperCase() || 'ES';
  return `${voice.name} · ${region}`;
}

function scoreVoiceForProfile(voice: SpeechSynthesisVoice, profile: PetBuddyVoiceProfile): number {
  let score = scoreSpanishVoice(voice);
  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();

  if (profile === 'sasha') {
    if (isFemaleVoice(voice)) score += 200;
    else if (isMaleVoice(voice)) score -= 300;
  } else {
    if (isMaleVoice(voice)) score += 200;
    else if (isFemaleVoice(voice)) score -= 300;
  }

  for (let i = 0; i < MASCOT_VOICE_HINTS[profile].length; i++) {
    if (MASCOT_VOICE_HINTS[profile][i].test(label)) {
      score += 80 - i * 10;
    }
  }

  return score;
}

/** Pick the fixed Spanish voice for a mascot avatar. */
export function pickSpanishVoiceForProfile(profile: PetBuddyVoiceProfile): SpeechSynthesisVoice | null {
  const ranked = getRankedSpanishVoices();
  if (ranked.length === 0) return null;

  const scored = [...ranked].sort(
    (a, b) => scoreVoiceForProfile(b, profile) - scoreVoiceForProfile(a, profile),
  );

  const best = scored[0];
  if (best && scoreVoiceForProfile(best, profile) > -50) return best;

  if (profile === 'sasha') {
    return ranked.find(isFemaleVoice) ?? ranked[0];
  }

  const males = ranked.filter((v) => isMaleVoice(v) || !isFemaleVoice(v));
  if (profile === 'shaggy' && males.length > 1) return males[1];
  return males[0] ?? ranked[0];
}

export function getVoiceInfoForProfile(
  profile: PetBuddyVoiceProfile,
): { voice: SpeechSynthesisVoice; label: string } | null {
  const voice = pickSpanishVoiceForProfile(profile);
  if (!voice) return null;
  return { voice, label: formatVoiceLabel(voice) };
}

export function getTtsSettings(
  voice?: SpeechSynthesisVoice | null,
  profile?: PetBuddyVoiceProfile,
): {
  rate: number;
  pitch: number;
  volume: number;
} {
  if (profile === 'atis') {
    return { rate: 1.12, pitch: 1.06, volume: 1 };
  }
  if (profile === 'shaggy') {
    return { rate: 1.06, pitch: 0.96, volume: 1 };
  }
  if (profile === 'sasha') {
    return { rate: 1.1, pitch: 1.16, volume: 1 };
  }

  const label = voice ? `${voice.name} ${voice.lang}`.toLowerCase() : '';
  const isMale = MALE_VOICE_PATTERN.test(label);

  return {
    rate: 1.1,
    pitch: isMale ? 1.02 : 1.14,
    volume: 1,
  };
}

/** Plain, youthful GT-friendly text for text-to-speech. */
export function textForSpeech(markdown: string): string {
  let text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_#`]/g, '')
    .replace(/[•·▪]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\bQ\.?\s*(\d+(?:[.,]\d+)?)/gi, (_, amount) => `${amount.replace(',', '.')} quetzales`)
    .replace(/\bGTQ\b/gi, 'quetzales')
    .replace(/\bvosotros\b/gi, 'ustedes')
    .replace(/\bvosotras\b/gi, 'ustedes')
    .replace(/\bordenador\b/gi, 'computadora')
    .replace(/\bmóvil\b/gi, 'celular')
    .replace(/\bParece que\b/gi, 'Mira,')
    .replace(/¡Listo! Registré/gi, 'Listo, ya registré')
    .replace(/\bPor favor\b/gi, '')
    .replace(/\n+/g, '. ')
    .replace(/\s*([,.;:])\s*/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const MAX_LEN = 380;
  if (text.length > MAX_LEN) {
    const chunk = text.slice(0, MAX_LEN);
    const lastBreak = Math.max(chunk.lastIndexOf('.'), chunk.lastIndexOf('?'), chunk.lastIndexOf('!'));
    text = (lastBreak > 100 ? chunk.slice(0, lastBreak + 1) : chunk).trim() + ' Si quieres, te cuento más.';
  }

  return text;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
