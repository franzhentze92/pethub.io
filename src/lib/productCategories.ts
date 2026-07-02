import {
  Building2,
  Car,
  Home,
  Package,
  Scissors,
  ShoppingBag,
  Star,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';

export interface ProductCategoryDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const MARKETPLACE_PRODUCT_CATEGORIES: ProductCategoryDefinition[] = [
  { id: 'all', label: 'Todo', icon: ShoppingBag },
  { id: 'alimentos', label: 'Alimentos', icon: Package },
  { id: 'juguetes', label: 'Juguetes', icon: Star },
  { id: 'accesorios', label: 'Accesorios', icon: ShoppingBag },
  { id: 'higiene', label: 'Higiene', icon: Scissors },
  { id: 'medicamentos', label: 'Medicamentos', icon: Stethoscope },
  { id: 'ropa', label: 'Ropa', icon: Home },
  { id: 'camas', label: 'Camas', icon: Home },
  { id: 'transporte', label: 'Transporte', icon: Car },
  { id: 'otro', label: 'Otro', icon: Building2 },
];

export const PRODUCT_CATEGORY_IDS = MARKETPLACE_PRODUCT_CATEGORIES.filter((c) => c.id !== 'all').map(
  (c) => c.id,
);

export function getProductCategoryLabel(categoryId: string): string {
  return MARKETPLACE_PRODUCT_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}
