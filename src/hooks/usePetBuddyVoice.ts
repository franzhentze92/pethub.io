import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  getTtsSettings,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  PET_BUDDY_VOICE_LANG,
  pickSpanishVoiceForProfile,
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

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
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
      if (suppressListenRestartRef.current) return;
      if (!getKeepListeningRef.current?.()) return;
      if (isSpeakingRef.current) return;

      const delay =
        delayMs ??
        (conversationModeRef.current ? 900 : 450);

      const now = Date.now();
      if (now - lastRestartAtRef.current < 500) return;
      lastRestartAtRef.current = now;

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!getKeepListeningRef.current?.() || isSpeakingRef.current || isListeningRef.current) {
          return;
        }
        startListeningRef.current?.();
      }, delay);
    },
    [clearRestartTimer],
  );

  const startListeningRef = useRef<() => boolean>(() => false);

  const startListening = useCallback((): boolean => {
    if (!sttSupported || isListeningRef.current || isSpeakingRef.current) return false;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    clearRestartTimer();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = conversationModeRef.current;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
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
      setIsListening(false);
      isListeningRef.current = false;
      if (event.error === 'aborted') return;
      if (event.error !== 'no-speech') {
        console.warn('[PetBuddy voice]', event.error);
      }
      scheduleListenRestart(event.error === 'no-speech' ? 700 : 1000);
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      if (!getKeepListeningRef.current?.() || isSpeakingRef.current) return;
      scheduleListenRestart();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch (err) {
      console.warn('[PetBuddy voice] start failed:', err);
      setIsListening(false);
      isListeningRef.current = false;
      scheduleListenRestart(1200);
      return false;
    }
  }, [sttSupported, lang, clearRestartTimer, scheduleListenRestart]);

  startListeningRef.current = startListening;

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsSupported || !text.trim()) {
        onEnd?.();
        return;
      }

      clearRestartTimer();
      stopListening();

      const generation = ++speakGenerationRef.current;

      const runSpeak = () => {
        if (generation !== speakGenerationRef.current) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const profile = voiceProfileRef.current;
        const voice = pickSpanishVoiceForProfile(profile);
        utterance.lang = voice?.lang ?? lang;
        if (voice) utterance.voice = voice;
        const tts = getTtsSettings(voice, profile);
        utterance.rate = tts.rate;
        utterance.pitch = tts.pitch;
        utterance.volume = tts.volume;

        utterance.onstart = () => {
          if (generation !== speakGenerationRef.current) return;
          setIsSpeaking(true);
          isSpeakingRef.current = true;
        };
        utterance.onend = () => {
          if (generation !== speakGenerationRef.current) return;
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          const cb = speakEndRef.current;
          speakEndRef.current = null;
          cb?.();
        };
        utterance.onerror = () => {
          if (generation !== speakGenerationRef.current) return;
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          speakEndRef.current = null;
          onEnd?.();
        };

        speakEndRef.current = onEnd ?? null;
        window.speechSynthesis.speak(utterance);
      };

      setTimeout(runSpeak, 80);
    },
    [ttsSupported, lang, stopListening, clearRestartTimer, voiceProfile],
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
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    scheduleListenRestart,
    allowListenRestart,
  };
};
