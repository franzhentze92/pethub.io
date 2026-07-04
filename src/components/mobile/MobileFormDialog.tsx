import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  plainPageAccentBtn,
  plainPageAccentUi,
  type PlainPageAccent,
} from '@/lib/landingTheme';

interface MobileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
  accent?: PlainPageAccent;
}

/**
 * Mobile-first form dialog: scrollable body + sticky footer so save buttons are always reachable.
 */
export const MobileFormDialog: React.FC<MobileFormDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  accent = 'aqua',
}) => {
  const ui = plainPageAccentUi(accent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          'w-[calc(100vw-0.5rem)] max-w-lg',
          'max-h-[96dvh] sm:max-h-[90dvh]',
          'top-[50%] translate-y-[-50%]',
          'rounded-2xl',
          ui.borderLight,
          'border',
          className,
        )}
      >
        <DialogHeader
          className={cn(
            'shrink-0 px-4 pt-5 pb-3 pr-12 border-b text-left',
            ui.bgSoft,
            ui.borderLight,
          )}
        >
          <DialogTitle className="text-lg font-bold text-gray-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-600">{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MobileFormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  formId?: string;
  submitType?: 'submit' | 'button';
  onSubmit?: () => void;
  destructive?: boolean;
  accent?: PlainPageAccent;
}

export const MobileFormActions: React.FC<MobileFormActionsProps> = ({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  submitDisabled = false,
  formId,
  submitType = 'submit',
  onSubmit,
  destructive = false,
  accent = 'aqua',
}) => (
  <div className="flex flex-col-reverse sm:flex-row gap-2">
    <button
      type="button"
      onClick={onCancel}
      className="w-full sm:flex-1 min-h-[48px] rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
    >
      {cancelLabel}
    </button>
    <button
      type={submitType}
      form={formId}
      onClick={onSubmit}
      disabled={loading || submitDisabled}
      className={cn(
        'w-full sm:flex-1 min-h-[48px] rounded-xl font-semibold transition-colors disabled:opacity-60',
        destructive
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : cn(plainPageAccentBtn[accent], 'shadow-sm'),
      )}
    >
      {loading ? 'Guardando...' : submitLabel}
    </button>
  </div>
);
