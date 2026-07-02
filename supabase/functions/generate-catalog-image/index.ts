import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CatalogType = 'product' | 'service';

interface GenerateCatalogImageRequest {
  type: CatalogType;
  id: string;
  force?: boolean;
}

interface CatalogItem {
  id: string;
  provider_id: string;
  name: string;
  category: string;
  description?: string | null;
  brand?: string | null;
  image_url?: string | null;
}

function isServiceRoleToken(token: string, serviceKey: string): boolean {
  if (token === serviceKey) return true;
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return false;
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const NO_TEXT_SUFFIX =
  'pure illustration only, absolutely no text, no letters, no words, no labels, no captions, no watermarks, no typography, no logos, no price tags, no brand name text';

const PRODUCT_CATEGORY_HINTS: Record<string, string> = {
  alimentos: 'pet food product packaging on clean surface',
  juguetes: 'colorful pet toy product',
  accesorios: 'pet accessory product such as collar leash or bowl',
  higiene: 'pet hygiene grooming product',
  medicamentos: 'pet medicine or supplement product',
  ropa: 'pet clothing apparel product',
  camas: 'cozy pet bed or resting product',
  transporte: 'pet carrier or travel product',
  otro: 'general pet care product',
};

const SERVICE_CATEGORY_HINTS: Record<string, string> = {
  veterinaria: 'professional veterinary clinic service for pets',
  grooming: 'pet grooming salon service scene',
  entrenamiento: 'dog training service session',
  alojamiento: 'pet boarding daycare lodging service',
  transporte: 'pet transport service',
  fisioterapia: 'pet physiotherapy rehabilitation service',
  nutricion: 'pet nutrition consultation service',
  paseo: 'dog walking service outdoors',
  adopcion: 'pet adoption counseling service',
  otro: 'professional pet care service',
};

function buildCatalogPrompt(type: CatalogType, item: CatalogItem): string {
  const categoryKey = item.category.toLowerCase().trim();
  const hints = type === 'product' ? PRODUCT_CATEGORY_HINTS : SERVICE_CATEGORY_HINTS;
  const categoryHint = hints[categoryKey] ?? hints.otro;
  const brandPart = item.brand ? ` inspired by ${item.brand} style` : '';
  const descSnippet = item.description?.slice(0, 120).trim();

  if (type === 'product') {
    return `Professional e-commerce product photo of "${item.name}"${brandPart}, ${categoryHint}. ${descSnippet ?? ''} Centered composition, soft studio lighting, clean white or light gradient background, high quality marketplace listing photo, photorealistic product shot, ${NO_TEXT_SUFFIX}`;
  }

  return `Warm friendly illustration of pet service "${item.name}", ${categoryHint}. ${descSnippet ?? ''} Professional pet marketplace service card image, inviting atmosphere, pets and caring staff implied without specific faces, soft natural colors, ${NO_TEXT_SUFFIX}`;
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

async function generateWithReplicate(prompt: string): Promise<string> {
  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured');

  const createRes = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 90,
        },
      }),
    },
  );

  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created.detail ?? created.error ?? 'Replicate request failed');
  }

  return pollReplicatePrediction(created.urls.get, token);
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const fullPrompt = `${prompt}. Important: do not add any text, labels, captions, or writing anywhere in the image.`;
  const models = ['gpt-image-1', 'dall-e-2'];
  const errors: string[] = [];

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: fullPrompt,
          size: '1024x1024',
          n: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message =
          typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI image generation failed';
        if (res.status === 429 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 8000));
          continue;
        }
        errors.push(`${model}: ${message}`);
        break;
      }

      const url = data?.data?.[0]?.url as string | undefined;
      const b64 = data?.data?.[0]?.b64_json as string | undefined;
      if (url) return url;
      if (b64) return `data:image/png;base64,${b64}`;
      errors.push(`${model}: returned no image`);
      break;
    }
  }

  throw new Error(errors.join('; ') || 'OpenAI image generation failed');
}

