import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, ConversationTurn } from '../types';
import { callOpenAiViaEdge } from '../llm/edgeOpenAi';

export interface PetBuddyFact {
  id: string;
  pet_id: string | null;
  pet_name?: string | null;
  fact_text: string;
  category: string;
}

const SUMMARY_EVERY_N_MESSAGES = 16;

export async function loadPetBuddyFacts(userId: string): Promise<PetBuddyFact[]> {
  const { data, error } = await supabase
    .from('pet_buddy_facts')
    .select('id, pet_id, fact_text, category, pets(name)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(40);

  if (error) {
    console.warn('[PetBuddy] load facts failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    pet_id: row.pet_id,
    pet_name: (row.pets as { name: string } | null)?.name ?? null,
    fact_text: row.fact_text,
    category: row.category,
  }));
}

export async function loadConversationSummary(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('pet_buddy_summaries')
    .select('summary_text')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[PetBuddy] load summary failed:', error.message);
    return null;
  }

  const text = data?.summary_text?.trim();
  return text || null;
}

export function formatMemoryForPrompt(facts: PetBuddyFact[], summary: string | null): string {
  const parts: string[] = [];

  if (summary) {
    parts.push(`RESUMEN DE CONVERSACIONES ANTERIORES:\n${summary}`);
  }

  if (facts.length > 0) {
    const factLines = facts.map((f) => {
      const who = f.pet_name ? `**${f.pet_name}**` : 'General';
      return `• ${who} (${f.category}): ${f.fact_text}`;
    });
    parts.push(`HECHOS RECORDADOS SOBRE EL USUARIO Y SUS MASCOTAS:\n${factLines.join('\n')}`);
  }

  if (parts.length === 0) return '';
  return `\nMEMORIA A LARGO PLAZO:\n${parts.join('\n\n')}\nUsa estos hechos cuando sean relevantes. Si el usuario corrige un hecho, usa memory_save_fact para actualizar.\n`;
}

export async function savePetBuddyFact(
  userId: string,
  factText: string,
  options: { petId?: string | null; category?: string } = {},
): Promise<{ success: boolean; id?: string; error?: string }> {
  const trimmed = factText.trim();
  if (!trimmed) return { success: false, error: 'Fact vacío' };

  const { data, error } = await supabase
    .from('pet_buddy_facts')
    .insert({
      user_id: userId,
      pet_id: options.petId ?? null,
      fact_text: trimmed,
      category: options.category ?? 'general',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function deletePetBuddyFact(userId: string, factId: string): Promise<boolean> {
  const { error } = await supabase
    .from('pet_buddy_facts')
    .delete()
    .eq('user_id', userId)
    .eq('id', factId);
  return !error;
}

export async function clearPetBuddyMemory(userId: string): Promise<void> {
  await Promise.all([
    supabase.from('pet_buddy_facts').delete().eq('user_id', userId),
    supabase.from('pet_buddy_summaries').delete().eq('user_id', userId),
  ]);
}

const REMEMBER_PATTERN =
  /\b(recuerda|recuerdas|no olvides|anota que|guarda que|memoriza)\b[:\s]+(.+)/i;

/** Auto-extract explicit "remember this" statements from user messages. */
export async function tryAutoSaveFactFromMessage(
  userId: string,
  message: string,
  petNames: string[] = [],
): Promise<boolean> {
  const match = message.match(REMEMBER_PATTERN);
  if (!match?.[2]) return false;

  let factText = match[2].trim().replace(/[.!?]+$/, '');
  if (factText.length < 4 || factText.length > 500) return false;

  let petId: string | null = null;
  for (const name of petNames) {
    if (factText.toLowerCase().includes(name.toLowerCase())) {
      const { data } = await supabase
        .from('pets')
        .select('id')
        .eq('owner_id', userId)
        .ilike('name', name)
        .maybeSingle();
      if (data?.id) petId = data.id;
      break;
    }
  }

  let category = 'general';
  if (/\b(al[eé]rgi|alergia)\b/i.test(factText)) category = 'allergy';
  else if (/\b(no le gusta|prefiere|le encanta)\b/i.test(factText)) category = 'preference';
  else if (/\b(medicina|medicamento|tratamiento)\b/i.test(factText)) category = 'medical';

  const result = await savePetBuddyFact(userId, factText, { petId, category });
  return result.success;
}

export async function enrichContextWithMemory(
  ctx: AiExecutionContext,
): Promise<AiExecutionContext> {
  if (!ctx.userId) return ctx;
  try {
    const [facts, summary] = await Promise.all([
      loadPetBuddyFacts(ctx.userId),
      loadConversationSummary(ctx.userId),
    ]);
    return {
      ...ctx,
      memoryFacts: facts.map((f) => ({
        pet_name: f.pet_name,
        fact_text: f.fact_text,
        category: f.category,
      })),
      conversationSummary: summary ?? undefined,
    };
  } catch {
    return ctx;
  }
}

export async function maybeUpdateConversationSummary(
  userId: string,
  history: ConversationTurn[],
  totalMessageCount: number,
): Promise<void> {
  if (totalMessageCount < SUMMARY_EVERY_N_MESSAGES) return;
  if (totalMessageCount % SUMMARY_EVERY_N_MESSAGES !== 0) return;

  const recent = history.slice(-SUMMARY_EVERY_N_MESSAGES);
  const transcript = recent
    .map((t) => `${t.role === 'user' ? 'Usuario' : 'Asistente'}: ${t.content.slice(0, 400)}`)
    .join('\n');

  try {
    const existing = await loadConversationSummary(userId);
    const json = await callOpenAiViaEdge({
      messages: [
        {
          role: 'system',
          content:
            'Resume conversaciones de PetBuddy en español. Máximo 6 oraciones. Conserva nombres de mascotas, temas tratados y preferencias del usuario. Sin markdown.',
        },
        {
          role: 'user',
          content: existing
            ? `Resumen previo:\n${existing}\n\nNuevos mensajes:\n${transcript}\n\nActualiza el resumen integrando lo nuevo.`
            : `Resume estos mensajes:\n${transcript}`,
        },
      ],
      temperature: 0.3,
    });

    const summary = json.choices?.[0]?.message?.content?.trim();
    if (!summary) return;

    await supabase.from('pet_buddy_summaries').upsert(
      {
        user_id: userId,
        summary_text: summary,
        message_count: totalMessageCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  } catch (err) {
    console.warn('[PetBuddy] summary update failed:', err);
  }
}
