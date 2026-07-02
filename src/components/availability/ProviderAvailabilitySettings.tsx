import React, { useEffect, useState } from 'react';
import { Calendar, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import {
  AvailabilityScheduleEditor,
  type ScheduleAvailabilityRow,
  type ScheduleTimeSlotRow,
} from '@/components/availability/AvailabilityScheduleEditor';

interface ProviderAvailabilitySettingsProps {
  providerId: string | undefined;
  fetchProviderAvailability: (providerId: string) => Promise<ScheduleAvailabilityRow[]>;
  fetchProviderTimeSlots: (providerId: string) => Promise<ScheduleTimeSlotRow[]>;
  saveProviderAvailability: (
    providerId: string,
    rows: Omit<ScheduleAvailabilityRow, 'id'>[]
  ) => Promise<void>;
  saveProviderTimeSlots: (
    providerId: string,
    rows: Omit<ScheduleTimeSlotRow, 'id'>[]
  ) => Promise<void>;
}

function toAvailabilityRows(
  rows: Array<{ id?: string; day_of_week: number; start_time: string; end_time: string; is_available: boolean }>
): ScheduleAvailabilityRow[] {
  return rows.map((row, index) => ({
    id: row.id ?? `avail-loaded-${index}`,
    day_of_week: row.day_of_week,
    start_time: row.start_time?.substring(0, 5) ?? '09:00',
    end_time: row.end_time?.substring(0, 5) ?? '17:00',
    is_available: row.is_available !== false,
  }));
}

function toTimeSlotRows(
  rows: Array<{
    id?: string;
    day_of_week: number;
    slot_start_time: string;
    slot_end_time: string;
    is_available: boolean;
    max_bookings_per_slot?: number;
  }>
): ScheduleTimeSlotRow[] {
  return rows.map((row, index) => ({
    id: row.id ?? `slot-loaded-${index}`,
    day_of_week: row.day_of_week,
    slot_start_time: row.slot_start_time?.substring(0, 5) ?? '09:00',
    slot_end_time: row.slot_end_time?.substring(0, 5) ?? '10:00',
    is_available: row.is_available !== false,
    max_bookings_per_slot: row.max_bookings_per_slot ?? 1,
  }));
}

export const ProviderAvailabilitySettings: React.FC<ProviderAvailabilitySettingsProps> = ({
  providerId,
  fetchProviderAvailability,
  fetchProviderTimeSlots,
  saveProviderAvailability,
  saveProviderTimeSlots,
}) => {
  const guidedTour = useBlueprintGuidedTourOptional();
  const [availability, setAvailability] = useState<ScheduleAvailabilityRow[]>([]);
  const [timeSlots, setTimeSlots] = useState<ScheduleTimeSlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!providerId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [availabilityData, timeSlotsData] = await Promise.all([
          fetchProviderAvailability(providerId),
          fetchProviderTimeSlots(providerId),
        ]);
        setAvailability(toAvailabilityRows(availabilityData));
        setTimeSlots(toTimeSlotRows(timeSlotsData));
      } catch (error) {
        console.error('Error loading provider availability:', error);
        toast.error('No se pudo cargar el horario del negocio');
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when provider changes
  }, [providerId]);

  const handleSave = async () => {
    if (!providerId) return;

    if (availability.length === 0 && timeSlots.length === 0) {
      toast.error('Agrega al menos un horario de disponibilidad');
      return;
    }

    setSaving(true);
    try {
      const availabilityPayload = availability.map(({ id: _id, ...row }) => row);
      const timeSlotsPayload = timeSlots.map(({ id: _id, ...row }) => row);

      await saveProviderAvailability(providerId, availabilityPayload);
      await saveProviderTimeSlots(providerId, timeSlotsPayload);

      void guidedTour?.notifySectionSaved('provider-availability');

      toast.success('Horario del negocio guardado. Aplica a todos tus servicios.');
    } catch (error) {
      console.error('Error saving provider availability:', error);
      toast.error('No se pudo guardar el horario del negocio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-landing-aqua-dark">
          <Calendar className="w-5 h-5" />
          Horario del Negocio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-landing-aqua/20 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10 p-4">
          <div className="flex items-start gap-2 text-landing-aqua-dark">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Configura tu horario una sola vez</p>
              <p className="text-gray-600">
                Este horario aplica automáticamente a todos tus servicios. Solo configura horarios
                distintos en un servicio si activas &quot;Horario personalizado&quot; al editarlo.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando horario...
          </div>
        ) : (
          <AvailabilityScheduleEditor
            availability={availability}
            timeSlots={timeSlots}
            onAvailabilityChange={setAvailability}
            onTimeSlotsChange={setTimeSlots}
          />
        )}

        <div className="flex justify-end pt-2 border-t border-landing-aqua/10">
          <Button
            data-blueprint-guided="save-provider-availability"
            onClick={handleSave}
            disabled={!providerId || saving || loading}
            className={cn(landingBtnPrimary, 'border-0')}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Horario del Negocio'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
