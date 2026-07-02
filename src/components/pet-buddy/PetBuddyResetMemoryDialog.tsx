import React from 'react';
import { Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PetBuddyAvatar } from '@/components/PetAvatar';
import { cn } from '@/lib/utils';

interface PetBuddyResetMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  messageCount?: number;
  guideName?: string;
  guideImage?: string;
}

export const PetBuddyResetMemoryDialog: React.FC<PetBuddyResetMemoryDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  messageCount = 0,
  guideName = 'Atis',
  guideImage,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-[340px] rounded-2xl border border-landing-aqua/20 p-0 overflow-hidden gap-0',
          'shadow-2xl shadow-landing-aqua/10 [&>button]:hidden'
        )}
      >
        <div className="h-1.5 bg-gradient-to-r from-landing-aqua via-landing-mint to-landing-mango" />

        <div className="px-5 pt-5 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white">
                {guideImage ? (
                  <img src={guideImage} alt={guideName} className="h-full w-full object-cover" />
                ) : (
                  <PetBuddyAvatar bare size="sm" className="h-full w-full" />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-100 border-2 border-white flex items-center justify-center">
                  <Trash2 className="w-2.5 h-2.5 text-red-600" />
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-base font-bold text-gray-900 leading-snug">
                  ¿Resetear la memoria?
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  Se borrará todo el historial del chat con {guideName}.
                  {messageCount > 0 ? (
                    <>
                      {' '}
                      Tienes <span className="font-medium text-gray-800">{messageCount}</span>{' '}
                      {messageCount === 1 ? 'mensaje' : 'mensajes'} guardados.
                    </>
                  ) : null}{' '}
                  Esta acción no se puede deshacer.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <DialogFooter className="flex-row gap-2 px-5 pb-5 sm:space-x-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'flex-1 inline-flex items-center justify-center h-10 rounded-xl text-sm font-medium',
              'border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors'
            )}
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn(
              'flex-1 inline-flex items-center justify-center h-10 rounded-xl text-sm font-semibold text-white',
              'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
              'shadow-md shadow-red-500/20 transition-all active:scale-[0.98]'
            )}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Sí, resetear
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PetBuddyResetMemoryDialog;
