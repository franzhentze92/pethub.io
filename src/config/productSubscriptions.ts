export type SubscriptionInterval = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly';

export interface SubscriptionIntervalOption {
  value: SubscriptionInterval;
  label: string;
  description: string;
  days: number;
}

export const SUBSCRIPTION_INTERVALS: SubscriptionIntervalOption[] = [
  { value: 'weekly', label: 'Cada semana', description: 'Entrega cada 7 días', days: 7 },
  { value: 'biweekly', label: 'Cada 2 semanas', description: 'Entrega cada 14 días', days: 14 },
  { value: 'monthly', label: 'Cada mes', description: 'Entrega cada 30 días', days: 30 },
  { value: 'bimonthly', label: 'Cada 2 meses', description: 'Entrega cada 60 días', days: 60 },
  { value: 'quarterly', label: 'Cada 3 meses', description: 'Entrega cada 90 días', days: 90 },
];

export function getSubscriptionIntervalOption(interval: SubscriptionInterval): SubscriptionIntervalOption {
  return SUBSCRIPTION_INTERVALS.find((opt) => opt.value === interval) ?? SUBSCRIPTION_INTERVALS[2];
}

export function getSubscriptionIntervalLabel(interval: SubscriptionInterval): string {
  return getSubscriptionIntervalOption(interval).label;
}

export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatSubscriptionDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Productos que pueden ofrecerse en suscripción (flag explícito o categoría alimentos). */
export function isProductSubscriptionEligible(product: {
  subscription_enabled?: boolean;
  product_category?: string;
}): boolean {
  if (product.subscription_enabled === true) return true;
  return product.product_category === 'alimentos';
}

export function stripSubscriptionSuffix(name: string): string {
  return name.replace(/\s*\(Suscripción\)\s*$/i, '').trim();
}
