import { getPricingConfig } from '@/config/productPricing';

export interface MarketplaceProductFilterSource {
  product_name: string;
  description?: string | null;
  detailed_description?: string | null;
  brand?: string | null;
  tags?: string[] | null;
  product_category: string;
  target_species?: string[] | null;
  product_subtype?: string | null;
  life_stage?: string | null;
  price: number;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  price_extra_large?: number | null;
  price_xs?: number | null;
  price_s?: number | null;
  price_m?: number | null;
  price_l?: number | null;
  price_xl?: number | null;
  price_xxl?: number | null;
  stock_quantity?: number;
  providers?: {
    has_delivery?: boolean;
    has_pickup?: boolean;
  };
}

export interface ProductFilterOption {
  value: string;
  label: string;
}

export interface ProductFilterDefinition {
  id: string;
  label: string;
  placeholder?: string;
  /** Static options; omit when using dynamicSource */
  options?: ProductFilterOption[];
  /** Pull options from product data (brands, tags) */
  dynamicSource?: 'brand' | 'tag';
  /** Categories where this filter appears; 'all' means every category + vista general */
  categories: string[];
  match: (product: MarketplaceProductFilterSource, value: string) => boolean;
}

const ALL = '__all__';

export const PET_SPECIES_OPTIONS: ProductFilterOption[] = [
  { value: 'perro', label: 'Perros' },
  { value: 'gato', label: 'Gatos' },
  { value: 'ave', label: 'Aves' },
  { value: 'roedor', label: 'Roedores' },
  { value: 'todos', label: 'Todas las mascotas' },
];

export const LIFE_STAGE_OPTIONS: ProductFilterOption[] = [
  { value: 'cachorro', label: 'Cachorro / kitten' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'senior', label: 'Senior / maduro' },
];

/** Maps product category to the subtype filter used in marketplace + provider form */
export const CATEGORY_SUBTYPE_FILTER_ID: Record<string, string> = {
  alimentos: 'food_type',
  accesorios: 'accessory_type',
  higiene: 'hygiene_type',
  medicamentos: 'medicine_type',
  juguetes: 'toy_type',
  transporte: 'transport_type',
  camas: 'bed_type',
};

const PET_TYPE_KEYWORDS: Record<string, string[]> = {
  perro: ['perro', 'perros', 'dog', 'canino', 'cachorro'],
  gato: ['gato', 'gatos', 'cat', 'felino'],
  ave: ['ave', 'aves', 'pajaro', 'loro'],
  roedor: ['roedor', 'hamster', 'cobaya', 'conejo'],
};

function matchesStructuredOrKeywords(
  product: MarketplaceProductFilterSource,
  structuredValue: string | null | undefined,
  filterValue: string,
  keywords: string[],
): boolean {
  if (structuredValue) return structuredValue === filterValue;
  return matchesKeywords(product, keywords);
}

function matchesTargetSpecies(product: MarketplaceProductFilterSource, filterValue: string): boolean {
  const species = product.target_species?.filter(Boolean) ?? [];
  if (species.length > 0) {
    if (species.includes('todos')) return true;
    return species.includes(filterValue);
  }
  return matchesKeywords(product, PET_TYPE_KEYWORDS[filterValue] ?? [filterValue]);
}

