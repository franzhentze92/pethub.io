import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Send, Sparkles, Trash2, ExternalLink, Mic, MicOff, Volume2, VolumeX, Bot } from 'lucide-react';
import { usePetBuddy } from '@/contexts/PetBuddyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, usePets } from '@/hooks/useSettings';
import { usePetBuddyVoice } from '@/hooks/usePetBuddyVoice';
import { cn } from '@/lib/utils';
import { buildChatGreeting } from '@/lib/blueprint/blueprintMascots';
import { textForSpeech, PET_BUDDY_VOICE_LANG, isIosSafari, isMobileBrowser, primeMobileSpeechOnGesture, primeSpeechSynthesis } from '@/lib/petBuddySpeech';
import { BLUEPRINT_MASCOTS, type BlueprintDashboard } from '@/lib/blueprint/blueprintMascots';
import { PetBuddyActionConfirmCard } from '@/components/pet-buddy/PetBuddyActionConfirmCard';
import { PetBuddyProductRecommendationCards } from '@/components/pet-buddy/PetBuddyProductRecommendationCards';
import { PetBuddyResetMemoryDialog } from '@/components/pet-buddy/PetBuddyResetMemoryDialog';
import { normalizeVoiceTranscript } from '@/ai/helpers/petNameFuzzy';
import { buildEditPrompt } from '@/ai/actionConfirmation';
import type { PetBuddyMessage } from '@/ai/types';

const QUICK_PROMPT_CHIP_STYLES = [
  'bg-landing-aqua/15 text-landing-aqua-dark border-landing-aqua/25 hover:bg-landing-aqua/25',
  'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/25 hover:bg-landing-mango/25',
  'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/25 hover:bg-landing-mint/25',
  'bg-landing-tropical/30 text-landing-mango-dark border-landing-tropical/40 hover:bg-landing-tropical/40',
] as const;

const LOADING_DOT_COLORS = ['bg-landing-aqua', 'bg-landing-mango', 'bg-landing-mint'] as const;

const SPEAK_RESPONSES_KEY = 'petBuddySpeakResponses';

const CLIENT_QUICK_PROMPTS = [
  '¿Cómo están mis mascotas?',
  '¿Tengo recordatorios pendientes?',
  'Recomiéndame productos en el marketplace',
  '¿Hay mascotas en adopción?',
];

const PROVIDER_QUICK_PROMPTS = [
  '¿Cómo van mis pedidos y citas?',
  'Resume mi catálogo de productos y servicios',
  '¿Tengo reservas pendientes hoy?',
  'Ayúdame a completar mi perfil de negocio',
];

const SHELTER_QUICK_PROMPTS = [
  '¿Cuántas mascotas tengo en adopción?',
  '¿Hay solicitudes de adopción pendientes?',
  'Resume el perfil de mi albergue',
  '¿Cuántas adopciones se han aprobado?',
];

function quickPromptsForRole(role: string): string[] {
  if (role === 'provider') return PROVIDER_QUICK_PROMPTS;
  if (role === 'shelter') return SHELTER_QUICK_PROMPTS;
  return CLIENT_QUICK_PROMPTS;
}

