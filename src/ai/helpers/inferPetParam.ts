import type { ConversationTurn } from '../types';
import { extractMentionedNames } from '../conversationContext';
import { wantsAllPets } from './petResolver';

export function inferUserPetNameFromMessage(
  message: string,
  userPetNames?: string[],
): string | undefined {
  if (!userPetNames?.length) return undefined;
  const lower = message.toLowerCase();
  const sorted = [...userPetNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  return undefined;
}

export function inferPetNameParam(
  message: string,
  history: ConversationTurn[] = [],
  userPetNames?: string[],
): string | undefined {
  if (wantsAllPets(message)) return 'todos';

  const fromUserPets = inferUserPetNameFromMessage(message, userPetNames);
  if (fromUserPets) return fromUserPets;

  const withPet = message.match(/\bcon\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+)\b/i);
  if (withPet) {
    const raw = withPet[1];
    if (userPetNames?.length) {
      const match = userPetNames.find((n) => n.toLowerCase() === raw.toLowerCase());
      if (match) return match;
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  const names = extractMentionedNames(history, message);
  const petName = names[names.length - 1];
  return petName || undefined;
}
