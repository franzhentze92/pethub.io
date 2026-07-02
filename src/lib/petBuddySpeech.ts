import type { PetBuddyVoiceProfile } from '@/lib/blueprint/blueprintMascots';

/** Preferred BCP-47 tag for STT/TTS in PetHub (Latinoamérica). */
export const PET_BUDDY_VOICE_LANG = 'es-MX';

/** Ordered fallbacks for desktop browsers. */
export const PET_BUDDY_VOICE_LANG_FALLBACKS = [
  'es-MX',
  'es-419',
  'es-GT',
  'es-US',
  'es-ES',
  'es',
] as const;

const IOS_VOICE_PATTERN =
  /paulina|mónica|monica|jorge|juan|marta|angel|español|spanish/i;

const SPAIN_VOICE_PATTERN =
  /helena|laura|pablo|elvira|spanish\s*spain|españa|castellano|es-es/i;
const LATAM_VOICE_PATTERN =
  /paulina|dalia|jorge|sabina|mexic|latino|latam|america|juana|monica|diego|google.*es|español.*mex|raúl|raul|lucia|lucía|sofia|sofía|carlos|maria|maría/i;

const MALE_VOICE_PATTERN =
  /jorge|diego|carlos|raul|raúl|pablo|juan|male|masculin|hombre/i;
const FEMALE_VOICE_PATTERN =
  /paulina|dalia|sabina|juana|monica|mónica|lucia|lucía|sofia|sofía|maria|maría|helena|laura|elvira|female|femenin|mujer/i;

/** Preferred voice name hints per mascot (LatAm first). */
const MASCOT_VOICE_HINTS: Record<PetBuddyVoiceProfile, RegExp[]> = {
  atis: [/paulina/i, /jorge/i, /juan/i, /diego/i],
  shaggy: [/jorge/i, /juan/i, /diego/i, /carlos/i],
  sasha: [/paulina/i, /mónica/i, /monica/i, /dalia/i, /juana/i],
};

/** Known words/names → speakable form (avoids spelling as acronyms). */
const SPEECH_PRONUNCIATIONS: Record<string, string> = {
  atis: 'átis',
  shaggy: 'shagui',
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Map mascot + pet names to forms TTS reads naturally in Spanish. */
export function applySpeechPronunciations(text: string, extraNames: string[] = []): string {
  const lexicon = new Map<string, string>(Object.entries(SPEECH_PRONUNCIATIONS));

  for (const raw of extraNames) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (lexicon.has(key)) continue;
    if (/^[a-záéíóúñü]{2,8}$/i.test(name)) {
      lexicon.set(key, key === 'atis' ? 'átis' : name.toLowerCase());
    }
  }

  let out = text;
  const entries = [...lexicon.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [key, spoken] of entries) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi'), spoken);
  }
  return out;
}

export function isChromiumDesktop(): boolean {
  if (typeof navigator === 'undefined' || isMobileBrowser()) return false;
  return /Chrome|Chromium|Edg\//i.test(navigator.userAgent);
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let cachedVoiceProfile: PetBuddyVoiceProfile | null = null;

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\//i.test(ua);
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && isSafariBrowser();
}

export function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileBrowser(): boolean {
  return isIosSafari() || isAndroidBrowser();
}

/** Mobile (iPhone/Android) — español latino; desktop Safari macOS — es-ES. */
export function resolveSpeechRecognitionLang(preferred = PET_BUDDY_VOICE_LANG): string {
  if (isMobileBrowser()) return preferred;
  if (isSafariBrowser()) return 'es-ES';
  return preferred;
}

export function resolveSpeechSynthesisLang(voice?: SpeechSynthesisVoice | null): string {
  if (voice?.lang?.toLowerCase().startsWith('es')) return voice.lang;
  return PET_BUDDY_VOICE_LANG;
}

export function primeSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.getVoices();
  if (synth.paused) synth.resume();
}

/** Call on user tap — iOS only unlocks voices after a gesture. */
export function primeMobileSpeechOnGesture(profile: PetBuddyVoiceProfile): void {
  if (!isMobileBrowser()) return;
  primeSpeechSynthesis();
  const voice = pickSpanishVoiceForProfile(profile, { forceRefresh: true });
  if (!voice) return;

  const warmup = new SpeechSynthesisUtterance('Hola');
  warmup.volume = 0.01;
  warmup.rate = 1;
  warmup.voice = voice;
  warmup.lang = voice.lang;
  window.speechSynthesis.speak(warmup);
  setTimeout(() => window.speechSynthesis.cancel(), 40);
}

function scoreSpanishVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = 0;

  if (!lang.startsWith('es')) return -9999;

  if (lang === 'es-mx') score += 130;
  else if (lang === 'es-gt') score += 125;
  else if (lang.startsWith('es-419')) score += 115;
  else if (lang === 'es-us') score += 100;
  else if (lang.startsWith('es-') && !lang.startsWith('es-es')) score += 75;
  else if (lang === 'es-es') score += 30;

  if (SPAIN_VOICE_PATTERN.test(label)) score -= 60;
  if (LATAM_VOICE_PATTERN.test(label)) score += 40;

  if (isIosSafari()) {
    if (/premium|enhanced|super-compact/i.test(voice.voiceURI)) score += 160;
    if (/compact/i.test(voice.voiceURI) && !/enhanced|premium|super-compact/i.test(voice.voiceURI)) {
      score -= 80;
    }
    if (IOS_VOICE_PATTERN.test(label)) score += 90;
    if (/paulina/i.test(label)) score += 120;
    if (lang === 'es-mx') score += 60;
  }

  if (isAndroidBrowser()) {
    if (/google|network|local/i.test(voice.voiceURI)) score += 30;
    if (/paulina|es-us|es-mx|latino/i.test(label)) score += 50;
  }

  if (isChromiumDesktop()) {
    if (/google/i.test(label) && (lang === 'es-us' || lang === 'es-mx' || lang.startsWith('es-419'))) {
      score += 110;
    }
    if (/neural|natural|wavenet|online/i.test(label)) score += 70;
    if (/microsoft.*(sabina|dalia|diego|pablo)/i.test(label)) score += 55;
    if (/paulina|jorge|dalia|sabina/i.test(label)) score += 35;
    if (lang === 'es-es' && SPAIN_VOICE_PATTERN.test(label)) score -= 25;
  }

  if (voice.localService) score += 12;
  if (!voice.default) score += 3;

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
      score += 90 - i * 12;
    }
  }

  return score;
}

/** Pick a native Spanish voice. Never returns English. */
export function pickSpanishVoiceForProfile(
  profile: PetBuddyVoiceProfile,
  opts?: { forceRefresh?: boolean },
): SpeechSynthesisVoice | null {
  if (!opts?.forceRefresh && cachedVoice && cachedVoiceProfile === profile) {
    return cachedVoice;
  }

  const ranked = getRankedSpanishVoices();
  if (ranked.length === 0) return null;

  const scored = [...ranked].sort(
    (a, b) => scoreVoiceForProfile(b, profile) - scoreVoiceForProfile(a, profile),
  );

  const best = scored[0];
  let picked: SpeechSynthesisVoice | null = null;

  if (best && scoreVoiceForProfile(best, profile) > -50) {
    picked = best;
  } else if (profile === 'sasha') {
    picked = ranked.find(isFemaleVoice) ?? ranked[0];
  } else {
    const males = ranked.filter((v) => isMaleVoice(v) || !isFemaleVoice(v));
    picked = (profile === 'shaggy' && males.length > 1 ? males[1] : males[0]) ?? ranked[0];
  }

  if (picked) {
    cachedVoice = picked;
    cachedVoiceProfile = profile;
  }

  return picked;
}

export function waitForSpanishVoice(
  profile: PetBuddyVoiceProfile,
  timeoutMs = isMobileBrowser() ? 5000 : 2500,
): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    primeSpeechSynthesis();
    const tryPick = () => pickSpanishVoiceForProfile(profile);
    const immediate = tryPick();
    if (immediate) {
      resolve(immediate);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const onVoices = () => {
      const voice = tryPick();
      if (voice || Date.now() >= deadline) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        resolve(voice);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    onVoices();
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      resolve(tryPick());
    }, timeoutMs);
  });
}

export function getVoiceInfoForProfile(
  profile: PetBuddyVoiceProfile,
): { voice: SpeechSynthesisVoice; label: string } | null {
  const voice = pickSpanishVoiceForProfile(profile);
  if (!voice) return null;
  return { voice, label: formatVoiceLabel(voice) };
}

export interface TtsSettings {
  rate: number;
  pitch?: number;
  volume: number;
  /** iOS/Android WebKit distorts audio if pitch ≠ 1 — leave unset. */
  omitPitch: boolean;
}

export function getTtsSettings(
  voice?: SpeechSynthesisVoice | null,
  profile?: PetBuddyVoiceProfile,
): TtsSettings {
  if (isMobileBrowser()) {
    return {
      rate: isIosSafari() ? 0.97 : 0.95,
      volume: 0.88,
      omitPitch: true,
    };
  }

  // Desktop: natural speed, no pitch shift (avoids robotic/choppy artifacts).
  return {
    rate: 1.0,
    volume: 1,
    omitPitch: true,
  };
}

export function applyTtsToUtterance(
  utterance: SpeechSynthesisUtterance,
  voice: SpeechSynthesisVoice | null,
  profile: PetBuddyVoiceProfile,
): void {
  utterance.lang = resolveSpeechSynthesisLang(voice);
  if (voice) utterance.voice = voice;

  const tts = getTtsSettings(voice, profile);
  utterance.rate = tts.rate;
  utterance.volume = tts.volume;
  if (!tts.omitPitch && tts.pitch !== undefined) {
    utterance.pitch = tts.pitch;
  }
}

/** iOS/Android garble long utterances — split by sentence. */
export function chunkTextForMobileTts(text: string, maxLen = 150): string[] {
  if (!text.trim()) return [];
  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim());
  if (sentences.length === 0) return [text.trim()];

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const next = buffer ? `${buffer} ${sentence}` : sentence;
    if (next.length > maxLen && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = next;
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length > 0 ? chunks : [text.trim()];
}

export function shouldUseChunkedMobileTts(): boolean {
  return isMobileBrowser();
}

/** Desktop only splits very long answers — short replies stay one fluid utterance. */
export function shouldChunkTts(text: string): boolean {
  if (isMobileBrowser()) return true;
  return text.trim().length > 480;
}

export function chunkTextForDesktopTts(text: string, maxLen = 320): string[] {
  return chunkTextForMobileTts(text, maxLen);
}

export interface TextForSpeechOptions {
  petNames?: string[];
}

/** Plain, youthful GT-friendly text for text-to-speech. */
export function textForSpeech(markdown: string, options?: TextForSpeechOptions): string {
  let text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_#`]/g, '')
    .replace(/[•·▪]/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
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
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s*:\s*/g, ', ')
    .replace(/\s*([,.;:])\s*/g, '$1 ')
    .replace(/,{2,}/g, ',')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  text = applySpeechPronunciations(text, options?.petNames);

  const MAX_LEN = isMobileBrowser() ? 320 : 600;
  if (text.length > MAX_LEN) {
    const chunk = text.slice(0, MAX_LEN);
    const lastBreak = Math.max(
      chunk.lastIndexOf('.'),
      chunk.lastIndexOf('?'),
      chunk.lastIndexOf('!'),
      chunk.lastIndexOf(','),
    );
    text = (lastBreak > 120 ? chunk.slice(0, lastBreak + 1) : chunk).trim();
    if (isMobileBrowser()) {
      text += ' Si quieres, te cuento más.';
    }
  }

  return text;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export type MicAccessResult = 'granted' | 'denied' | 'unsupported' | 'prompt';

/** Check mic permission without prompting (when Permissions API is available). */
export async function queryMicrophonePermission(): Promise<PermissionState | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'unknown';
  }
}

/**
 * Request microphone access — call only from a user click/tap.
 * Web Speech API needs mic permission; this triggers the browser prompt explicitly.
 */
export async function requestMicrophoneAccess(): Promise<MicAccessResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }

  const existing = await queryMicrophonePermission();
  if (existing === 'granted') return 'granted';
  if (existing === 'denied') return 'denied';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'denied';
    }
    console.warn('[PetBuddy voice] getUserMedia failed:', err);
    return 'prompt';
  }
}

/** Whether we can try SpeechRecognition without calling getUserMedia again. */
export async function canUseMicrophoneWithoutPrompt(): Promise<boolean> {
  const state = await queryMicrophonePermission();
  return state === 'granted';
}

export function isMicErrorRecoverable(error: string): boolean {
  return error === 'no-speech' || error === 'network';
}

export function isMicPermissionError(error: string): boolean {
  return (
    error === 'not-allowed' ||
    error === 'service-not-allowed' ||
    error === 'audio-capture'
  );
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

/** @deprecated Use primeSpeechSynthesis */
export function primeSafariSpeechSynthesis(): void {
  primeSpeechSynthesis();
}
