import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Stethoscope, Utensils, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { landingBtnSolidMint } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

interface RecordatoriosEmptyStateProps {
  hasPets: boolean;
  selectedDateLabel?: string;
  onCreateReminder: () => void;
}

export const RecordatoriosEmptyState: React.FC<RecordatoriosEmptyStateProps> = ({
  hasPets,
  selectedDateLabel,
  onCreateReminder,
}) => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-10 px-2">
      <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <p className="font-medium text-gray-700">No hay recordatorios</p>
      <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        {selectedDateLabel
          ? `No hay recordatorios para el ${selectedDateLabel}.`
          : 'Los recordatorios aparecen cuando registras vacunas, citas veterinarias, horarios de comida o creas alertas personalizadas.'}
      </p>

      <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2">
        {hasPets && (
          <Button
            onClick={onCreateReminder}
            data-blueprint-guided="create-reminder"
            className={cn('min-h-[44px]', landingBtnSolidMint)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo recordatorio
          </Button>
        )}
        <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/veterinaria')}>
          <Stethoscope className="h-4 w-4 mr-2" />
          Ir a Veterinaria
        </Button>
        <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/feeding-schedules')}>
          <Utensils className="h-4 w-4 mr-2" />
          Horarios de comida
        </Button>
        {!hasPets && (
          <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/pet-creation')}>
            <PawPrint className="h-4 w-4 mr-2" />
            Registrar mascota
          </Button>
        )}
      </div>
    </div>
  );
};

export default RecordatoriosEmptyState;
