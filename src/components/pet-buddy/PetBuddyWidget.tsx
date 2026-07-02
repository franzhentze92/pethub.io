import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Send, Sparkles, Trash2, ExternalLink, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { usePetBuddy } from '@/contexts/PetBuddyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useSettings';
import { usePetBuddyVoice } from '@/hooks/usePetBuddyVoice';
import { cn } from '@/lib/utils';
import { buildChatGreeting } from '@/lib/blueprint/blueprintMascots';
import { textForSpeech, PET_BUDDY_VOICE_LANG } from '@/lib/petBuddySpeech';
import { BLUEPRINT_MASCOTS, type BlueprintDashboard } from '@/lib/blueprint/blueprintMascots';
import { PetBuddyActionConfirmCard } from '@/components/pet-buddy/PetBuddyActionConfirmCard';
import { PetBuddyResetMemoryDialog } from '@/components/pet-buddy/PetBuddyResetMemoryDialog';
import { buildEditPrompt } from '@/ai/actionConfirmation';
import type { PetBuddyMessage } from '@/ai/types';

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
  const userRole = (profile?.role ?? localStorage.getItem('user_role') ?? 'client') as string;
  const mascotDashboard: BlueprintDashboard =
    userRole === 'provider' ? 'provider' : userRole === 'shelter' ? 'shelter' : 'client';
  const mascot = BLUEPRINT_MASCOTS[mascotDashboard];
  const { isOpen, setIsOpen, toggle, messages, isLoading, sendMessage, confirmPendingAction, cancelPendingAction, resetMemory } = usePetBuddy();
  const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
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

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const userName = profile?.full_name ?? user?.email?.split('@')[0];
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
      try {
        await sendMessage(text, { voiceMode: voiceMode || speakResponses });
      } finally {
        pendingVoiceSendRef.current = false;
      }
    },
    [sendMessage, voiceMode, speakResponses],
  );

  const {
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
  } = usePetBuddyVoice({
    lang: PET_BUDDY_VOICE_LANG,
    voiceProfile: mascot.voiceProfile,
    conversationMode: voiceMode,
    getKeepListening: () =>
      voiceMode && !isLoadingRef.current && !pendingVoiceSendRef.current,
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
    scheduleListenRestart(900);
  }, [voiceMode, scheduleListenRestart, allowListenRestart]);

  useEffect(() => {
    localStorage.setItem(SPEAK_RESPONSES_KEY, speakResponses ? '1' : '0');
  }, [speakResponses]);

  const endConversation = useCallback(() => {
    voiceIntroSpokenRef.current = false;
    setVoiceMode(false);
    stopListening();
    stopSpeaking();
  }, [stopListening, stopSpeaking]);

  const startConversation = useCallback(() => {
    setVoiceMode(true);
    setSpeakResponses(true);
    if (voiceIntroSpokenRef.current) {
      allowListenRestart();
      scheduleListenRestart(600);
      return;
    }
    voiceIntroSpokenRef.current = true;
    const intro = textForSpeech(buildChatGreeting(mascotDashboard, userName, true));
    speak(intro);
  }, [speak, userName, mascotDashboard, scheduleListenRestart, allowListenRestart]);

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

    lastSpokenIdRef.current = last.id;

    if (speakResponses && ttsSupported) {
      const speechContent =
        last.pendingAction && (voiceMode || speakResponses)
          ? `${last.content} Di confirmar, cancelar o editar.`
          : last.content;
      const plain = textForSpeech(speechContent);
      if (plain) {
        const start = () => speak(plain);
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
    else startConversation();
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
          'bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl',
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
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-landing-aqua via-landing-mint to-landing-mango text-white shrink-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/30">
            <img src={mascot.image} alt={mascot.name} className="h-full w-full object-cover" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{mascot.name}</p>
            <p className="text-[11px] text-white/80 truncate">
              {isSpeaking
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
          <div className="shrink-0 px-3 py-2.5 border-b bg-red-50 border-red-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <p className="text-xs text-red-800 font-medium truncate">
                {isListening
                  ? 'Te escucho — habla con naturalidad'
                  : isSpeaking
                    ? 'Respondiendo en voz alta…'
                    : isLoading
                      ? 'Pensando…'
                      : 'Conversación abierta — el micrófono sigue activo'}
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
        ) : (
          sttSupported && (
            <div className="shrink-0 px-3 py-2 border-b bg-landing-aqua/5 border-landing-aqua/15">
              <button
                type="button"
                onClick={startConversation}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-landing-aqua-dark py-2 rounded-xl hover:bg-landing-aqua/10 transition-colors"
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
          <div className="shrink-0 px-3 py-2 text-xs border-b bg-purple-50/50 text-purple-800 border-purple-100 flex items-center gap-2">
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
                    ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white rounded-br-md'
                    : 'bg-gray-50 text-gray-700 border border-gray-100 rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' ? renderMarkdownLite(msg.content) : msg.content}
                {msg.role === 'assistant' && ttsSupported && speakResponses && !voiceMode && (
                  <button
                    type="button"
                    onClick={() => speak(textForSpeech(msg.content))}
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
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-landing-aqua-dark hover:underline"
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
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-landing-aqua animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && !isLoading && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  void sendMessage(prompt, (voiceMode || speakResponses) ? { voiceMode: true } : undefined);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-landing-aqua/10 text-landing-aqua-dark border border-landing-aqua/20 hover:bg-landing-aqua/20 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white/80"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={isLoading || isListening}
            className="flex-1 min-w-0 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-landing-aqua/40 focus:border-landing-aqua/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isListening}
            className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint text-white flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-40"
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-landing-aqua via-landing-mint to-landing-mango shadow-lg hover:shadow-xl flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
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
