import React from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeletePet } from '@/hooks/useSettings'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeletePetDialogProps {
  isOpen: boolean
  onClose: () => void
  petName: string
  petId: string
}

const DeletePetDialog: React.FC<DeletePetDialogProps> = ({ isOpen, onClose, petName, petId }) => {
  const deletePet = useDeletePet()

  const handleDelete = async () => {
    try {
      await deletePet.mutateAsync(petId)
      onClose()
    } catch (error) {
      console.error('Error deleting pet:', error)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl border-landing-aqua/15 p-0 overflow-hidden">
        <AlertDialogHeader className="px-4 pt-5 pb-3 text-left bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100">
          <AlertDialogTitle className="text-lg font-bold text-gray-900">¿Eliminar mascota?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-600">
            Esta acción no se puede deshacer. Se eliminará permanentemente a <strong>{petName}</strong> y todos sus datos asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AlertDialogCancel className="w-full sm:flex-1 min-h-[48px] rounded-xl mt-0">
            Cancelar
          </AlertDialogCancel>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePet.isPending}
            className={cn(
              'w-full sm:flex-1 min-h-[48px] rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600',
              'inline-flex items-center justify-center disabled:opacity-60'
            )}
          >
            {deletePet.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeletePetDialog
