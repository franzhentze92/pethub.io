import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyTtsToUtterance,
  chunkTextForDesktopTts,
  chunkTextForMobileTts,
  getSpeechRecognitionCtor,
  isIosSafari,
  isMobileBrowser,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  PET_BUDDY_VOICE_LANG,
  pickSpanishVoiceForProfile,
  primeSpeechSynthesis,
  resolveSpeechRecognitionLang,
  queryMicrophonePermission,
  requestMicrophoneAccess,
  isMicPermissionError,
  isMicErrorRecoverable,
  shouldChunkTts,
  waitForSpanishVoice,
} from '@/lib/petBuddySpeech';
import type { PetBuddyVoiceProfile } from '@/lib/blueprint/blueprintMascots';

interface UsePetBuddyVoiceOptions {
  lang?: string;
  voiceProfile: PetBuddyVoiceProfile;
  /** Open-mic conversation: longer pauses, continuous recognition. */
  conversationMode?: boolean;
  /** When true, mic reopens automatically after each pause (open conversation). */
  getKeepListening?: () => boolean;
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

export function usePetBuddyVoice({
  lang = PET_BUDDY_VOICE_LANG,
  voiceProfile,
  conversationMode = false,
  getKeepListening,
  onFinalTranscript,
  onInterimTranscript,
}: UsePetBuddyVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);

  const micBlockedRef = useRef(false);
  const micPrimedRef = useRef(false);
  const startingListenRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const onInterimRef = useRef(onInterimTranscript);
  const getKeepListeningRef = useRef(getKeepListening);
  const conversationModeRef = useRef(conversationMode);
  const speakEndRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRestartAtRef = useRef(0);
  const lastFinalTranscriptRef = useRef({ text: '', at: 0 });
  const suppressListenRestartRef = useRef(false);
  const speakGenerationRef = useRef(0);

