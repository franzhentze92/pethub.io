const QUERY_STOP_WORDS = new Set([
  'de',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'para',
  'con',
  'en',
  'y',
  'o',
  'que',
  'quiero',
  'necesito',
  'busco',
  'buscar',
  'comprar',
  'compra',
  'me',
  'mi',
  'tu',
  'algun',
  'algún',
  'alguna',
  'hay',
  'tiene',
  'tienen',
  'ver',
  'mostrar',
  'dame',
  'dime',
]);

const TOKEN_SYNONYMS: Record<string, string[]> = {
  concentrado: ['concentrado', 'alimento', 'alimentos', 'croquetas', 'seco', 'dry', 'kibble'],
  alimento: ['alimento', 'alimentos', 'concentrado', 'croquetas', 'comida', 'pienso'],
  alimentos: ['alimentos', 'alimento', 'concentrado', 'croquetas'],
  croquetas: ['croquetas', 'concentrado', 'alimento', 'seco'],
  comida: ['comida', 'alimento', 'concentrado'],
  perro: ['perro', 'perros', 'canino', 'canina', 'dog', 'cachorro'],
  perros: ['perro', 'perros', 'canino', 'dog'],
  gato: ['gato', 'gatos', 'felino', 'cat'],
  gatos: ['gato', 'gatos', 'felino', 'cat'],
};

const TEXT_FIELDS = [
  'product_name',
  'description',
  'detailed_description',
  'brand',
  'product_category',
  'product_subtype',
  'life_stage',
] as const;

export function tokenizeMarketplaceQuery(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[¿?¡!.,]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !QUERY_STOP_WORDS.has(w));
}

export function expandMarketplaceTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    for (const [key, synonyms] of Object.entries(TOKEN_SYNONYMS)) {
      if (token === key || token.includes(key) || key.includes(token)) {
        for (const syn of synonyms) expanded.add(syn);
      }
    }
  }
  return [...expanded].slice(0, 10);
}

export function inferProductCategory(message: string): string | undefined {
  const lower = message.toLowerCase();
  if (/\b(concentrado|alimento|alimentos|croquetas|comida|pienso|snack|premio|treats)\b/.test(lower)) {
    return 'alimentos';
  }
  if (/\b(juguete|juguetes|toy)\b/.test(lower)) return 'juguetes';
  if (/\b(collar|correa|arn[eé]s|accesorio)\b/.test(lower)) return 'accesorios';
  if (/\b(shampoo|champ[uú]|higiene|baño)\b/.test(lower)) return 'higiene';
  if (/\b(medicamento|vitamina|suplemento|antipulgas)\b/.test(lower)) return 'medicamentos';
  return undefined;
}

export function inferTargetSpecies(message: string): 'perro' | 'gato' | undefined {
  const lower = message.toLowerCase();
  if (/\b(perro|perros|canino|canina|cachorro|dog)\b/.test(lower)) return 'perro';
  if (/\b(gato|gatos|felino|cat)\b/.test(lower)) return 'gato';
  return undefined;
}

export function buildProductTextOrFilter(tokens: string[]): string | undefined {
  if (tokens.length === 0) return undefined;
  const parts: string[] = [];
  for (const token of tokens) {
    const safe = token.replace(/[%_,.]/g, '');
    if (!safe) continue;
    for (const field of TEXT_FIELDS) {
      parts.push(`${field}.ilike.%${safe}%`);
    }
  }
  return parts.length > 0 ? parts.join(',') : undefined;
}

type ScorableProduct = {
  product_name?: string | null;
  description?: string | null;
  detailed_description?: string | null;
  brand?: string | null;
  product_category?: string | null;
  product_subtype?: string | null;
  life_stage?: string | null;
  tags?: string[] | null;
  target_species?: string[] | null;
};

export function scoreProductMatch(row: ScorableProduct, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const name = (row.product_name ?? '').toLowerCase();
  const haystack = [
    row.product_name,
    row.description,
    row.detailed_description,
    row.brand,
    row.product_category,
    row.product_subtype,
    row.life_stage,
    ...(row.tags ?? []),
    ...(row.target_species ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 4;
    else if (haystack.includes(token)) score += 2;
    if ((row.tags ?? []).some((t) => t.toLowerCase().includes(token))) score += 3;
  }
  return score;
}

/** Enhanced scoring with phrase bonus for semantic-lite search. */
export function scoreProductMatchSemantic(
  row: ScorableProduct,
  tokens: string[],
  fullQuery: string,
): number {
  let score = scoreProductMatch(row, tokens);
  const q = fullQuery.toLowerCase().trim();
  if (q.length >= 4) {
    const name = (row.product_name ?? '').toLowerCase();
    const desc = (row.description ?? '').toLowerCase();
    if (name.includes(q)) score += 8;
    else if (desc.includes(q)) score += 4;
  }
  return score;
}

export function extractMarketplaceSearchQuery(message: string): string | undefined {
  if (isListAllCatalogRequest(message)) return undefined;
  const tokens = tokenizeMarketplaceQuery(message).filter(
    (t) => !['producto', 'productos', 'servicio', 'servicios', 'todos', 'todas'].includes(t),
  );
  if (tokens.length === 0) return undefined;
  return tokens.join(' ');
}

export function isListAllCatalogRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(todos|todas|lista|listado|catalogo|catálogo|completo|disponibles|mu[eé]strame|dame)\b/i.test(lower) &&
    /\b(producto|productos|servicio|servicios|tienda)\b/i.test(lower)
  );
}

export function wantsMarketplaceProducts(message: string): boolean {
  const lower = message.toLowerCase();
  if (wantsMarketplaceServices(message) && !/\bproducto/i.test(lower)) return false;
  if (/\b(no|sin)\b.*\badopci[oó]n\b/i.test(lower) && /\bproducto/i.test(lower)) return true;
  if (/\bproducto|productos\b/i.test(lower)) return true;
  if (/\b(tienda|marketplace|comprar|compra)\b/i.test(lower) && !/\badopci[oó]n\b/i.test(lower)) return true;
  return false;
}

export function wantsMarketplaceServices(message: string): boolean {
  const lower = message.toLowerCase();
  if (/\bproducto|productos\b/i.test(lower)) return false;
  return /\bservicio|servicios\b/i.test(lower);
}

export function inferMarketplaceListParams(
  message: string,
  kind: 'products' | 'services',
): Record<string, unknown> {
  const listAll = isListAllCatalogRequest(message) || wantsMarketplaceProducts(message) || wantsMarketplaceServices(message);
  const params: Record<string, unknown> = {
    limit: listAll ? 50 : 12,
  };
  const query = extractMarketplaceSearchQuery(message);
  if (query) params.query = query;
  if (kind === 'products') {
    const category = inferProductCategory(message);
    if (category) params.category = category;
  }
  return params;
}

export function resolveMarketplaceIntent(
  message: string,
): { toolName: string; params: Record<string, unknown> } | null {
  if (wantsMarketplaceProducts(message)) {
    return {
      toolName: 'marketplace_search_products',
      params: inferMarketplaceListParams(message, 'products'),
    };
  }
  if (wantsMarketplaceServices(message)) {
    return {
      toolName: 'marketplace_search_services',
      params: inferMarketplaceListParams(message, 'services'),
    };
  }
  return null;
}
