import React from 'react';
import { Check, Pencil, X, Loader2 } from 'lucide-react';
import type { PetBuddyPendingAction } from '@/ai/types';
import { cn } from '@/lib/utils';

interface PetBuddyActionConfirmCardProps {
  action: PetBuddyPendingAction;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PetBuddyActionConfirmCard: React.FC<PetBuddyActionConfirmCardProps> = ({
  action,
  onConfirm,
  onEdit,
  onCancel,
  loading = false,
}) => {
  if (action.status && action.status !== 'pending') return null;

  return (
    <div className="mt-2.5 rounded-xl border border-landing-mango/25 bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-landing-tropical/25 border-b border-landing-tropical/35">
        <p className="text-xs font-semibold text-landing-mango-dark">{action.title}</p>
      </div>
      <ul className="px-3 py-2 space-y-1.5 text-xs">
        {action.fields.map((field) => (
          <li key={field.label} className="flex justify-between gap-2">
            <span className="text-gray-500">{field.label}</span>
            <span className="font-medium text-gray-800 text-right break-words">{field.value}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5 p-2 border-t border-gray-100 bg-gray-50/60">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium',
            'border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50'
          )}
        >
          <X className="w-3 h-3" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium',
            'border border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10 transition-colors disabled:opacity-50'
          )}
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold text-gray-900',
            'bg-landing-mint hover:bg-landing-mint-dark transition-colors disabled:opacity-50'
          )}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Confirmar
        </button>
      </div>
    </div>
  );
};

export default PetBuddyActionConfirmCard;
