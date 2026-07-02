import { supabase } from '@/lib/supabase';

export interface OpenAiChatMessage {
  role: string;
  content?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface OpenAiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAiCompletionResponse {
  choices?: Array<{
    message?: OpenAiChatMessage;
  }>;
  error?: unknown;
  memory_loaded?: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('No autenticado');
  }
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
}

function agentUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pet-buddy-agent`;
}

function parseSseEvents(
  chunk: string,
  onEvent: (event: string, data: unknown) => void,
): string {
  const parts = chunk.split('\n\n');
  const remainder = parts.pop() ?? '';

  for (const part of parts) {
    const lines = part.split('\n');
    let event = 'message';
    let dataStr = '';
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) dataStr = line.slice(5).trim();
    }
    if (dataStr) {
      try {
        onEvent(event, JSON.parse(dataStr));
      } catch {
        /* ignore */
      }
    }
  }

  return remainder;
}

export interface AgentCallOptions {
  messages: OpenAiChatMessage[];
  tools?: OpenAiToolDefinition[];
  model?: string;
  temperature?: number;
  stream?: boolean;
  loadMemory?: boolean;
  onDelta?: (delta: string, fullText: string) => void;
}

/**
 * PetBuddy agent edge function — loads server-side memory and supports streaming.
 */
export async function callPetBuddyAgent(
  params: AgentCallOptions,
): Promise<OpenAiCompletionResponse> {
  const headers = await getAuthHeaders();
  const body = {
    messages: params.messages,
    tools: params.tools,
    model: params.model ?? 'gpt-4o-mini',
    temperature: params.temperature ?? 0.4,
    stream: params.stream ?? false,
    load_memory: params.loadMemory !== false,
  };

  if (params.stream) {
    const res = await fetch(agentUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(typeof err.error === 'string' ? err.error : JSON.stringify(err));
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream from pet-buddy-agent');

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let toolCalls: OpenAiChatMessage['tool_calls'];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseSseEvents(buffer, (event, data) => {
        const payload = data as Record<string, unknown>;
        if (event === 'delta' && typeof payload.content === 'string') {
          fullContent = String(payload.full ?? fullContent + payload.content);
          params.onDelta?.(payload.content, fullContent);
        }
        if (event === 'done') {
          if (payload.content) fullContent = String(payload.content);
          if (Array.isArray(payload.tool_calls)) {
            toolCalls = payload.tool_calls as OpenAiChatMessage['tool_calls'];
          }
        }
        if (event === 'error') {
          throw new Error(String(payload.message ?? 'Stream error'));
        }
      });
    }

    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: fullContent || undefined,
            tool_calls: toolCalls,
          },
        },
      ],
      memory_loaded: true,
    };
  }

  const { data, error } = await supabase.functions.invoke<OpenAiCompletionResponse>(
    'pet-buddy-agent',
    { body },
  );

  if (error) {
    throw new Error(error.message || 'Edge function pet-buddy-agent failed');
  }

  if (!data) {
    throw new Error('Empty response from pet-buddy-agent');
  }

  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  }

  return data;
}

/**
 * Legacy OpenAI proxy via pet-buddy (no server memory).
 */
export async function callOpenAiViaEdge(params: {
  messages: OpenAiChatMessage[];
  tools?: OpenAiToolDefinition[];
  model?: string;
  temperature?: number;
}): Promise<OpenAiCompletionResponse> {
  const { data, error } = await supabase.functions.invoke<OpenAiCompletionResponse>('pet-buddy', {
    body: {
      messages: params.messages,
      tools: params.tools,
      model: params.model ?? 'gpt-4o-mini',
      temperature: params.temperature ?? 0.4,
    },
  });

  if (error) {
    throw new Error(error.message || 'Edge function pet-buddy failed');
  }

  if (!data) {
    throw new Error('Empty response from pet-buddy edge function');
  }

  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  }

  return data;
}
