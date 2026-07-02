import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_CATEGORIES = [
  'alimentos',
  'juguetes',
  'accesorios',
  'higiene',
  'medicamentos',
  'ropa',
  'camas',
  'transporte',
  'otro',
] as const;

interface ExtractedProduct {
  product_name: string;
  product_category: string;
  description: string;
  detailed_description?: string;
  price: number;
  brand?: string;
  product_image_url?: string;
  sku?: string;
  currency?: string;
  tags?: string[];
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (h === '127.0.0.1' || h.startsWith('127.')) return true;
  if (h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.')) return true;
  if (h.startsWith('172.')) {
    const second = Number(h.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function validatePublicUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('URL inválida');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Solo se permiten URLs http o https');
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error('URL no permitida');
  }
  return parsed;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function extractMeta(html: string, key: string, attr: 'property' | 'name' = 'property'): string | undefined {
  const patterns = [
    new RegExp(`${attr}=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`content=["']([^"']+)["'][^>]*${attr}=["']${key}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1].replace(/\s+/g, ' ').trim()) : undefined;
}

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // ignore invalid json-ld
    }
  }
  return blocks;
}

function flattenJsonLdProduct(blocks: unknown[]): Record<string, unknown> | null {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const obj = block as Record<string, unknown>;
    if (obj['@type'] === 'Product') return obj;
    if (Array.isArray(obj['@graph'])) {
      for (const item of obj['@graph']) {
        if (item && typeof item === 'object' && (item as Record<string, unknown>)['@type'] === 'Product') {
          return item as Record<string, unknown>;
        }
      }
    }
  }
  return null;
}

function extractPriceHints(html: string): string[] {
  const hints = new Set<string>();
  for (const match of html.matchAll(/Q\s?(\d+(?:[.,]\d{2})?)/gi)) {
    hints.add(`Q${match[1].replace(',', '.')}`);
  }
  for (const match of html.matchAll(/(?:precio actual|current price|price)[^Q]{0,40}(Q\s?\d+(?:\.\d{2})?)/gi)) {
    hints.add(match[1].replace(/\s/g, ''));
  }
  return [...hints].slice(0, 8);
}

function extractVisibleText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 14000);
}

function buildPageSignals(html: string, url: string): string {
  const jsonLd = flattenJsonLdProduct(extractJsonLdBlocks(html));
  const signals = {
    url,
    title: extractTitle(html),
    og_title: extractMeta(html, 'og:title'),
    og_description: extractMeta(html, 'og:description'),
    og_image: extractMeta(html, 'og:image'),
    description: extractMeta(html, 'description', 'name'),
    price_hints: extractPriceHints(html),
    json_ld_product: jsonLd,
    page_text_excerpt: extractVisibleText(html).slice(0, 6000),
  };
  return JSON.stringify(signals, null, 2);
}

async function extractProductWithOpenAI(signals: string, apiKey: string): Promise<ExtractedProduct> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Extraes datos de productos para mascotas desde señales de una página web (e-commerce). ' +
            'Responde SOLO JSON válido con las claves: product_name, product_category, description, detailed_description, price, brand, product_image_url, sku, currency, tags. ' +
            'Usa el precio ACTUAL en quetzales (GTQ) si hay varios precios. ' +
            'product_category debe ser una de: alimentos, juguetes, accesorios, higiene, medicamentos, ropa, camas, transporte, otro. ' +
            'description = resumen corto (1-2 oraciones). detailed_description = texto más completo si existe.',
        },
        {
          role: 'user',
          content: `Extrae el producto de estas señales:\n\n${signals}`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === 'object' ? JSON.stringify(data.error) : 'OpenAI extraction failed');
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty extraction');

  const parsed = JSON.parse(content) as ExtractedProduct;
  if (!parsed.product_name || !parsed.price) {
    throw new Error('No se pudo extraer nombre o precio del producto');
  }

  if (!PRODUCT_CATEGORIES.includes(parsed.product_category as (typeof PRODUCT_CATEGORIES)[number])) {
    parsed.product_category = 'otro';
  }

  parsed.currency = parsed.currency || 'GTQ';
  return parsed;
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
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const url = body?.url as string | undefined;
    if (!url) {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsedUrl = validatePublicUrl(url);

    const pageRes = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'PetHubProductImporter/1.0 (+https://pethubgt.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!pageRes.ok) {
      return new Response(JSON.stringify({ error: `No se pudo abrir la URL (${pageRes.status})` }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await pageRes.text();
    const signals = buildPageSignals(html, parsedUrl.toString());
    const product = await extractProductWithOpenAI(signals, apiKey);

    return new Response(JSON.stringify({ success: true, source_url: parsedUrl.toString(), product }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
