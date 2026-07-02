import type { BlueprintConnectionStatus } from '@/lib/blueprint/clientSections';
import { cn } from '@/lib/utils';

/** Colores del mapa/lista alineados con la leyenda (no con gradientes decorativos). */
export const blueprintStatusStyles = {
  connected: {
    icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    border: 'border-emerald-400 bg-white',
    line: '#10b981',
    label: 'text-emerald-800',
    badge: 'text-emerald-600',
  },
  partial: {
    icon: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white',
    border: 'border-amber-400 bg-amber-50',
    line: '#f59e0b',
    label: 'text-amber-800',
    badge: 'text-amber-600',
  },
  disconnected: {
    icon: 'bg-gray-200 text-gray-400',
    border: 'border-gray-300 bg-gray-100',
    line: '#d1d5db',
    label: 'text-gray-400',
    badge: 'text-gray-400',
  },
} as const satisfies Record<
  BlueprintConnectionStatus,
  { icon: string; border: string; line: string; label: string; badge: string }
>;

export function blueprintNodeIconClass(status: BlueprintConnectionStatus): string {
  return blueprintStatusStyles[status].icon;
}

export function blueprintNodeBorderClass(status: BlueprintConnectionStatus): string {
  return cn(
    'border-2',
    blueprintStatusStyles[status].border,
    status === 'disconnected' && 'shadow-sm',
    status === 'connected' && 'shadow-sm',
    status === 'partial' && 'shadow-sm',
  );
}