function renderMarkdownLite(text: string) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
    return (
      <span key={i}>
        {parts}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

export const PetBuddyWidget: React.FC<{ hideFloatingTrigger?: boolean; centeredPanel?: boolean }> = ({
  hideFloatingTrigger = false,
  centeredPanel = false,
}) => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile(user?.id);
  const { data: pets = [] } = usePets(user?.id);
  const userRole = (profile?.role ?? localStorage.getItem('user_role') ?? 'client') as string;
  const mascotDashboard: BlueprintDashboard =
    userRole === 'provider' ? 'provider' : userRole === 'shelter' ? 'shelter' : 'client';
  const mascot = BLUEPRINT_MASCOTS[mascotDashboard];
  const { isOpen, setIsOpen, toggle, messages, isLoading, sendMessage, confirmPendingAction, cancelPendingAction, addProductRecommendationToCart, resetMemory, agentMode, setAgentMode } = usePetBuddy();
  const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const [speakResponses, setSpeakResponses] = useState(
    () => localStorage.getItem(SPEAK_RESPONSES_KEY) !== '0'
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const voiceIntroSpokenRef = useRef(false);
  const isLoadingRef = useRef(isLoading);
  const pendingVoiceSendRef = useRef(false);
  const wasSpeakingRef = useRef(false);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const userName = profile?.full_name ?? user?.email?.split('@')[0];
  const speechPetNames = useMemo(
    () => [
      mascot.name,
      ...pets.map((p) => p.name).filter(Boolean),
    ],
    [mascot.name, pets],
  );
  const toSpeech = useCallback(
    (markdown: string) => textForSpeech(markdown, { petNames: speechPetNames }),
    [speechPetNames],
  );
  const quickPrompts = quickPromptsForRole(userRole);
  const welcomeMessage: PetBuddyMessage = useMemo(
    () => ({
      id: 'welcome',
      role: 'assistant',
      content: buildChatGreeting(mascotDashboard, userName, voiceMode || speakResponses),
      timestamp: new Date(),
    }),
    [userName, voiceMode, speakResponses, mascotDashboard],
  );

  const displayMessages = messages.length === 0 && isOpen ? [welcomeMessage] : messages;

  const stopListeningRef = useRef<() => void>(() => {});

  const handleFinalTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoadingRef.current || pendingVoiceSendRef.current) return;
      pendingVoiceSendRef.current = true;
      stopListeningRef.current();
      setInput('');
      const normalized = normalizeVoiceTranscript(text, speechPetNames);
      try {
        await sendMessage(normalized, { voiceMode: voiceMode || speakResponses });
      } finally {
        pendingVoiceSendRef.current = false;
      }
    },
    [sendMessage, voiceMode, speakResponses, speechPetNames],
  );

  const {
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
  } = usePetBuddyVoice({
    lang: PET_BUDDY_VOICE_LANG,
    voiceProfile: mascot.voiceProfile,
    conversationMode: voiceMode,
    getKeepListening: () =>
      voiceModeRef.current && !isLoadingRef.current && !pendingVoiceSendRef.current,
    onFinalTranscript: handleFinalTranscript,
    onInterimTranscript: (text) => {
      if (text) setInput(text);
    },
  });

  stopListeningRef.current = stopListening;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [displayMessages, isLoading, isListening]);

  useEffect(() => {
    if (isOpen && !voiceMode) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, voiceMode]);

  const resumeConversationListening = useCallback(() => {
    if (!voiceMode || isLoadingRef.current || pendingVoiceSendRef.current) return;
    allowListenRestart();
    void startListening();
    scheduleListenRestart(900);
  }, [voiceMode, scheduleListenRestart, allowListenRestart, startListening]);

  useEffect(() => {
    localStorage.setItem(SPEAK_RESPONSES_KEY, speakResponses ? '1' : '0');
  }, [speakResponses]);

  const endConversation = useCallback(() => {
    voiceIntroSpokenRef.current = false;
    voiceModeRef.current = false;
    setVoiceMode(false);
    stopListening();
    stopSpeaking();
  }, [stopListening, stopSpeaking]);

  const startConversation = useCallback(async () => {
    voiceModeRef.current = true;
    setVoiceMode(true);
    setSpeakResponses(true);
    primeMobileSpeechOnGesture(mascot.voiceProfile);
    primeSpeechSynthesis();

    const micOk = await primeMicOnGesture();
    if (!micOk) return;

    // No re-leer mensajes viejos al activar voz.
    const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      lastSpokenIdRef.current = lastAssistant.id;
    }

    const openMic = () => {
      allowListenRestart();
      void startListening();
      scheduleListenRestart(800);
    };

    if (voiceIntroSpokenRef.current) {
      openMic();
      return;
    }
    voiceIntroSpokenRef.current = true;
    const intro = toSpeech(buildChatGreeting(mascotDashboard, userName, true));
    if (intro.trim()) {
      speak(intro, openMic);
    } else {
      openMic();
    }
  }, [
    speak,
    userName,
    mascotDashboard,
    mascot.voiceProfile,
    scheduleListenRestart,
    allowListenRestart,
    toSpeech,
    primeMicOnGesture,
    startListening,
  ]);

  const handleRetryMic = useCallback(async () => {
    const micOk = await primeMicOnGesture();
    if (!micOk) return;
    allowListenRestart();
    await startListening();
  }, [primeMicOnGesture, allowListenRestart, startListening]);

  const prevVoiceModeRef = useRef(false);
  useEffect(() => {
    const wasOn = prevVoiceModeRef.current;
    prevVoiceModeRef.current = voiceMode;
    if (voiceMode && !wasOn) {
      allowListenRestart();
      scheduleListenRestart(600);
    }
  }, [voiceMode, allowListenRestart, scheduleListenRestart]);

  useEffect(() => {
    if (!voiceMode || micBlocked || isListening || isSpeaking || isLoading || pendingVoiceSendRef.current) {
      return;
    }
    const watchdog = window.setTimeout(() => {
      if (!voiceModeRef.current || isLoadingRef.current || pendingVoiceSendRef.current) return;
      allowListenRestart();
      void startListening();
    }, 2800);
    return () => window.clearTimeout(watchdog);
  }, [
    voiceMode,
    micBlocked,
    isListening,
    isSpeaking,
    isLoading,
    allowListenRestart,
    startListening,
  ]);

  useEffect(() => {
    if (!voiceMode) {
      stopListening();
    }
  }, [voiceMode, stopListening]);

  useEffect(() => {
    if (!isOpen && voiceMode) {
      endConversation();
    }
  }, [isOpen, voiceMode, endConversation]);

  useEffect(() => {
    if (isLoading) {
      stopListening();
    }
  }, [isLoading, stopListening]);

  useEffect(() => {
    if (isLoading || isSpeaking) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.id === lastSpokenIdRef.current) return;
    if (!last.content?.trim()) return;

    lastSpokenIdRef.current = last.id;

    if (speakResponses && ttsSupported) {
      const speechContent =
        last.pendingAction && (voiceMode || speakResponses)
          ? `${last.content} Di confirmar, cancelar o editar.`
          : last.content;
      const plain = toSpeech(speechContent);
      if (plain) {
        const start = () =>
          speak(plain, () => {
            if (voiceMode) resumeConversationListening();
          });
        if (voiceReady) start();
        else setTimeout(start, 300);
        return;
      }
    }

    if (voiceMode) {
      resumeConversationListening();
    }
  }, [
    messages,
    isLoading,
    isSpeaking,
    speakResponses,
    ttsSupported,
    voiceReady,
    voiceMode,
    speak,
    toSpeech,
    resumeConversationListening,
  ]);

  useEffect(() => {
    if (wasSpeakingRef.current && !isSpeaking && voiceMode && !isLoading && !pendingVoiceSendRef.current) {
      resumeConversationListening();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, voiceMode, isLoading, resumeConversationListening]);

  const toggleSpeakResponses = () => {
    setSpeakResponses((on) => {
      const next = !on;
      if (!next) stopSpeaking();
      return next;
    });
  };

  const toggleVoiceMode = () => {
    if (voiceMode) endConversation();
    else void startConversation();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    stopListening();
    const text = input;
    setInput('');
    await sendMessage(text, (voiceMode || speakResponses) ? { voiceMode: true } : undefined);
  };

  const performResetMemory = useCallback(() => {
    lastSpokenIdRef.current = null;
    voiceIntroSpokenRef.current = false;
    endConversation();
    resetMemory();
  }, [endConversation, resetMemory]);

  const handleResetMemory = () => {
    if (messages.length === 0) {
      performResetMemory();
      return;
    }
    setShowResetDialog(true);
  };

  const inputPlaceholder = isListening
    ? 'Escuchando… habla cuando quieras'
    : isSpeaking
      ? `${mascot.name} está respondiendo…`
      : voiceMode
        ? 'Conversación abierta — solo habla'
        : 'Pregúntame lo que quieras…';

  return (
    <>
      <PetBuddyResetMemoryDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={performResetMemory}
        messageCount={messages.length}
        guideName={mascot.name}
        guideImage={mascot.image}
      />
      <div
        className={cn(
          'fixed z-[90] flex flex-col overflow-hidden transition-all duration-300 ease-out',
          'bg-white border border-gray-100 shadow-2xl',
          'rounded-2xl sm:rounded-3xl',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
          centeredPanel
            ? 'left-1/2 -translate-x-1/2 bottom-[calc(5.75rem+env(safe-area-inset-bottom))]'
            : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4',
          'w-[calc(100vw-2rem)] max-w-[380px] h-[min(70vh,520px)]'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-landing-aqua text-white shrink-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/40">
            <img src={mascot.image} alt={mascot.name} className="h-full w-full object-cover" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-landing-mint border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{mascot.name}</p>
            <p className="text-[11px] text-white/80 truncate">
              {agentMode
                ? 'Modo agente (beta) — conversación libre'
                : isSpeaking
                ? 'Hablando…'
                : voiceMode
                  ? isListening
                    ? 'Te escucho…'
                    : 'Conversación abierta'
                  : speakResponses
                    ? 'Respuestas en voz alta'
                    : 'Tu asistente inteligente'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAgentMode(!agentMode)}
            title={
              agentMode
                ? 'Desactivar modo agente (volver al asistente clásico)'
                : 'Activar modo agente (beta): conversación libre + acceso a tablas'
            }
            className={cn(
              'p-2 rounded-full transition-colors',
              agentMode ? 'bg-white/30 ring-2 ring-white/50' : 'hover:bg-white/20',
            )}
            aria-label={agentMode ? 'Desactivar modo agente' : 'Activar modo agente'}
          >
            <Bot className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleSpeakResponses}
            disabled={!ttsSupported}
            title={
              ttsSupported
                ? speakResponses
                  ? 'Silenciar respuestas habladas'
                  : 'Activar respuestas habladas'
                : 'Audio no disponible en este navegador'
            }
            className={cn(
              'p-2 rounded-full transition-colors',
              speakResponses ? 'bg-white/30 ring-2 ring-white/50' : 'hover:bg-white/20',
              !ttsSupported && 'opacity-40 cursor-not-allowed'
            )}
            aria-label={speakResponses ? 'Silenciar respuestas' : 'Activar respuestas habladas'}
          >
            {speakResponses ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={toggleVoiceMode}
            disabled={!sttSupported}
            title={
              sttSupported
                ? voiceMode
                  ? 'Finalizar conversación por voz'
                  : 'Iniciar conversación abierta (habla sin pulsar cada vez)'
                : 'Micrófono no disponible en este navegador'
            }
            className={cn(
              'p-2 rounded-full transition-colors',
              voiceMode ? 'bg-white/30 ring-2 ring-white/50' : 'hover:bg-white/20',
              !sttSupported && 'opacity-40 cursor-not-allowed'
            )}
            aria-label={voiceMode ? 'Finalizar conversación' : 'Iniciar conversación abierta'}
          >
            {voiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleResetMemory}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Resetear memoria del chat"
            aria-label="Resetear memoria"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {voiceMode ? (
          <div
            className={cn(
              'shrink-0 px-3 py-2.5 border-b flex flex-col gap-1',
              micBlocked ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-100',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    micBlocked ? 'bg-amber-500' : 'bg-red-500 animate-pulse',
                  )}
                />
                <p
                  className={cn(
                    'text-xs font-medium truncate',
                    micBlocked ? 'text-amber-900' : 'text-red-800',
                  )}
                >
                  {micBlocked
                    ? 'Micrófono bloqueado en el navegador'
                    : isListening
                      ? 'Te escucho — habla con naturalidad'
                      : isSpeaking
                        ? 'Respondiendo en voz alta…'
                        : isLoading
                          ? 'Pensando…'
                          : 'Conversación abierta — activando micrófono…'}
                </p>
              </div>
              <button
                type="button"
                onClick={endConversation}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Finalizar
              </button>
            </div>
            {micBlocked ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-amber-900/90 leading-snug">
                  {isMobileBrowser()
                    ? 'Ve a Ajustes del navegador y permite el micrófono para este sitio.'
                    : 'En Chrome: clic en el ícono del candado o micrófono en la barra de dirección → Micrófono → Permitir. Luego pulsa «Activar micrófono».'}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRetryMic()}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  Activar micrófono
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-red-700/90 leading-snug">
                {isMobileBrowser()
                  ? isIosSafari()
                    ? 'Voz en español latino (Paulina). Habla claro y cerca del micrófono.'
                    : 'Voz en español. Habla pausado y cerca del micrófono.'
                  : 'Si no te escucha, revisa que Chrome tenga permiso de micrófono para localhost.'}
              </p>
            )}
          </div>
        ) : (
          sttSupported && (
            <div className="shrink-0 px-3 py-2 border-b bg-landing-tropical/20 border-landing-tropical/35">
              <button
                type="button"
                onClick={() => void startConversation()}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-landing-mango-dark py-2 rounded-xl bg-white/70 hover:bg-white transition-colors"
              >
                <Mic className="w-4 h-4" />
                Iniciar conversación por voz
              </button>
              <p className="text-[10px] text-center text-gray-500 mt-1">
                Habla sin pulsar el micrófono cada vez. Tú cierras cuando quieras.
              </p>
            </div>
          )
        )}

        {(speakResponses && !voiceMode) && ttsSupported && (
          <div className="shrink-0 px-3 py-2 text-xs border-b bg-landing-mint/15 text-landing-mint-dark border-landing-mint/25 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            Las respuestas se leen en voz alta
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {displayMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-landing-mango text-gray-900 rounded-br-md'
                    : 'bg-white text-gray-700 border border-landing-tropical/25 rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' ? renderMarkdownLite(msg.content) : msg.content}
                {msg.role === 'assistant' && ttsSupported && speakResponses && !voiceMode && (
                  <button
                    type="button"
                    onClick={() => speak(toSpeech(msg.content))}
                    className="mt-2 flex items-center gap-1 text-[11px] text-landing-aqua-dark hover:underline"
                    aria-label="Escuchar de nuevo"
                  >
                    <Volume2 className="w-3 h-3" />
                    Escuchar
                  </button>
                )}
                {msg.actionLink && (
                  <Link
                    to={msg.actionLink.path}
                    onClick={() => setIsOpen(false)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-landing-mint-dark hover:underline"
                  >
                    {msg.actionLink.label}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                {msg.pendingAction?.status !== 'cancelled' && msg.pendingAction && (
                  <PetBuddyActionConfirmCard
                    action={msg.pendingAction}
                    loading={confirmingMessageId === msg.id}
                    onConfirm={async () => {
                      setConfirmingMessageId(msg.id);
                      try {
                        await confirmPendingAction(msg.id, msg.pendingAction!);
                      } finally {
                        setConfirmingMessageId(null);
                      }
                    }}
                    onEdit={() => {
                      cancelPendingAction(msg.id);
                      setInput(buildEditPrompt(msg.pendingAction!));
                      inputRef.current?.focus();
                    }}
                    onCancel={() => cancelPendingAction(msg.id)}
                  />
                )}
                {msg.productRecommendations && msg.productRecommendations.length > 0 && (
                  <PetBuddyProductRecommendationCards
                    recommendations={msg.productRecommendations}
                    onAddToCart={addProductRecommendationToCart}
                    onCloseChat={() => setIsOpen(false)}
                  />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-landing-mint/20 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn('w-2 h-2 rounded-full animate-bounce', LOADING_DOT_COLORS[i])}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && !isLoading && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  void sendMessage(prompt, (voiceMode || speakResponses) ? { voiceMode: true } : undefined);
                }}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                  QUICK_PROMPT_CHIP_STYLES[index % QUICK_PROMPT_CHIP_STYLES.length],
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-landing-aqua/15 bg-white"
          lang="es"
        >
          <input
            ref={inputRef}
            type="text"
            lang="es"
            inputMode={voiceMode || isListening ? 'none' : 'text'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={!voiceMode && !isListening}
            readOnly={voiceMode || isListening}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={isLoading}
            className="flex-1 min-w-0 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-landing-mango/40 focus:border-landing-mango/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isListening}
            className="shrink-0 w-10 h-10 rounded-full bg-landing-mint text-gray-900 flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {!hideFloatingTrigger && (
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? `Cerrar ${mascot.name}` : `Abrir ${mascot.name}`}
        className={cn(
          'fixed z-[85] right-4 flex items-center justify-center bg-transparent',
          'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]',
          'transition-all duration-300 active:scale-95',
          isOpen ? 'w-12 h-12' : 'w-[4.5rem] h-[4.5rem]'
        )}
      >
        {isOpen ? (
          <div className="w-12 h-12 rounded-full bg-landing-mango text-gray-900 shadow-lg hover:shadow-xl flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
        ) : (
          <div className="relative w-full h-full bg-transparent animate-[petBuddyPulse_3s_ease-in-out_infinite]">
            <img
              src={mascot.image}
              alt={mascot.name}
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            />
            <Sparkles className="absolute -top-0.5 -right-0.5 w-4 h-4 text-landing-tropical drop-shadow pointer-events-none" />
          </div>
        )}
      </button>
      )}

      <style>{`
        @keyframes petBuddyPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 16px rgba(0, 240, 200, 0.35)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 6px 22px rgba(0, 240, 200, 0.5)); }
        }
      `}</style>
    </>
  );
};

export default PetBuddyWidget;
