import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useProviderDashboardThemeOptional } from '@/contexts/ProviderDashboardThemeContext';
import { plainPageAccentOutlineBtn, plainPageAccentUi } from '@/lib/landingTheme';

export interface ScheduleAvailabilityRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface ScheduleTimeSlotRow {
  id: string;
  day_of_week: number;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  max_bookings_per_slot: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

interface AvailabilityScheduleEditorProps {
  availability: ScheduleAvailabilityRow[];
  timeSlots: ScheduleTimeSlotRow[];
  onAvailabilityChange: (rows: ScheduleAvailabilityRow[]) => void;
  onTimeSlotsChange: (rows: ScheduleTimeSlotRow[]) => void;
  disabled?: boolean;
  className?: string;
}

export const AvailabilityScheduleEditor: React.FC<AvailabilityScheduleEditorProps> = ({
  availability,
  timeSlots,
  onAvailabilityChange,
  onTimeSlotsChange,
  disabled = false,
  className,
}) => {
  const providerTheme = useProviderDashboardThemeOptional();
  const ui = providerTheme?.ui ?? plainPageAccentUi('mint');
  const outlineBtn = providerTheme?.outlineBtn ?? plainPageAccentOutlineBtn.mint;

  const addAvailability = (dayOfWeek: number) => {
    onAvailabilityChange([
      ...availability,
      {
        id: `avail-${Date.now()}-${dayOfWeek}`,
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      },
    ]);
  };

  const updateAvailability = (id: string, field: keyof ScheduleAvailabilityRow, value: string | boolean) => {
    onAvailabilityChange(
      availability.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeAvailability = (id: string) => {
    onAvailabilityChange(availability.filter((row) => row.id !== id));
  };

  const addTimeSlot = (dayOfWeek: number) => {
    onTimeSlotsChange([
      ...timeSlots,
      {
        id: `slot-${Date.now()}-${dayOfWeek}`,
        day_of_week: dayOfWeek,
        slot_start_time: '09:00',
        slot_end_time: '10:00',
        is_available: true,
        max_bookings_per_slot: 1,
      },
    ]);
  };

  const updateTimeSlot = (
    id: string,
    field: keyof ScheduleTimeSlotRow,
    value: string | number | boolean
  ) => {
    onTimeSlotsChange(
      timeSlots.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeTimeSlot = (id: string) => {
    onTimeSlotsChange(timeSlots.filter((row) => row.id !== id));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card className={cn('rounded-xl border', ui.borderLight)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('flex items-center gap-2 text-base', ui.text)}>
            <Calendar className="w-5 h-5" />
            Horarios de Disponibilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.value} className={cn('rounded-xl border p-4', ui.borderLight)}>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h4 className="font-medium text-gray-800">{day.label}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => addAvailability(day.value)}
                  className={outlineBtn}
                >
                  Agregar Horario
                </Button>
              </div>

              {availability
                .filter((row) => row.day_of_week === day.value)
                .map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 mb-2">
                    <Select
                      value={row.start_time}
                      onValueChange={(value) => updateAvailability(row.id, 'start_time', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500">a</span>
                    <Select
                      value={row.end_time}
                      onValueChange={(value) => updateAvailability(row.id, 'end_time', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => removeAvailability(row.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={cn('rounded-xl border', ui.borderLight)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('flex items-center gap-2 text-base', ui.text)}>
            <Clock className="w-5 h-5" />
            Franjas Horarias Específicas (opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.value} className={cn('rounded-xl border p-4', ui.borderLight)}>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h4 className="font-medium text-gray-800">{day.label}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => addTimeSlot(day.value)}
                  className={outlineBtn}
                >
                  Agregar Franja
                </Button>
              </div>

              {timeSlots
                .filter((row) => row.day_of_week === day.value)
                .map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 mb-2">
                    <Select
                      value={row.slot_start_time}
                      onValueChange={(value) => updateTimeSlot(row.id, 'slot_start_time', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500">a</span>
                    <Select
                      value={row.slot_end_time}
                      onValueChange={(value) => updateTimeSlot(row.id, 'slot_end_time', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      disabled={disabled}
                      value={row.max_bookings_per_slot}
                      onChange={(e) =>
                        updateTimeSlot(row.id, 'max_bookings_per_slot', parseInt(e.target.value, 10) || 1)
                      }
                      className="w-20"
                      placeholder="Max"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => removeTimeSlot(row.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
