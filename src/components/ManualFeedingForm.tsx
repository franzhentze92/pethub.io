import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatPetOptionLabel, formatSpeciesLabel } from '@/utils/petLabels';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary } from '@/lib/landingTheme';
import {
  NutritionFormSection,
  nutritionFieldClass,
} from './nutrition/NutritionFormUi';
import {
  buildNutritionSessionPayload,
  defaultFeedingTime,
  MEAL_TYPE_LABELS,
  normalizeMealType,
  type MealType,
  type PetFoodRecord,
} from '@/utils/nutritionSession';
import { cn } from '@/lib/utils';
import { fetchMergedNutritionFoodCatalog } from '@/utils/nutritionFoodCatalog';
import { Save, Utensils, AlertCircle } from 'lucide-react';
import { ActionConfirmDialog } from './ui/ActionConfirmDialog';

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface PetFood extends PetFoodRecord {
  id: string;
  species: string;
  is_available: boolean;
}

const ManualFeedingForm: React.FC = () => {
  const { user } = useAuth();

  const [selectedPet, setSelectedPet] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [quantity, setQuantity] = useState('');
  const [feedingTime, setFeedingTime] = useState(defaultFeedingTime());
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState('');
  const [notes, setNotes] = useState('');

  const [pets, setPets] = useState<Pet[]>([]);
  const [availableFoods, setAvailableFoods] = useState<PetFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);

  const mealTypes = (Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([value, label]) => ({
    value,
    label,
  }));

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      loadFoodsForPet(selectedPet);
    } else {
      setAvailableFoods([]);
      setSelectedFood('');
    }
  }, [selectedPet]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species')
        .eq('owner_id', user?.id);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      toast.error('Error al cargar mascotas');
    }
  };

  const loadFoodsForPet = async (petId: string) => {
    try {
      setLoadingFoods(true);
      const pet = pets.find((p) => p.id === petId);
      if (!pet) return;

      const { foods } = await fetchMergedNutritionFoodCatalog({ species: pet.species });
      setAvailableFoods(
        foods.map((food) => ({
          ...food,
          species: food.species ?? pet.species,
          is_available: food.is_available ?? true,
        })) as PetFood[],
      );
    } catch (error) {
      console.error('Error loading foods:', error);
      toast.error('Error al cargar alimentos');
    } finally {
      setLoadingFoods(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !selectedPet || !selectedFood || !quantity || !mealType) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setShowConfirm(true);
  };

  const performSave = async () => {
    setShowConfirm(false);
    if (!user?.id || !selectedPet || !selectedFood || !quantity || !mealType) return;

    try {
      setLoading(true);
      const food = availableFoods.find((f) => f.id === selectedFood);
      if (!food) throw new Error('Alimento no encontrado');

      const payload = buildNutritionSessionPayload({
        petId: selectedPet,
        ownerId: user.id,
        food,
        quantityGrams: parseFloat(quantity),
        mealType: normalizeMealType(mealType),
        feedingDate,
        feedingTime,
        notes: notes || undefined,
        source: 'manual',
      });

      const { error } = await supabase.from('nutrition_sessions').insert(payload);
      if (error) throw error;

      toast.success('Alimentación registrada correctamente');
      resetForm();
    } catch (error) {
      console.error('Error saving manual feeding:', error);
      toast.error('Error al registrar la alimentación');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPet('');
    setSelectedFood('');
    setQuantity('');
    setFeedingTime(defaultFeedingTime());
    setFeedingDate(new Date().toISOString().split('T')[0]);
    setMealType('');
    setNotes('');
  };

  return (
    <>
    <MobileSectionCard className="overflow-hidden">
      <div className="px-4 sm:px-5 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-r from-landing-mango/10 to-landing-tropical/10">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Utensils className="w-5 h-5 text-landing-mango-dark" />
          Registro manual
        </h3>
        <p className="text-sm text-gray-500 mt-1">Anota comidas fuera del horario automático.</p>
      </div>

      <div className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <NutritionFormSection title="Mascota y alimento" icon={Utensils}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="pet">Mascota *</Label>
                <Select value={selectedPet} onValueChange={setSelectedPet}>
                  <SelectTrigger className={nutritionFieldClass}>
                    <SelectValue placeholder="Seleccionar mascota" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {formatPetOptionLabel(pet)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="food">Alimento *</Label>
                <Select
                  value={selectedFood}
                  onValueChange={setSelectedFood}
                  disabled={!selectedPet || loadingFoods || availableFoods.length === 0}
                >
                  <SelectTrigger className={nutritionFieldClass}>
                    <SelectValue
                      placeholder={
                        !selectedPet
                          ? 'Selecciona una mascota'
                          : loadingFoods
                            ? 'Cargando...'
                            : availableFoods.length === 0
                              ? 'Sin alimentos'
                              : 'Seleccionar alimento'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFoods.map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.brand} - {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </NutritionFormSection>

          <NutritionFormSection title="Detalle de la comida" icon={Utensils}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Cantidad (g) *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  min="0"
                  className={nutritionFieldClass}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ej: 150"
                />
              </div>
              <div>
                <Label htmlFor="mealType">Tipo *</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger className={nutritionFieldClass}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="feedingTime">Hora *</Label>
                <Input
                  id="feedingTime"
                  type="time"
                  className={nutritionFieldClass}
                  value={feedingTime}
                  onChange={(e) => setFeedingTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="feedingDate">Fecha</Label>
                <Input
                  id="feedingDate"
                  type="date"
                  className={nutritionFieldClass}
                  value={feedingDate}
                  onChange={(e) => setFeedingDate(e.target.value)}
                />
              </div>
            </div>
          </NutritionFormSection>

          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre esta alimentación..."
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={loading}
              className={cn('flex-1 min-h-[48px]', landingBtnPrimary)}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Registrando...' : 'Registrar alimentación'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} disabled={loading} className="min-h-[48px]">
              Limpiar
            </Button>
          </div>
        </form>

        <div className="mt-5 p-4 bg-landing-aqua/10 border border-landing-aqua/20 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-landing-aqua mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">¿Cuándo usar registro manual?</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>Meriendas fuera del horario regular</li>
                <li>Comidas especiales o medicamentos</li>
                <li>Corregir o agregar comidas pasadas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MobileSectionCard>

    <ActionConfirmDialog
      open={showConfirm}
      onOpenChange={setShowConfirm}
      title="Confirmar registro de nutrición"
      description="Revisa los datos antes de registrar la comida."
      confirmLabel="Registrar"
      fields={[
        { label: 'Mascota', value: pets.find((p) => p.id === selectedPet)?.name || '—' },
        {
          label: 'Alimento',
          value: (() => {
            const food = availableFoods.find((f) => f.id === selectedFood);
            return food ? `${food.brand} - ${food.name}` : '—';
          })(),
        },
        { label: 'Cantidad', value: `${quantity} g` },
        { label: 'Comida', value: MEAL_TYPE_LABELS[normalizeMealType(mealType) as MealType] || mealType },
        { label: 'Fecha', value: feedingDate },
        { label: 'Hora', value: feedingTime },
        ...(notes ? [{ label: 'Notas', value: notes }] : []),
      ]}
      onConfirm={performSave}
      loading={loading}
      onEdit={() => setShowConfirm(false)}
    />
    </>
  );
};

export default ManualFeedingForm;
