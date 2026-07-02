import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useUserProfile } from '@/hooks/useSettings';
import { askPetBuddy, executeConfirmedTool } from '@/ai/orchestrator';
import { askPetBuddyAgent } from '@/ai/agentOrchestrator';
import { maybeUpdateConversationSummary } from '@/ai/helpers/petBuddyMemory';
import {
  detectPendingActionIntent,
  findLatestPendingActionMessage,
} from '@/ai/actionConfirmation';
import type { PetBuddyMessage, PetBuddyPendingAction, PetBuddyCartAction, PetBuddyProductRecommendation } from '@/ai/types';
import { resolveProductByIdForCart } from '@/ai/helpers/cartActions';
import {
  clearPetBuddyChat,
  loadPetBuddyChat,
  savePetBuddyChat,
} from '@/lib/petBuddyChatStorage';
import { clearPetBuddyMemory } from '@/ai/helpers/petBuddyMemory';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const AGENT_MODE_KEY = 'petBuddyAgentMode';

interface PetBuddyContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  messages: PetBuddyMessage[];
  isLoading: boolean;
  providerId?: string;
  agentMode: boolean;
  setAgentMode: (enabled: boolean) => void;
  sendMessage: (text: string, options?: { voiceMode?: boolean }) => Promise<void>;
  confirmPendingAction: (messageId: string, action: PetBuddyPendingAction) => Promise<void>;
  cancelPendingAction: (messageId: string) => void;
  addProductRecommendationToCart: (rec: PetBuddyProductRecommendation) => Promise<boolean>;
  resetMemory: () => void;
  /** @deprecated Use resetMemory */
  clearChat: () => void;
}

const PetBuddyContext = createContext<PetBuddyContextValue | null>(null);

function applyCartAction(addItem: ReturnType<typeof useCart>['addItem'], cartAction?: PetBuddyCartAction) {
  if (!cartAction || cartAction.action !== 'add' || !cartAction.item) return;
  const { quantity = 1, id, ...rest } = cartAction.item;
  addItem({ ...rest, id: id ?? `pb-${Date.now()}` }, quantity);
}

