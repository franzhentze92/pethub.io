import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRequest {
  messages: Array<{ role: string; content?: string; tool_calls?: unknown; tool_call_id?: string }>;
  tools?: unknown[];
  model?: string;
  temperature?: number;
  stream?: boolean;
  load_memory?: boolean;
}

function buildMemoryBlock(
  facts: Array<{ fact_text: string; category: string; pets?: { name: string } | null }>,
  summary: string | null,
): string {
  const parts: string[] = [];
  if (summary?.trim()) {
    parts.push(`RESUMEN DE CONVERSACIONES ANTERIORES:\n${summary.trim()}`);
  }
  if (facts.length > 0) {
    const lines = facts.map((f) => {
      const who = f.pets?.name ? `**${f.pets.name}**` : 'General';
      return `• ${who} (${f.category}): ${f.fact_text}`;
    });
    parts.push(`HECHOS RECORDADOS:\n${lines.join('\n')}`);
  }
  if (parts.length === 0) return '';
  return `\nMEMORIA A LARGO PLAZO (servidor):\n${parts.join('\n\n')}\n`;
}

async function loadServerMemory(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const [factsRes, summaryRes] = await Promise.all([
    supabase
      .from('pet_buddy_facts')
      .select('fact_text, category, pets(name)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(40),
    supabase.from('pet_buddy_summaries').select('summary_text').eq('user_id', userId).maybeSingle(),
  ]);

  return buildMemoryBlock(factsRes.data ?? [], summaryRes.data?.summary_text ?? null);
}

function augmentMessages(
  messages: AgentRequest['messages'],
  memoryBlock: string,
): AgentRequest['messages'] {
  if (!memoryBlock) return messages;
  const copy = [...messages];
  const systemIdx = copy.findIndex((m) => m.role === 'system');
  if (systemIdx >= 0) {
    copy[systemIdx] = {
      ...copy[systemIdx],
      content: `${copy[systemIdx].content ?? ''}${memoryBlock}`,
    };
  } else {
    copy.unshift({ role: 'system', content: memoryBlock.trim() });
  }
  return copy;
}

async function proxyOpenAi(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as AgentRequest;
    const {
      messages,
      tools,
      model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      temperature = 0.4,
      stream = false,
      load_memory = true,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let augmentedMessages = messages;
    let memoryLoaded = false;

    if (load_memory) {
      const memoryBlock = await loadServerMemory(supabase, user.id);
      if (memoryBlock) {
        augmentedMessages = augmentMessages(messages, memoryBlock);
        memoryLoaded = true;
      }
    }

    const openAiBody: Record<string, unknown> = {
      model,
      messages: augmentedMessages,
      temperature,
      stream,
    };

    if (Array.isArray(tools) && tools.length > 0) {
      openAiBody.tools = tools;
      openAiBody.tool_choice = 'auto';
    }

    const openAiRes = await proxyOpenAi(apiKey, openAiBody);

    if (!openAiRes.ok) {
      const errData = await openAiRes.json();
      return new Response(JSON.stringify({ error: errData }), {
        status: openAiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          };

          if (memoryLoaded) {
            send('memory', { loaded: true });
          }

          const reader = openAiRes.body?.getReader();
          if (!reader) {
            send('error', { message: 'No stream body' });
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';
          let fullContent = '';
          const toolCallsAcc: Record<number, { id: string; name: string; arguments: string }> = {};

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() ?? '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const payload = trimmed.slice(5).trim();
                if (payload === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(payload);
                  const delta = parsed.choices?.[0]?.delta;
                  if (!delta) continue;

                  if (delta.content) {
                    fullContent += delta.content;
                    send('delta', { content: delta.content, full: fullContent });
                  }

                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index ?? 0;
                      if (!toolCallsAcc[idx]) {
                        toolCallsAcc[idx] = {
                          id: tc.id ?? '',
                          name: tc.function?.name ?? '',
                          arguments: '',
                        };
                      }
                      if (tc.id) toolCallsAcc[idx].id = tc.id;
                      if (tc.function?.name) toolCallsAcc[idx].name = tc.function.name;
                      if (tc.function?.arguments) {
                        toolCallsAcc[idx].arguments += tc.function.arguments;
                      }
                    }
                  }
                } catch {
                  /* skip malformed chunks */
                }
              }
            }

            const toolCalls = Object.values(toolCallsAcc).filter((t) => t.id && t.name);
            send('done', {
              content: fullContent || undefined,
              tool_calls: toolCalls.length
                ? toolCalls.map((t) => ({
                    id: t.id,
                    type: 'function',
                    function: { name: t.name, arguments: t.arguments },
                  }))
                : undefined,
            });
          } catch (err) {
            send('error', {
              message: err instanceof Error ? err.message : String(err),
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const data = await openAiRes.json();
    return new Response(JSON.stringify({ ...data, memory_loaded: memoryLoaded }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