function productSearchText(product: MarketplaceProductFilterSource): string {
  return [
    product.product_name,
    product.description,
    product.detailed_description,
    product.brand,
    ...(product.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesKeywords(product: MarketplaceProductFilterSource, keywords: string[]): boolean {
  const text = productSearchText(product);
  return keywords.some((keyword) =>
    text.includes(
      keyword
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    ),
  );
}

function hasDogSizePrice(product: MarketplaceProductFilterSource, sizeKey: string): boolean {
  const price = product[`price_${sizeKey}` as keyof MarketplaceProductFilterSource];
  return typeof price === 'number' && price > 0;
}

function hasClothingSizePrice(product: MarketplaceProductFilterSource, sizeKey: string): boolean {
  const price = product[`price_${sizeKey}` as keyof MarketplaceProductFilterSource];
  return typeof price === 'number' && price > 0;
}

export const PRODUCT_FILTER_DEFINITIONS: ProductFilterDefinition[] = [
  {
    id: 'brand',
    label: 'Marca',
    placeholder: 'Todas las marcas',
    dynamicSource: 'brand',
    categories: ['all', ...['alimentos', 'juguetes', 'accesorios', 'higiene', 'medicamentos', 'ropa', 'camas', 'transporte', 'otro']],
    match: (product, value) => {
      if (value === ALL) return true;
      return (product.brand ?? '').trim().toLowerCase() === value.toLowerCase();
    },
  },
  {
    id: 'pet_type',
    label: 'Mascota',
    placeholder: 'Todas',
    options: PET_SPECIES_OPTIONS.filter((option) => option.value !== 'todos'),
    categories: ['all', 'alimentos', 'juguetes', 'higiene', 'medicamentos', 'ropa', 'accesorios'],
    match: (product, value) => {
      if (value === ALL) return true;
      return matchesTargetSpecies(product, value);
    },
  },
  {
    id: 'food_type',
    label: 'Tipo de alimento',
    placeholder: 'Todos',
    options: [
      { value: 'seco', label: 'Seco / croquetas' },
      { value: 'humedo', label: 'Húmedo / lata' },
      { value: 'premio', label: 'Premios y snacks' },
      { value: 'prescripcion', label: 'Prescripción / veterinario' },
    ],
    categories: ['alimentos'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        seco: ['seco', 'dry', 'croqueta', 'kibble', 'recipe'],
        humedo: ['humeda', 'húmedo', 'lata', 'wet', 'gravy', 'onz', 'conserva'],
        premio: ['premio', 'snack', 'treat', 'bite', 'bites', 'reward'],
        prescripcion: ['prescription', 'prescripcion', 'prescripción', 'diet', 'renal', 'urinario', 'k/d', 'c/d'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'life_stage',
    label: 'Etapa de vida',
    placeholder: 'Todas',
    options: LIFE_STAGE_OPTIONS,
    categories: ['alimentos', 'medicamentos'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        cachorro: ['cachorro', 'puppy', 'kitten', 'junior', 'filhote'],
        adulto: ['adulto', 'adult', 'tradicional', 'maintenance'],
        senior: ['senior', 'maduro', '7+', 'mature', 'geriatric'],
      };
      return matchesStructuredOrKeywords(product, product.life_stage, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'accessory_type',
    label: 'Tipo de accesorio',
    placeholder: 'Todos',
    options: [
      { value: 'collar', label: 'Collares' },
      { value: 'arnes', label: 'Arneses' },
      { value: 'correa', label: 'Correas' },
      { value: 'plato', label: 'Platos y bowls' },
      { value: 'identificacion', label: 'Placas e identificación' },
    ],
    categories: ['accesorios'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        collar: ['collar'],
        arnes: ['arnes', 'arnés', 'harness'],
        correa: ['correa', 'retractil', 'retráctil', 'lead'],
        plato: ['plato', 'bowl', 'comedero', 'bebedero'],
        identificacion: ['placa', 'identificacion', 'identificación', 'tag'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'hygiene_type',
    label: 'Tipo de higiene',
    placeholder: 'Todos',
    options: [
      { value: 'bano', label: 'Baño y champú' },
      { value: 'dental', label: 'Cuidado dental' },
      { value: 'cepillo', label: 'Cepillos y peines' },
      { value: 'toallitas', label: 'Toallitas' },
      { value: 'oidos', label: 'Oídos y ojos' },
    ],
    categories: ['higiene'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        bano: ['champu', 'champú', 'shampoo', 'bano', 'baño'],
        dental: ['dental', 'dentifrico', 'dentífrico', 'enzimatica', 'enzimática'],
        cepillo: ['cepillo', 'peine', 'deslanador', 'furminator', 'carda'],
        toallitas: ['toallita', 'wipes', 'humedas', 'húmedas'],
        oidos: ['oido', 'oído', 'ojo', 'otico', 'ótico'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'medicine_type',
    label: 'Tipo de medicamento',
    placeholder: 'Todos',
    options: [
      { value: 'antipulgas', label: 'Antipulgas / antiparasitarios' },
      { value: 'vitaminas', label: 'Vitaminas y suplementos' },
      { value: 'prescripcion', label: 'Prescripción veterinaria' },
      { value: 'topico', label: 'Tópicos y cuidado' },
    ],
    categories: ['medicamentos'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        antipulgas: ['antipulga', 'antipulgas', 'bravecto', 'nexgard', 'pipeta', 'parasito'],
        vitaminas: ['vitamina', 'multivitamin', 'suplemento', 'calcio', 'omega'],
        prescripcion: ['prescription', 'prescripcion', 'prescripción', 'c/d', 'k/d', 'urinario', 'renal'],
        topico: ['topico', 'tópico', 'spray', 'pomada', 'crema', 'loción', 'locion'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'toy_type',
    label: 'Tipo de juguete',
    placeholder: 'Todos',
    options: [
      { value: 'mordedor', label: 'Mordedores y cuerdas' },
      { value: 'pelota', label: 'Pelotas y lanzadores' },
      { value: 'interactivo', label: 'Interactivos / puzzles' },
      { value: 'peluche', label: 'Peluches' },
      { value: 'gato', label: 'Para gatos' },
    ],
    categories: ['juguetes'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        mordedor: ['mordedor', 'cuerda', 'kong', 'hueso', 'masticable'],
        pelota: ['pelota', 'ball', 'frisbee', 'chuckit', 'lanzador'],
        interactivo: ['interactivo', 'puzzle', 'dispensador', 'snack'],
        peluche: ['peluche', 'muñeco', 'raton', 'ratón', 'catnip'],
        gato: ['gato', 'gatos', 'cat', 'felino', 'rascador'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'dog_size',
    label: 'Tamaño de mascota',
    placeholder: 'Cualquier tamaño',
    options: [
      { value: 'small', label: 'Pequeño (hasta 10 kg)' },
      { value: 'medium', label: 'Mediano (11-25 kg)' },
      { value: 'large', label: 'Grande (26-45 kg)' },
      { value: 'extra_large', label: 'Extra grande (+45 kg)' },
    ],
    categories: ['juguetes', 'higiene', 'camas', 'otro'],
    match: (product, value) => {
      if (value === ALL) return true;
      if (hasDogSizePrice(product, value)) return true;
      return matchesKeywords(product, [value, value.replace('_', ' ')]);
    },
  },
  {
    id: 'clothing_size',
    label: 'Talla',
    placeholder: 'Todas las tallas',
    options: [
      { value: 'xs', label: 'XS' },
      { value: 's', label: 'S' },
      { value: 'm', label: 'M' },
      { value: 'l', label: 'L' },
      { value: 'xl', label: 'XL' },
      { value: 'xxl', label: 'XXL' },
    ],
    categories: ['ropa', 'accesorios'],
    match: (product, value) => {
      if (value === ALL) return true;
      if (hasClothingSizePrice(product, value)) return true;
      const label = value.toUpperCase();
      return matchesKeywords(product, [`talla ${label}`, `size ${label}`, ` - ${label}`, `(${label})`]);
    },
  },
  {
    id: 'transport_type',
    label: 'Tipo de transporte',
    placeholder: 'Todos',
    options: [
      { value: 'carrier', label: 'Transportadoras / kennels' },
      { value: 'coche', label: 'Asientos y cinturones' },
      { value: 'bolsa', label: 'Bolsas y mochilas' },
      { value: 'rampa', label: 'Rampas y escaleras' },
    ],
    categories: ['transporte'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        carrier: ['transportadora', 'carrier', 'kennel', 'jaula'],
        coche: ['coche', 'auto', 'asiento', 'cinturon', 'cinturón', 'seat'],
        bolsa: ['bolsa', 'mochila', 'backpack'],
        rampa: ['rampa', 'escalera', 'ramp'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'bed_type',
    label: 'Tipo de cama',
    placeholder: 'Todas',
    options: [
      { value: 'colchon', label: 'Colchones y camas' },
      { value: 'cucha', label: 'Cuchas y nidos' },
      { value: 'funda', label: 'Fundas y repuestos' },
    ],
    categories: ['camas'],
    match: (product, value) => {
      if (value === ALL) return true;
      const keywordMap: Record<string, string[]> = {
        colchon: ['colchon', 'colchón', 'cama', 'bed'],
        cucha: ['cucha', 'nido', 'donut', 'redonda'],
        funda: ['funda', 'repuesto', 'cover'],
      };
      return matchesStructuredOrKeywords(product, product.product_subtype, value, keywordMap[value] ?? [value]);
    },
  },
  {
    id: 'delivery',
    label: 'Entrega',
    placeholder: 'Cualquiera',
    options: [
      { value: 'delivery', label: 'Con delivery' },
      { value: 'pickup', label: 'Recoger en tienda' },
    ],
    categories: ['all', ...['alimentos', 'juguetes', 'accesorios', 'higiene', 'medicamentos', 'ropa', 'camas', 'transporte', 'otro']],
    match: (product, value) => {
      if (value === ALL) return true;
      if (value === 'delivery') return !!product.providers?.has_delivery;
      if (value === 'pickup') return !!product.providers?.has_pickup;
      return true;
    },
  },
  {
    id: 'availability',
    label: 'Disponibilidad',
    placeholder: 'Todas',
    options: [
      { value: 'in_stock', label: 'En stock' },
      { value: 'low_stock', label: 'Pocas unidades (≤5)' },
    ],
    categories: ['all', ...['alimentos', 'juguetes', 'accesorios', 'higiene', 'medicamentos', 'ropa', 'camas', 'transporte', 'otro']],
    match: (product, value) => {
      if (value === ALL) return true;
      const stock = product.stock_quantity ?? 0;
      if (value === 'in_stock') return stock > 0;
      if (value === 'low_stock') return stock > 0 && stock <= 5;
      return true;
    },
  },
];

export const PRODUCT_FILTER_ALL_VALUE = ALL;

export function getProductFiltersForCategory(categoryId: string): ProductFilterDefinition[] {
  const scope = categoryId === 'all' ? 'all' : categoryId;
  return PRODUCT_FILTER_DEFINITIONS.filter((definition) => definition.categories.includes(scope));
}

export function getDefaultProductFilterValues(categoryId: string): Record<string, string> {
  const values: Record<string, string> = {};
  getProductFiltersForCategory(categoryId).forEach((definition) => {
    values[definition.id] = ALL;
  });
  return values;
}

export function buildDynamicFilterOptions(
  definition: ProductFilterDefinition,
  products: MarketplaceProductFilterSource[],
): ProductFilterOption[] {
  if (definition.dynamicSource === 'brand') {
    const brands = new Set<string>();
    products.forEach((product) => {
      const brand = product.brand?.trim();
      if (brand) brands.add(brand);
    });
    return Array.from(brands)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((brand) => ({ value: brand, label: brand }));
  }

  if (definition.dynamicSource === 'tag') {
    const tags = new Set<string>();
    products.forEach((product) => {
      (product.tags ?? []).forEach((tag) => {
        const normalized = tag.trim();
        if (normalized) tags.add(normalized);
      });
    });
    return Array.from(tags)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .slice(0, 24)
      .map((tag) => ({ value: tag, label: tag }));
  }

  return definition.options ?? [];
}

export function productMatchesDynamicFilters(
  product: MarketplaceProductFilterSource,
  categoryId: string,
  filterValues: Record<string, string>,
): boolean {
  return getProductFiltersForCategory(categoryId).every((definition) => {
    const value = filterValues[definition.id] ?? ALL;
    if (value === ALL) return true;
    return definition.match(product, value);
  });
}

export function getProductMaxPrice(product: MarketplaceProductFilterSource): number {
  const config = getPricingConfig(product.product_category);
  const candidates = [product.price];

  if (config.system === 'dog_size') {
    candidates.push(
      product.price_small ?? 0,
      product.price_medium ?? 0,
      product.price_large ?? 0,
      product.price_extra_large ?? 0,
    );
  } else if (config.system === 'clothing_size') {
    candidates.push(
      product.price_xs ?? 0,
      product.price_s ?? 0,
      product.price_m ?? 0,
      product.price_l ?? 0,
      product.price_xl ?? 0,
      product.price_xxl ?? 0,
    );
  }

  return Math.max(...candidates.filter((price) => typeof price === 'number' && price > 0), 0);
}

export function getProductMinPrice(product: MarketplaceProductFilterSource): number {
  const config = getPricingConfig(product.product_category);
  const candidates = [product.price];

  if (config.system === 'dog_size') {
    candidates.push(
      product.price_small ?? 0,
      product.price_medium ?? 0,
      product.price_large ?? 0,
      product.price_extra_large ?? 0,
    );
  } else if (config.system === 'clothing_size') {
    candidates.push(
      product.price_xs ?? 0,
      product.price_s ?? 0,
      product.price_m ?? 0,
      product.price_l ?? 0,
      product.price_xl ?? 0,
      product.price_xxl ?? 0,
    );
  }

  const valid = candidates.filter((price) => typeof price === 'number' && price > 0);
  return valid.length > 0 ? Math.min(...valid) : product.price;
}

export function countActiveProductFilters(
  categoryId: string,
  filterValues: Record<string, string>,
): number {
  return getProductFiltersForCategory(categoryId).filter(
    (definition) => (filterValues[definition.id] ?? ALL) !== ALL,
  ).length;
}

export function getSubtypeOptionsForCategory(categoryId: string): ProductFilterOption[] {
  const filterId = CATEGORY_SUBTYPE_FILTER_ID[categoryId];
  if (!filterId) return [];
  const definition = PRODUCT_FILTER_DEFINITIONS.find((item) => item.id === filterId);
  return definition?.options ?? [];
}

export function getSubtypeFieldLabel(categoryId: string): string | null {
  const filterId = CATEGORY_SUBTYPE_FILTER_ID[categoryId];
  if (!filterId) return null;
  return PRODUCT_FILTER_DEFINITIONS.find((item) => item.id === filterId)?.label ?? null;
}

export function categorySupportsLifeStage(categoryId: string): boolean {
  return categoryId === 'alimentos' || categoryId === 'medicamentos';
}
