export type CatalogBadgeKind = 'product' | 'service';

const PRODUCT_CATEGORY_BADGES: Record<string, string> = {
  alimentos: 'bg-amber-50 text-amber-800 border-amber-200',
  juguetes: 'bg-violet-50 text-violet-800 border-violet-200',
  accesorios: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
  higiene: 'bg-sky-50 text-sky-800 border-sky-200',
  medicamentos: 'bg-rose-50 text-rose-800 border-rose-200',
  ropa: 'bg-pink-50 text-pink-800 border-pink-200',
  camas: 'bg-orange-50 text-orange-800 border-orange-200',
  transporte: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  equipamiento: 'bg-teal-50 text-teal-800 border-teal-200',
  otro: 'bg-gray-100 text-gray-700 border-gray-200',
};

const SERVICE_CATEGORY_BADGES: Record<string, string> = {
  veterinaria: 'bg-rose-50 text-rose-800 border-rose-200',
  grooming: 'bg-landing-aqua/15 text-landing-aqua-dark border-landing-aqua/30',
  entrenamiento: 'bg-orange-50 text-orange-800 border-orange-200',
  alojamiento: 'bg-blue-50 text-blue-800 border-blue-200',
  transporte: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  fisioterapia: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  nutricion: 'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/35',
  otro: 'bg-gray-100 text-gray-700 border-gray-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  alimentos: 'Alimentos',
  juguetes: 'Juguetes',
  accesorios: 'Accesorios',
  higiene: 'Higiene',
  medicamentos: 'Medicamentos',
  ropa: 'Ropa',
  camas: 'Camas',
  transporte: 'Transporte',
  equipamiento: 'Equipamiento',
  veterinaria: 'Veterinaria',
  grooming: 'Grooming',
  entrenamiento: 'Entrenamiento',
  alojamiento: 'Alojamiento',
  fisioterapia: 'Fisioterapia',
  nutricion: 'Nutrición',
  otro: 'Otro',
};

function normalizeCategoryKey(category: string): string {
  return category.toLowerCase().trim();
}

export function getCategoryBadgeClass(
  category: string,
  kind: CatalogBadgeKind = 'product'
): string {
  const key = normalizeCategoryKey(category);
  const map = kind === 'service' ? SERVICE_CATEGORY_BADGES : PRODUCT_CATEGORY_BADGES;
  return map[key] ?? map.otro;
}

export function formatCategoryLabel(category: string): string {
  const key = normalizeCategoryKey(category);
  return CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Shared badge classes for marketplace cards and modals */
export const categoryBadgeBaseClass =
  'text-[10px] md:text-xs font-medium capitalize border shadow-sm';
