import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PetStyle = 'monster90s' | 'digital';

interface StylizeRequest {
  imageUrl: string;
  style: PetStyle;
  species?: string;
  breed?: string;
  name?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const NO_TEXT_SUFFIX =
  'pure illustration only, absolutely no text, no letters, no words, no labels, no captions, no watermarks, no typography, no logos, no name tags, no title banner';

function buildPrompt(style: PetStyle, species?: string, breed?: string): string {
  // Never include pet name in the prompt — models tend to render it as overlay text.
  const appearance = [breed, species].filter(Boolean).join(' ') || 'pet animal';

  if (style === 'digital') {
    return `${appearance} creature, early 2000s anime digital monster encyclopedia art style, sharp linework, detailed cel shading, fierce yet cute expression, simple solid dark background, 2D digital monster illustration, nostalgic anime creature design, full body portrait, ${NO_TEXT_SUFFIX}`;
  }

  return `Pokémon, ${appearance} as an original collectible creature, Ken Sugimori official artwork style, 1990s Japanese monster RPG creature design, bold ink outlines, flat vibrant colors, dynamic battle-ready pose, retro Game Boy Color era monster illustration upgraded to full artwork, creature companion design, simple soft gradient background, full body portrait, NOT photorealistic, NOT chibi cartoon, NOT generic cute mascot, ${NO_TEXT_SUFFIX}`;
}

function isAllowedImageUrl(imageUrl: string, supabaseUrl: string): boolean {
  try {
    const parsed = new URL(imageUrl);
    const projectHost = new URL(supabaseUrl).host;
    return (
      parsed.protocol === 'https:' &&
      (parsed.host === projectHost || parsed.host.endsWith('.supabase.co')) &&
      parsed.pathname.includes('/storage/v1/object/')
    );
  } catch {
    return false;
  }
}

async function pollReplicatePrediction(
  predictionUrl: string,
  token: string,
  maxAttempts = 60,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(predictionUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prediction = await res.json();

    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      if (Array.isArray(output)) return output[0] as string;
      if (typeof output === 'string') return output;
      throw new Error('Replicate returned an unexpected output format');
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(prediction.error ?? `Replicate prediction ${prediction.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Replicate prediction timed out');
}

async function stylizeWithReplicate(imageUrl: string, prompt: string, style: PetStyle): Promise<string> {
  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured');

  const input: Record<string, unknown> = {
    image: imageUrl,
    prompt,
    prompt_strength: style === 'digital' ? 0.7 : 0.78,
    num_outputs: 1,
    output_format: 'webp',
    lora_scale: 1,
  };

  const civitaiToken = Deno.env.get('CIVITAI_API_TOKEN');
  if (style === 'digital' && civitaiToken) {
    input.lora_weights = 'https://civitai.com/api/download/models/222135';
    input.civitai_api_token = civitaiToken;
    input.lora_scale = 0.9;
    input.prompt = `ncrender, ${prompt}`;
  } else if (style === 'monster90s' && civitaiToken) {
    input.lora_weights = 'https://civitai.com/api/download/models/751810';
    input.civitai_api_token = civitaiToken;
    input.lora_scale = 0.85;
    input.prompt = `Pokémon, ${prompt}`;
  }

  const createRes = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-dev-lora/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    },
  );

  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created.detail ?? created.error ?? 'Replicate request failed');
  }

  return pollReplicatePrediction(created.urls.get, token);
}

async function stylizeWithOpenAI(imageUrl: string, prompt: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error('Could not fetch source image');

  const imageBlob = await imageRes.blob();
  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', imageBlob, 'pet.jpg');
  formData.append('prompt', `${prompt}. Important: do not add any text, labels, captions, or writing anywhere in the image.`);
  formData.append('size', '1024x1024');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI image edit failed',
    );
  }

  const b64 = data?.data?.[0]?.b64_json as string | undefined;
  const url = data?.data?.[0]?.url as string | undefined;
  if (url) return url;
  if (b64) return `data:image/png;base64,${b64}`;
  throw new Error('OpenAI returned no image');
}

async function persistStylizedImage(
  sourceUrl: string,
  userId: string,
  style: PetStyle,
): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials missing');

  let bytes: ArrayBuffer;
  let contentType = 'image/webp';

  if (sourceUrl.startsWith('data:')) {
    const match = sourceUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL from image provider');
    contentType = match[1];
    const binary = atob(match[2]);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    bytes = arr.buffer;
  } else {
    const imageRes = await fetch(sourceUrl);
    if (!imageRes.ok) throw new Error('Could not download stylized image');
    contentType = imageRes.headers.get('content-type') ?? contentType;
    bytes = await imageRes.arrayBuffer();
  }

  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'webp';
  const filePath = `${userId}/pets/stylized-${style}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin.storage.from('avatars').upload(filePath, bytes, {
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const { data } = admin.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
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
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Supabase not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization required' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as StylizeRequest;
    const { imageUrl, style, species, breed } = body;

    if (!imageUrl || !style) {
      return jsonResponse({ error: 'imageUrl and style are required' }, 400);
    }

    if (!['monster90s', 'digital'].includes(style)) {
      return jsonResponse({ error: 'style must be monster90s or digital' }, 400);
    }

    if (!isAllowedImageUrl(imageUrl, supabaseUrl)) {
      return jsonResponse({ error: 'imageUrl must be a Supabase storage URL' }, 400);
    }

    const prompt = buildPrompt(style, species, breed);
    let tempOutputUrl: string;
    let provider: 'replicate' | 'openai';

    try {
      tempOutputUrl = await stylizeWithReplicate(imageUrl, prompt, style);
      provider = 'replicate';
    } catch (replicateError) {
      console.warn('[stylize-pet] Replicate failed, trying OpenAI:', replicateError);
      tempOutputUrl = await stylizeWithOpenAI(imageUrl, prompt);
      provider = 'openai';
    }

    const stylizedUrl = await persistStylizedImage(tempOutputUrl, user.id, style);

    return jsonResponse({
      success: true,
      stylizedUrl,
      style,
      provider,
    });
  } catch (err) {
    console.error('[stylize-pet]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
