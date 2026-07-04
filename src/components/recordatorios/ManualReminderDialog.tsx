import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { landingBtnSolidMint } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  createPetReminder,
  PET_REMINDER_TYPE_LABELS,
  type CreatePetReminderInput,
  type PetReminderFrequency,
  type PetReminderPriority,
  type PetReminderType,
} from '@/lib/petReminders';
import type { PetSummary } from '@/lib/recordatorioTypes';

interface ManualReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pets: PetSummary[];
  ownerId: string;
  onCreated: () => void;
}

const defaultForm = {
  pet_id: '',
  reminder_type: 'medication' as PetReminderType,
  title: '',
  description: '',
  scheduled_date: new Date().toISOString().split('T')[0],
  scheduled_time: '',
  frequency: 'once' as PetReminderFrequency,
  priority: 'medium' as PetReminderPriority,
};

export const ManualReminderDialog: React.FC<ManualReminderDialogProps> = ({
  open,
  onOpenChange,
  pets,
  ownerId,
  onCreated,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && pets.length > 0 && !form.pet_id) {
      setForm((prev) => ({ ...prev, pet_id: pets[0].id }));
    }
  }, [open, pets, form.pet_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pet_id || !form.title || !form.scheduled_date) return;

    setSaving(true);
    try {
      const input: CreatePetReminderInput = {
        pet_id: form.pet_id,
        owner_id: ownerId,
        reminder_type: form.reminder_type,
        title: form.title,
        description: form.description || undefined,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time || undefined,
        frequency: form.frequency,
        priority: form.priority,
      };
      await createPetReminder(input);
      setForm({ ...defaultForm, pet_id: pets[0]?.id ?? '' });
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-landing-mint-dark" />
            Nuevo recordatorio
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Mascota</Label>
            <Select value={form.pet_id} onValueChange={(v) => setForm((p) => ({ ...p, pet_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona mascota" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={form.reminder_type}
              onValueChange={(v) => setForm((p) => ({ ...p, reminder_type: v as PetReminderType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PET_REMINDER_TYPE_LABELS) as PetReminderType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {PET_REMINDER_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reminder-title">Título</Label>
            <Input
              id="reminder-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej. Dar antiparasitario"
              required
            />
          </div>

          <div>
            <Label htmlFor="reminder-desc">Descripción (opcional)</Label>
            <Textarea
              id="reminder-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="reminder-date">Fecha</Label>
              <Input
                id="reminder-date"
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="reminder-time">Hora (opcional)</Label>
              <Input
                id="reminder-time"
                type="time"
                value={form.scheduled_time}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm((p) => ({ ...p, frequency: v as PetReminderFrequency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Una vez</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((p) => ({ ...p, priority: v as PetReminderPriority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.title} className={cn(landingBtnSolidMint)}>
              {saving ? 'Guardando…' : 'Crear recordatorio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualReminderDialog;