  const sttSupported = isSpeechRecognitionSupported();
  const ttsSupported = isSpeechSynthesisSupported();
  const isSupported = sttSupported && ttsSupported;

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
    onInterimRef.current = onInterimTranscript;
    getKeepListeningRef.current = getKeepListening;
    conversationModeRef.current = conversationMode;
  }, [onFinalTranscript, onInterimTranscript, getKeepListening, conversationMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    micBlockedRef.current = micBlocked;
  }, [micBlocked]);

  const voiceProfileRef = useRef(voiceProfile);
  useEffect(() => {
    voiceProfileRef.current = voiceProfile;
  }, [voiceProfile]);

  useEffect(() => {
    if (!ttsSupported) return;
    const loadVoices = () => {
      if (pickSpanishVoiceForProfile(voiceProfileRef.current) || window.speechSynthesis.getVoices().length > 0) {
        setVoiceReady(true);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [ttsSupported, voiceProfile]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const markMicBlocked = useCallback(
    (blocked: boolean) => {
      micBlockedRef.current = blocked;
      setMicBlocked(blocked);
      if (blocked) clearRestartTimer();
    },
    [clearRestartTimer],
  );

  const primeMicOnGesture = useCallback(async (): Promise<boolean> => {
    const result = await requestMicrophoneAccess();
    if (result === 'granted') {
      micPrimedRef.current = true;
      markMicBlocked(false);
      return true;
    }
    if (result === 'denied') {
      markMicBlocked(true);
      return false;
    }
    // prompt/unsupported — still try SpeechRecognition (has its own permission flow)
    micPrimedRef.current = true;
    return true;
  }, [markMicBlocked]);

  /** @deprecated Use primeMicOnGesture on user click only */
  const requestMicAccess = primeMicOnGesture;

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    speakGenerationRef.current += 1;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    speakEndRef.current = null;
  }, [ttsSupported]);

  const stopListening = useCallback(() => {
    clearRestartTimer();
    try {
      recognitionRef.current?.abort();
    } catch {
      recognitionRef.current?.stop();
    }
    recognitionRef.current = null;
    setIsListening(false);
    isListeningRef.current = false;
    onInterimRef.current?.('');
  }, [clearRestartTimer]);

  const allowListenRestart = useCallback(() => {
    suppressListenRestartRef.current = false;
  }, []);

  const scheduleListenRestart = useCallback(
    (delayMs?: number) => {
      clearRestartTimer();
      if (micBlockedRef.current) return;
      if (suppressListenRestartRef.current) return;
      if (!getKeepListeningRef.current?.()) return;
      if (isSpeakingRef.current) return;

      const delay =
        delayMs ??
        (conversationModeRef.current
          ? isMobileBrowser()
            ? 1400
            : 900
          : isMobileBrowser()
            ? 800
            : 450);

      const now = Date.now();
      if (now - lastRestartAtRef.current < 500) return;
      lastRestartAtRef.current = now;

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!getKeepListeningRef.current?.() || isSpeakingRef.current || isListeningRef.current) {
          return;
        }
        void startListeningRef.current?.();
      }, delay);
    },
    [clearRestartTimer],
  );

  const startListeningRef = useRef<() => Promise<boolean>>(async () => false);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!sttSupported || isListeningRef.current || isSpeakingRef.current || startingListenRef.current) {
      return false;
    }
    if (micBlockedRef.current) return false;

    startingListenRef.current = true;
    try {
      const perm = await queryMicrophonePermission();
      if (perm === 'denied') {
        markMicBlocked(true);
        return false;
      }
      if (perm !== 'granted' && !micPrimedRef.current) {
        scheduleListenRestart(1200);
        return false;
      }

      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return false;

      clearRestartTimer();

      const recognition = new Ctor();
      recognition.lang = resolveSpeechRecognitionLang(lang);
      // Chrome desktop breaks with continuous=true — restart via onend instead.
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let listenStarted = false;
      const startWatch = window.setTimeout(() => {
        if (!listenStarted && recognitionRef.current === recognition) {
          try {
            recognition.stop();
          } catch {
            /* ignore */
          }
          scheduleListenRestart(600);
        }
      }, 4000);

      recognition.onstart = () => {
        listenStarted = true;
        window.clearTimeout(startWatch);
        markMicBlocked(false);
        setIsListening(true);
        isListeningRef.current = true;
        onInterimRef.current?.('');
      };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) onInterimRef.current?.(interim.trim());
      if (finalText.trim()) {
        const trimmed = finalText.trim();
        const now = Date.now();
        const last = lastFinalTranscriptRef.current;
        if (trimmed === last.text && now - last.at < 3000) return;

        lastFinalTranscriptRef.current = { text: trimmed, at: now };
        suppressListenRestartRef.current = true;
        onInterimRef.current?.('');
        clearRestartTimer();
        try {
          recognition.stop();
        } catch {
          /* recognition may already be stopping */
        }
        onFinalRef.current(trimmed);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      window.clearTimeout(startWatch);
      setIsListening(false);
      isListeningRef.current = false;
      if (event.error === 'aborted') return;
      if (isMicPermissionError(event.error)) {
        markMicBlocked(true);
        console.warn('[PetBuddy voice] mic blocked:', event.error);
        return;
      }
      if (event.error !== 'no-speech') {
        console.warn('[PetBuddy voice]', event.error);
      }
      if (isMicErrorRecoverable(event.error)) {
        scheduleListenRestart(event.error === 'no-speech' ? 700 : 1000);
      } else {
        scheduleListenRestart(1200);
      }
    };

    recognition.onend = () => {
      window.clearTimeout(startWatch);
      setIsListening(false);
      isListeningRef.current = false;
      if (micBlockedRef.current) return;
      if (!getKeepListeningRef.current?.() || isSpeakingRef.current) return;
      scheduleListenRestart();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch (err) {
      window.clearTimeout(startWatch);
      console.warn('[PetBuddy voice] start failed:', err);
      setIsListening(false);
      isListeningRef.current = false;
      scheduleListenRestart(1200);
      return false;
    }
    } finally {
      startingListenRef.current = false;
    }
  }, [sttSupported, lang, clearRestartTimer, scheduleListenRestart, markMicBlocked]);

  startListeningRef.current = startListening;

  const speakOneChunk = useCallback(
    (
      chunk: string,
      voice: SpeechSynthesisVoice | null,
      profile: typeof voiceProfile,
      generation: number,
    ): Promise<void> =>
      new Promise((resolve) => {
        if (generation !== speakGenerationRef.current) {
          resolve();
          return;
        }

        let settled = false;
        let started = false;
        let poll = 0;
        let timeout = 0;
        let startWatch = 0;

        const finish = () => {
          if (settled) return;
          settled = true;
          if (poll) window.clearInterval(poll);
          if (timeout) window.clearTimeout(timeout);
          if (startWatch) window.clearTimeout(startWatch);
          resolve();
        };

        timeout = window.setTimeout(finish, 25000);

        const utterance = new SpeechSynthesisUtterance(chunk);
        applyTtsToUtterance(utterance, voice, profile);

        utterance.onstart = () => {
          if (generation !== speakGenerationRef.current) return;
          started = true;
          setIsSpeaking(true);
          isSpeakingRef.current = true;
        };
        utterance.onend = () => finish();
        utterance.onerror = () => finish();

        primeSpeechSynthesis();
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);

        poll = window.setInterval(() => {
          if (generation !== speakGenerationRef.current) {
            finish();
            return;
          }
          if (!started) return;
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            finish();
          }
        }, 500);

        startWatch = window.setTimeout(() => {
          if (!started) finish();
        }, 3500);
      }),
    [],
  );

  const finishSpeak = useCallback((generation: number, onEnd?: () => void) => {
    if (generation !== speakGenerationRef.current) return;
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    const cb = speakEndRef.current ?? onEnd;
    speakEndRef.current = null;
    cb?.();
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsSupported || !text.trim()) {
        onEnd?.();
        return;
      }

      clearRestartTimer();
      stopListening();

      const generation = ++speakGenerationRef.current;
      speakEndRef.current = onEnd ?? null;

      const runSpeak = async () => {
        try {
          if (generation !== speakGenerationRef.current) return;

          primeSpeechSynthesis();
          window.speechSynthesis.cancel();

          // Chrome/Safari need a brief gap after cancel() or speak() silently fails.
          await new Promise((r) => setTimeout(r, isMobileBrowser() ? 120 : 80));

          if (generation !== speakGenerationRef.current) return;

          const profile = voiceProfileRef.current;
          const voice = (await waitForSpanishVoice(profile)) ?? pickSpanishVoiceForProfile(profile);

          const chunks = shouldChunkTts(text)
            ? isMobileBrowser()
              ? chunkTextForMobileTts(text)
              : chunkTextForDesktopTts(text)
            : [text];

          if (chunks.length === 0) return;

          for (let i = 0; i < chunks.length; i++) {
            if (generation !== speakGenerationRef.current) return;
            await speakOneChunk(chunks[i], voice, profile, generation);
            if (isIosSafari() && i < chunks.length - 1) {
              await new Promise((r) => setTimeout(r, 140));
            }
            if (!isMobileBrowser() && i < chunks.length - 1) {
              await new Promise((r) => setTimeout(r, 20));
            }
          }
        } catch (err) {
          console.warn('[PetBuddy voice] speak failed:', err);
        } finally {
          finishSpeak(generation, onEnd);
        }
      };

      void runSpeak();
    },
    [ttsSupported, stopListening, clearRestartTimer, speakOneChunk, finishSpeak],
  );

  useEffect(() => {
    return () => {
      clearRestartTimer();
      stopListening();
      stopSpeaking();
    };
  }, [clearRestartTimer, stopListening, stopSpeaking]);

  return {
    isSupported,
    sttSupported,
    ttsSupported,
    voiceReady,
    isListening,
    isSpeaking,
    micBlocked,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    scheduleListenRestart,
    allowListenRestart,
    primeMicOnGesture,
    requestMicAccess,
  };
};
