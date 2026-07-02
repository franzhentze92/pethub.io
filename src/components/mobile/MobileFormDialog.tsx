import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MobileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
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
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className={cn(
        'flex flex-col gap-0 p-0 overflow-hidden',
        'w-[calc(100vw-0.5rem)] max-w-lg',
        'max-h-[96dvh] sm:max-h-[90dvh]',
        'top-[50%] translate-y-[-50%]',
        'rounded-2xl border-landing-aqua/15',
        className
      )}
    >
      <DialogHeader className="shrink-0 px-4 pt-5 pb-3 pr-12 border-b border-gray-100 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5 text-left">
        <DialogTitle className="text-lg font-bold text-gray-900">{title}</DialogTitle>
        {description && (
          <DialogDescription className="text-sm text-gray-500">{description}</DialogDescription>
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
        'w-full sm:flex-1 min-h-[48px] rounded-xl font-semibold text-white transition-colors disabled:opacity-60',
        destructive
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-gradient-to-r from-landing-aqua to-landing-mint hover:from-landing-aqua-dark hover:to-landing-mint-dark shadow-md'
      )}
    >
      {loading ? 'Guardando...' : submitLabel}
    </button>
  </div>
);