async function persistCatalogImage(
  sourceUrl: string,
  type: CatalogType,
  providerId: string,
  itemId: string,
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
    if (!imageRes.ok) throw new Error('Could not download generated image');
    contentType = imageRes.headers.get('content-type') ?? contentType;
    bytes = await imageRes.arrayBuffer();
  }

  const bucket = type === 'product' ? 'product-images' : 'service-images';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'webp';
  const filePath = `${providerId}/ai-${itemId.slice(0, 8)}-${Date.now()}.${ext}`;

  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin.storage.from(bucket).upload(filePath, bytes, {
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const { data } = admin.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

async function fetchCatalogItem(
  admin: ReturnType<typeof createClient>,
  type: CatalogType,
  id: string,
): Promise<CatalogItem | null> {
  if (type === 'product') {
    const { data, error } = await admin
      .from('provider_products')
      .select('id, provider_id, product_name, product_category, description, brand, product_image_url')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      provider_id: data.provider_id,
      name: data.product_name,
      category: data.product_category,
      description: data.description,
      brand: data.brand,
      image_url: data.product_image_url,
    };
  }

  const { data, error } = await admin
    .from('provider_services')
    .select('id, provider_id, service_name, service_category, description, service_image_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    provider_id: data.provider_id,
    name: data.service_name,
    category: data.service_category,
    description: data.description,
    image_url: data.service_image_url,
  };
}

async function userCanManageProvider(
  userClient: ReturnType<typeof createClient>,
  userId: string,
  providerId: string,
): Promise<boolean> {
  const { data: provider } = await userClient
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(provider);
}

async function userIsAdmin(userClient: ReturnType<typeof createClient>): Promise<boolean> {
  const { data, error } = await userClient.rpc('is_admin_user');
  if (error) return false;
  return data === true;
}

async function updateCatalogImageUrl(
  admin: ReturnType<typeof createClient>,
  type: CatalogType,
  id: string,
  imageUrl: string,
): Promise<void> {
  const column = type === 'product' ? 'product_image_url' : 'service_image_url';
  const table = type === 'product' ? 'provider_products' : 'provider_services';
  const { error } = await admin.from(table).update({ [column]: imageUrl }).eq('id', id);
  if (error) throw error;
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return jsonResponse({ error: 'Supabase not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization required' }, 401);
    }

    const body = (await req.json()) as GenerateCatalogImageRequest;
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRole = isServiceRoleToken(token, serviceKey);
    const admin = createClient(supabaseUrl, serviceKey);

    const item = await fetchCatalogItem(admin, body.type, body.id);
    if (!item) return jsonResponse({ error: 'Item not found' }, 404);

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const authorized =
        (await userCanManageProvider(userClient, user.id, item.provider_id)) ||
        (await userIsAdmin(userClient));

      if (!authorized) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
    }

    return await processGeneration(admin, body, item);
  } catch (err) {
    console.error('[generate-catalog-image]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

async function processGeneration(
  admin: ReturnType<typeof createClient>,
  body: GenerateCatalogImageRequest,
  item: CatalogItem,
): Promise<Response> {
  const { type, id, force = false } = body;

  if (!type || !id) {
    return jsonResponse({ error: 'type and id are required' }, 400);
  }

  if (!['product', 'service'].includes(type)) {
    return jsonResponse({ error: 'type must be product or service' }, 400);
  }

  if (item.image_url && !force) {
    return jsonResponse({
      success: true,
      skipped: true,
      imageUrl: item.image_url,
      message: 'Item already has an image. Pass force=true to regenerate.',
    });
  }

  const prompt = buildCatalogPrompt(type, item);
  let tempOutputUrl: string;
  let provider: 'replicate' | 'openai';

  try {
    tempOutputUrl = await generateWithReplicate(prompt);
    provider = 'replicate';
  } catch (replicateError) {
    console.warn('[generate-catalog-image] Replicate failed, trying OpenAI:', replicateError);
    tempOutputUrl = await generateWithOpenAI(prompt);
    provider = 'openai';
  }

  const imageUrl = await persistCatalogImage(tempOutputUrl, type, item.provider_id, id);
  await updateCatalogImageUrl(admin, type, id, imageUrl);

  return jsonResponse({
    success: true,
    imageUrl,
    type,
    id,
    name: item.name,
    provider,
    prompt,
  });
}
