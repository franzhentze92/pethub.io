import type { PetBuddyMessage } from '@/ai/types';
import { supabase } from '@/lib/supabase';

const STORAGE_VERSION = 'v1';
const MAX_STORED_MESSAGES = 80;

type StoredMessage = Omit<PetBuddyMessage, 'timestamp'> & { timestamp: string };

function storageKey(userId: string): string {
  return `petbuddy_chat_${STORAGE_VERSION}_${userId}`;
}

function serialize(messages: PetBuddyMessage[]): StoredMessage[] {
  return messages.slice(-MAX_STORED_MESSAGES).map((m) => ({
    ...m,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : new Date(m.timestamp).toISOString(),
  }));
}

function deserialize(stored: StoredMessage[]): PetBuddyMessage[] {
  return stored.map((m) => ({
    ...m,
    timestamp: new Date(m.timestamp),
  }));
}

function loadFromLocalStorage(userId: string): PetBuddyMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredMessage[];
    if (!Array.isArray(parsed)) return [];
    return deserialize(parsed);
  } catch {
    return [];
  }
}

function saveToLocalStorage(userId: string, messages: PetBuddyMessage[]): void {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(storageKey(userId));
      return;
    }
    localStorage.setItem(storageKey(userId), JSON.stringify(serialize(messages)));
  } catch (err) {
    console.warn('[PetBuddy] No se pudo guardar el historial local:', err);
  }
}

/** Load chat from Supabase (primary) with localStorage fallback and merge. */
export async function loadPetBuddyChat(userId: string): Promise<PetBuddyMessage[]> {
  const localMessages = loadFromLocalStorage(userId);

  try {
    const { data, error } = await supabase
      .from('pet_buddy_conversations')
      .select('messages, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[PetBuddy] No se pudo cargar historial remoto:', error.message);
      return localMessages;
    }

    if (!data?.messages || !Array.isArray(data.messages)) {
      if (localMessages.length > 0) {
        await syncPetBuddyChatToRemote(userId, localMessages);
      }
      return localMessages;
    }

    const remoteMessages = deserialize(data.messages as StoredMessage[]);

    if (remoteMessages.length === 0) {
      if (localMessages.length > 0) {
        await syncPetBuddyChatToRemote(userId, localMessages);
        return localMessages;
      }
      return [];
    }

    if (localMessages.length > remoteMessages.length) {
      await syncPetBuddyChatToRemote(userId, localMessages);
      saveToLocalStorage(userId, localMessages);
      return localMessages;
    }

    saveToLocalStorage(userId, remoteMessages);
    return remoteMessages;
  } catch (err) {
    console.warn('[PetBuddy] Error cargando historial:', err);
    return localMessages;
  }
}

/** Persist to localStorage and Supabase. */
export function savePetBuddyChat(userId: string, messages: PetBuddyMessage[]): void {
  saveToLocalStorage(userId, messages);
  void syncPetBuddyChatToRemote(userId, messages);
}

async function syncPetBuddyChatToRemote(userId: string, messages: PetBuddyMessage[]): Promise<void> {
  try {
    if (messages.length === 0) {
      await supabase.from('pet_buddy_conversations').delete().eq('user_id', userId);
      return;
    }

    const payload = serialize(messages);
    const { error } = await supabase.from('pet_buddy_conversations').upsert(
      {
        user_id: userId,
        messages: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      console.warn('[PetBuddy] No se pudo sincronizar historial remoto:', error.message);
    }
  } catch (err) {
    console.warn('[PetBuddy] Error sincronizando historial:', err);
  }
}

export async function clearPetBuddyChat(userId: string): Promise<void> {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }

  try {
    await supabase.from('pet_buddy_conversations').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('[PetBuddy] No se pudo limpiar historial remoto:', err);
  }
}
