import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';

export interface ActionConfirmField {
  label: string;
  value: string;
}

interface ActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: ActionConfirmField[];
  confirmLabel?: string;
  editLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onEdit?: () => void;
  loading?: boolean;
  showEdit?: boolean;
}

export const ActionConfirmDialog: React.FC<ActionConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description = 'Revisa los detalles antes de continuar.',
  fields,
  confirmLabel = 'Confirmar',
  editLabel = 'Editar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onEdit,
  loading = false,
  showEdit = true,
}) => {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md rounded-2xl border-landing-aqua/20">
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-900">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {fields.length > 0 && (
          <ul className="rounded-xl border border-gray-100 bg-gray-50/80 divide-y divide-gray-100 text-sm">
            {fields.map((field) => (
              <li key={field.label} className="flex justify-between gap-3 px-3.5 py-2.5">
                <span className="text-gray-500 shrink-0">{field.label}</span>
                <span className="font-medium text-gray-900 text-right break-words">{field.value}</span>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-1.5" />
            {cancelLabel}
          </Button>
          {showEdit && onEdit && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              {editLabel}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={cn('w-full sm:w-auto border-0', landingBtnPrimary)}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1.5" />
            )}
            {loading ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActionConfirmDialog;
