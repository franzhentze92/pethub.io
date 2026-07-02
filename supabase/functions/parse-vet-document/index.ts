import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DocumentType = 'lab_results' | 'invoice';

interface ParseRequest {
  session_id: string;
  document_url: string;
  document_type?: DocumentType;
  force_reparse?: boolean;
}

interface StructuredLabData {
  summary: string;
  patient_name?: string | null;
  test_date?: string | null;
  clinic_name?: string | null;
  findings?: Array<{
    name: string;
    value?: string | null;
    unit?: string | null;
    reference_range?: string | null;
    flag?: 'normal' | 'high' | 'low' | 'unknown' | null;
  }>;
  abnormal_highlights?: string[];
  vet_notes?: string | null;
  document_kind?: DocumentType;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseStoragePath(documentUrl: string): { bucket: string; path: string } | null {
  const markers = ['/storage/v1/object/public/', '/storage/v1/object/sign/'];
  for (const marker of markers) {
    const idx = documentUrl.indexOf(marker);
    if (idx === -1) continue;
    const rest = decodeURIComponent(documentUrl.slice(idx + marker.length).split('?')[0]);
    const slash = rest.indexOf('/');
    if (slash === -1) continue;
    return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
  }
  return null;
}

function isAllowedDocumentUrl(documentUrl: string, supabaseUrl: string, userId: string): boolean {
  try {
    const parsedUrl = new URL(documentUrl);
    const projectHost = new URL(supabaseUrl).host;
    if (parsedUrl.protocol !== 'https:') return false;
    if (parsedUrl.host !== projectHost && !parsedUrl.host.endsWith('.supabase.co')) return false;

    const storagePath = parseStoragePath(documentUrl);
    if (!storagePath) return false;
    if (storagePath.bucket !== 'veterinary-documents') return false;
    return storagePath.path.startsWith(`${userId}/`);
  } catch {
    return false;
  }
}

function guessMimeType(documentUrl: string, documentType: DocumentType): string {
  const lower = documentUrl.toLowerCase().split('?')[0];
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return documentType === 'invoice' ? 'image/jpeg' : 'application/pdf';
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (text ?? '').trim();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function extractTextWithVision(
  bytes: Uint8Array,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const base64 = bytesToBase64(bytes);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Extrae TODO el texto legible de este documento veterinario (resultados de laboratorio o factura). ' +
                'Devuelve solo el texto extraído, sin comentarios.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === 'object' ? JSON.stringify(data.error) : 'Vision OCR failed');
  }

  return String(data.choices?.[0]?.message?.content ?? '').trim();
}

async function structureVetDocument(
  rawText: string,
  documentType: DocumentType,
  apiKey: string,
): Promise<StructuredLabData> {
  const clipped = rawText.slice(0, 12000);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que resume documentos veterinarios para dueños de mascotas en Latinoamérica. ' +
            'NO diagnostiques ni recomiendes tratamientos. Solo organiza la información del documento. ' +
            'Responde JSON válido en español.',
        },
        {
          role: 'user',
          content:
            `Analiza este documento (${documentType}) y devuelve JSON con:\n` +
            `{\n` +
            `  "summary": "resumen breve en 2-4 oraciones para el dueño",\n` +
            `  "patient_name": string|null,\n` +
            `  "test_date": "YYYY-MM-DD"|null,\n` +
            `  "clinic_name": string|null,\n` +
            `  "findings": [{"name":"","value":"","unit":"","reference_range":"","flag":"normal|high|low|unknown"}],\n` +
            `  "abnormal_highlights": ["valores o hallazgos fuera de rango"],\n` +
            `  "vet_notes": string|null,\n` +
            `  "document_kind": "${documentType}"\n` +
            `}\n\n` +
            `Texto del documento:\n${clipped}`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === 'object' ? JSON.stringify(data.error) : 'OpenAI structuring failed');
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty structuring result');

  const parsed = JSON.parse(content) as StructuredLabData;
  if (!parsed.summary?.trim()) {
    parsed.summary = 'Documento procesado. Revisa los hallazgos con tu veterinario.';
  }
  parsed.document_kind = documentType;
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Supabase not configured' }, 500);
    }
    if (!openAiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization required' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as ParseRequest;
    const sessionId = body.session_id?.trim();
    const documentUrl = body.document_url?.trim();
    const documentType: DocumentType = body.document_type === 'invoice' ? 'invoice' : 'lab_results';
    const forceReparse = body.force_reparse === true;

    if (!sessionId || !documentUrl) {
      return jsonResponse({ error: 'session_id and document_url are required' }, 400);
    }

    if (!isAllowedDocumentUrl(documentUrl, supabaseUrl, user.id)) {
      return jsonResponse({ error: 'document_url not allowed' }, 403);
    }

    const { data: session, error: sessionError } = await userClient
      .from('veterinary_sessions')
      .select('id, owner_id, pet_id')
      .eq('id', sessionId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return jsonResponse({ error: 'Veterinary session not found' }, 404);
    }

    if (!forceReparse) {
      const { data: existing } = await userClient
        .from('vet_document_extractions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('document_url', documentUrl)
        .maybeSingle();

      if (existing?.parse_status === 'completed') {
        return jsonResponse({ success: true, extraction: existing });
      }
    }

    const upsertBase = {
      session_id: sessionId,
      owner_id: user.id,
      document_url: documentUrl,
      document_type: documentType,
      parse_status: 'processing',
      parse_error: null,
      updated_at: new Date().toISOString(),
    };

    const { data: processingRow, error: upsertError } = await userClient
      .from('vet_document_extractions')
      .upsert(upsertBase, { onConflict: 'session_id,document_url' })
      .select('*')
      .single();

    if (upsertError) throw upsertError;

    try {
      const fileRes = await fetch(documentUrl);
      if (!fileRes.ok) {
        throw new Error(`No se pudo descargar el documento (${fileRes.status})`);
      }

      const mimeType = fileRes.headers.get('content-type') ?? guessMimeType(documentUrl, documentType);
      const bytes = new Uint8Array(await fileRes.arrayBuffer());

      let rawText = '';
      if (mimeType.includes('pdf') || documentUrl.toLowerCase().includes('.pdf')) {
        rawText = await extractPdfText(bytes);
      }

      if (rawText.length < 40) {
        if (!mimeType.startsWith('image/')) {
          throw new Error('No se pudo extraer texto del PDF. Intenta subir una imagen más legible.');
        }
        rawText = await extractTextWithVision(bytes, mimeType, openAiKey);
      }

      if (rawText.length < 20) {
        throw new Error('El documento no contiene suficiente texto legible.');
      }

      const structured = await structureVetDocument(rawText, documentType, openAiKey);

      const { data: completed, error: completeError } = await userClient
        .from('vet_document_extractions')
        .update({
          raw_text: rawText.slice(0, 50000),
          structured_data: structured,
          summary: structured.summary,
          parse_status: 'completed',
          parse_error: null,
          parsed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', processingRow.id)
        .select('*')
        .single();

      if (completeError) throw completeError;

      return jsonResponse({ success: true, extraction: completed });
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : String(parseError);

      const { data: failed } = await userClient
        .from('vet_document_extractions')
        .update({
          parse_status: 'failed',
          parse_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', processingRow.id)
        .select('*')
        .single();

      return jsonResponse({
        success: false,
        error: message,
        extraction: failed ?? processingRow,
      });
    }
  } catch (err) {
    console.error('[parse-vet-document]', err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
