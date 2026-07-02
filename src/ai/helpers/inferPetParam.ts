import type { ConversationTurn } from '../types';
import { extractMentionedNames } from '../conversationContext';
import { wantsAllPets } from './petResolver';
import { fuzzyMatchPetName } from './petNameFuzzy';

const PET_NAME_STOPWORDS = new Set([
  'comida',
  'alimento',
  'alimentacion',
  'alimentación',
  'salud',
  'semana',
  'ultima',
  'última',
  'mes',
  'dia',
  'día',
  'historial',
  'gramos',
  'calorias',
  'calorías',
  'nutricion',
  'nutrición',
  'ejercicio',
  'veterinaria',
  'mascota',
  'mascotas',
  'perro',
  'perros',
  'gato',
  'gatos',
  'busca',
  'buscar',
  'marketplace',
  'producto',
  'productos',
  'tienda',
  'ideal',
  'comprar',
  'compra',
]);

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
  return fuzzyMatchPetName(message, userPetNames);
}

function extractPetNamesFromAssistantList(history: ConversationTurn[]): string[] {
  const names: string[] = [];
  for (const turn of [...history].reverse()) {
    if (turn.role !== 'assistant') continue;
    const listMatch = turn.content.match(/Tienes:\s*([^.?\n]+)/i);
    if (!listMatch) continue;
    for (const part of listMatch[1].split(/[,;]/)) {
      const name = part.replace(/\*\*/g, '').trim();
      if (name && /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ][\wáéíóúñüÁÉÍÓÚÑÜ-]*$/i.test(name)) {
        names.push(name);
      }
    }
    if (names.length > 0) break;
  }
  return names;
}

export function inferPetNameParam(
  message: string,
  history: ConversationTurn[] = [],
  userPetNames?: string[],
): string | undefined {
  if (wantsAllPets(message)) return 'todos';

  const trimmed = message.trim();
  const knownPets = [
    ...(userPetNames ?? []),
    ...extractPetNamesFromAssistantList(history),
  ];
  const uniquePets = [...new Set(knownPets)];

  if (uniquePets.length > 0) {
    const fromUserPets = inferUserPetNameFromMessage(trimmed, uniquePets);
    if (fromUserPets) return fromUserPets;

    if (trimmed.split(/\s+/).length <= 3) {
      const fuzzy = fuzzyMatchPetName(trimmed, uniquePets);
      if (fuzzy) return fuzzy;
    }
  }

  // "de atis" / "para sasha" al final de la frase
  const trailingPet = trimmed.match(
    /\b(?:de|para)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ][\wáéíóúñüÁÉÍÓÚÑ-]*)\s*$/i,
  );
  if (trailingPet && uniquePets.length) {
    const raw = trailingPet[1];
    if (!PET_NAME_STOPWORDS.has(raw.toLowerCase())) {
      const match = fuzzyMatchPetName(raw, uniquePets);
      if (match) return match;
    }
  }

  const dePet = trimmed.match(/\b(?:de|para|del|de la)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ][\wáéíóúñüÁÉÍÓÚÑ-]*)/i);
  if (dePet) {
    const raw = dePet[1];
    const rawLower = raw.toLowerCase();
    if (!PET_NAME_STOPWORDS.has(rawLower)) {
      if (uniquePets.length) {
        const match = fuzzyMatchPetName(raw, uniquePets);
        if (match) return match;
      }
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }
  }

  const withPet = trimmed.match(/\bcon\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+)\b/i);
  if (withPet) {
    const raw = withPet[1];
    if (uniquePets.length) {
      const match = fuzzyMatchPetName(raw, uniquePets);
      if (match) return match;
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  const names = extractMentionedNames(history, message);
  const petName = names[names.length - 1];
  if (petName && uniquePets.length) {
    const match = fuzzyMatchPetName(petName, uniquePets);
    if (match) return match;
  }
  if (petName) return petName;

  if (uniquePets.length > 0) {
    for (const turn of [...history].reverse()) {
      if (turn.role !== 'user') continue;
      const fromHistory = inferUserPetNameFromMessage(turn.content, uniquePets);
      if (fromHistory) return fromHistory;
    }
    for (const turn of [...history].reverse()) {
      if (turn.role !== 'assistant') continue;
      const fromAssistant = inferUserPetNameFromMessage(turn.content, uniquePets);
      if (fromAssistant) return fromAssistant;
    }
  }

  return undefined;
}