export const PetBuddyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { data: profile } = useUserProfile(user?.id);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<PetBuddyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const messagesRef = useRef<PetBuddyMessage[]>([]);
  const persistReadyRef = useRef(false);
  const [providerId, setProviderId] = useState<string | undefined>();
  const [agentMode, setAgentModeState] = useState(() => {
    try {
      return localStorage.getItem(AGENT_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setAgentMode = useCallback((enabled: boolean) => {
    setAgentModeState(enabled);
    try {
      localStorage.setItem(AGENT_MODE_KEY, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    persistReadyRef.current = false;
    if (!user?.id) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    void loadPetBuddyChat(user.id).then((loaded) => {
      if (cancelled) return;
      setMessages(loaded);
      messagesRef.current = loaded;
      persistReadyRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !user?.id) return;
    savePetBuddyChat(user.id, messages);
  }, [messages, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setProviderId(undefined);
      return;
    }

    supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setProviderId(data?.id));
  }, [user?.id]);

  const ctx = useMemo(
    () => ({
      userId: user?.id,
      userName: profile?.full_name ?? user?.email?.split('@')[0],
      userRole: profile?.role ?? localStorage.getItem('user_role') ?? 'client',
      currentPath: location.pathname,
      providerId,
    }),
    [user?.id, user?.email, profile?.full_name, profile?.role, location.pathname, providerId]
  );

  const confirmPendingAction = useCallback(
    async (messageId: string, action: PetBuddyPendingAction) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        const result = await executeConfirmedTool(action.toolName, action.params, ctx);
        applyCartAction(addItem, result.cartAction);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: result.message,
                  toolsUsed: result.toolsUsed,
                  actionLink: result.actionLink,
                  pendingAction: undefined,
                }
              : m
          )
        );
      } catch (err) {
        console.error('[PetBuddy] confirm action', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: 'No pude completar la acción. ¿Puedes intentar de nuevo?',
                  pendingAction: undefined,
                }
              : m
          )
        );
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [ctx, addItem]
  );

  const cancelPendingAction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              pendingAction: m.pendingAction
                ? { ...m.pendingAction, status: 'cancelled' as const }
                : undefined,
              content: `${m.content}\n\n_Acción cancelada._`,
            }
          : m
      )
    );
  }, []);

  const addProductRecommendationToCart = useCallback(
    async (rec: PetBuddyProductRecommendation): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        const result = await resolveProductByIdForCart(rec.productId, 1);
        if ('error' in result) return false;
        applyCartAction(addItem, { action: 'add', item: result.cartItem });
        return true;
      } catch (err) {
        console.error('[PetBuddy] add to cart', err);
        return false;
      }
    },
    [user?.id, addItem],
  );

  const sendMessage = useCallback(
    async (text: string, options?: { voiceMode?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || isLoadingRef.current) return;

      const userMsg: PetBuddyMessage = {
        id: uuidv4(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const pendingMsg = findLatestPendingActionMessage(messagesRef.current);
      const intent = pendingMsg?.pendingAction ? detectPendingActionIntent(trimmed) : null;

      if (intent === 'confirm' && pendingMsg?.pendingAction) {
        setMessages((prev) => [...prev, userMsg]);
        await confirmPendingAction(pendingMsg.id, pendingMsg.pendingAction);
        return;
      }

      if (intent === 'cancel' && pendingMsg?.pendingAction) {
        setMessages((prev) => [...prev, userMsg]);
        cancelPendingAction(pendingMsg.id);
        return;
      }

      if (intent === 'edit' && pendingMsg?.pendingAction) {
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === pendingMsg.id
              ? {
                  ...m,
                  pendingAction: m.pendingAction
                    ? { ...m.pendingAction, status: 'cancelled' as const }
                    : undefined,
                  content: `${m.content}\n\n_Preparando edición._`,
                }
              : m
          ),
          userMsg,
          {
            id: uuidv4(),
            role: 'assistant',
            content: '¿Qué quieres cambiar? Dime el dato nuevo, por ejemplo la duración o la intensidad.',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Nueva petición sustantiva: descartar todas las confirmaciones pendientes
      const hasPending = messagesRef.current.some(
        (m) => m.pendingAction?.status === 'pending',
      );
      if (hasPending) {
        const cleared = messagesRef.current.map((m) =>
          m.pendingAction?.status === 'pending' ? { ...m, pendingAction: undefined } : m,
        );
        messagesRef.current = cleared;
        setMessages(cleared);
      }

      const userMsgWithId = userMsg;
      messagesRef.current = [...messagesRef.current, userMsgWithId];
      setMessages((prev) => [...prev, userMsgWithId]);
      isLoadingRef.current = true;
      setIsLoading(true);

      const assistantId = uuidv4();
      const streamingPlaceholder: PetBuddyMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, streamingPlaceholder]);

      try {
        const history = messagesRef.current
          .filter((m) => m.id !== assistantId)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            toolsUsed: m.toolsUsed,
          }));

        const ask = agentMode ? askPetBuddyAgent : askPetBuddy;
        const response = await ask(
          trimmed,
          {
            ...ctx,
            voiceMode: options?.voiceMode,
            streamResponses: !options?.voiceMode,
            onStreamDelta: (_delta, fullText) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
              );
            },
          },
          history,
        );

        applyCartAction(addItem, response.cartAction);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: response.message,
                  toolsUsed: response.toolsUsed,
                  actionLink: response.actionLink,
                  pendingAction: response.pendingAction,
                  productRecommendations: response.productRecommendations,
                }
              : m,
          ),
        );

        if (user?.id) {
          void maybeUpdateConversationSummary(user.id, history, messagesRef.current.length);
        }
      } catch (err) {
        console.error('[PetBuddy]', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Ups, tuve un problema consultando los datos. ¿Puedes intentar de nuevo?',
                }
              : m,
          ),
        );
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [ctx, confirmPendingAction, cancelPendingAction, user?.id, addItem, agentMode]
  );

  const resetMemory = useCallback(() => {
    if (user?.id) {
      void clearPetBuddyChat(user.id);
      void clearPetBuddyMemory(user.id);
    }
    setMessages([]);
    messagesRef.current = [];
  }, [user?.id]);

  const clearChat = resetMemory;
  const toggle = useCallback(() => setIsOpen((o) => !o), []);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle,
      messages,
      isLoading,
      providerId,
      agentMode,
      setAgentMode,
      sendMessage,
      confirmPendingAction,
      cancelPendingAction,
      addProductRecommendationToCart,
      resetMemory,
      clearChat,
    }),
    [isOpen, messages, isLoading, providerId, agentMode, setAgentMode, sendMessage, confirmPendingAction, cancelPendingAction, addProductRecommendationToCart, resetMemory, clearChat, toggle]
  );

  return <PetBuddyContext.Provider value={value}>{children}</PetBuddyContext.Provider>;
};

export function usePetBuddy() {
  const context = useContext(PetBuddyContext);
  if (!context) {
    throw new Error('usePetBuddy must be used within PetBuddyProvider');
  }
  return context;
}
