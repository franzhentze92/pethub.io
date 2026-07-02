import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import {
  Stethoscope,
  Plus,
  Syringe,
  FileText,
  PawPrint,
  Info,
  Activity,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary, landingCardThemes, landingFeatureGradients } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  HEALTH_JOURNAL_VISIT_TYPES,
  appointmentTypeToHealthJournalVisitType,
  healthJournalVisitTypeToAppointmentType,
  type HealthRecordVisitType,
} from '@/lib/veterinaryTypes';
import {
  getVaccinationStatusLabel,
} from '@/lib/vaccinationCatalog';
import {
  getLatestVaccinationPerSlug,
  mapPetVaccinationRow,
  upsertPetVaccinationFromSession,
  type PetVaccinationRow,
} from '@/lib/petVaccinations';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  image_url?: string;
}

interface HealthRecord {
  id: string;
  pet_id: string;
  visit_type: HealthRecordVisitType;
  date: string;
  veterinarian: string;
  clinic: string;
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  notes?: string;
  cost?: number;
  follow_up_date?: string;
}

interface Vaccination {
  id: string;
  name: string;
  date_given: string;
  next_due: string | null;
  status: 'current' | 'due_soon' | 'overdue' | 'unknown';
}

interface VeterinarySessionRow {
  id: string;
  pet_id: string;
  appointment_type: string;
  date: string;
  veterinarian_name: string;
  veterinary_clinic?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  prescription?: string | null;
  follow_up_date?: string | null;
  cost?: number | null;
}

const mapSessionToHealthRecord = (session: VeterinarySessionRow): HealthRecord => {
  const visitType = appointmentTypeToHealthJournalVisitType(session.appointment_type);
  return {
    id: session.id,
    pet_id: session.pet_id,
    visit_type: visitType,
    date: session.date,
    veterinarian: session.veterinarian_name,
    clinic: session.veterinary_clinic || '',
    diagnosis: session.diagnosis || undefined,
    treatment: session.treatment || undefined,
    medications: session.prescription || undefined,
    notes: session.notes || undefined,
    cost: session.cost ?? undefined,
    follow_up_date: session.follow_up_date || undefined,
  };
};

const HealthJournal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(false);
  const [overdueVaccinations, setOverdueVaccinations] = useState(0);
  const [dueSoonVaccinations, setDueSoonVaccinations] = useState(0);
  const [currentVaccinations, setCurrentVaccinations] = useState(0);
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState<number | null>(null);
  const [totalVetCost, setTotalVetCost] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const [quickHealthForm, setQuickHealthForm] = useState({
    visit_type: 'checkup',
    veterinarian: '',
    clinic: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    notes: '',
    cost: '',
  });

  useEffect(() => {
    if (user) {
      loadPets();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPet) {
      loadHealthRecords();
      loadVaccinations();
    }
  }, [selectedPet]);

  useEffect(() => {
    calculatePetStats();
  }, [healthRecords, vaccinations]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase.from('pets').select('*').eq('owner_id', user?.id);

      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const loadHealthRecords = async () => {
    if (!selectedPet) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('veterinary_sessions')
        .select('*')
        .eq('pet_id', selectedPet.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setHealthRecords((data ?? []).map((session) => mapSessionToHealthRecord(session as VeterinarySessionRow)));
    } catch (error) {
      console.error('Error loading health records:', error);
      setHealthRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVaccinations = async () => {
    if (!selectedPet) return;

    try {
      const { data, error } = await supabase
        .from('pet_vaccinations')
        .select(`
          *,
          pets(name, species)
        `)
        .eq('pet_id', selectedPet.id)
        .order('administered_at', { ascending: false });

      if (error) throw error;

      setVaccinations(
        getLatestVaccinationPerSlug(
          (data ?? []).map((row) => mapPetVaccinationRow(row as PetVaccinationRow)),
        ).map((display) => ({
          id: display.id,
          name: display.vaccine_name,
          date_given: display.administered_at,
          next_due: display.next_due_date,
          status: display.status,
        })),
      );
    } catch (error) {
      console.error('Error loading vaccinations:', error);
      setVaccinations([]);
    }
  };

  const calculatePetStats = () => {
    setOverdueVaccinations(vaccinations.filter((v) => v.status === 'overdue').length);
    setDueSoonVaccinations(vaccinations.filter((v) => v.status === 'due_soon').length);
    setCurrentVaccinations(vaccinations.filter((v) => v.status === 'current').length);
    setTotalVetCost(healthRecords.reduce((sum, record) => sum + (record.cost ?? 0), 0));

    if (healthRecords.length > 0) {
      const lastVisit = new Date(healthRecords[0].date);
      setDaysSinceLastVisit(
        Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)),
      );
    } else {
      setDaysSinceLastVisit(null);
    }
  };

  const handleQuickHealthRecord = async () => {
    if (!selectedPet || !user?.id || !quickHealthForm.veterinarian || !quickHealthForm.clinic) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const appointmentType = healthJournalVisitTypeToAppointmentType(quickHealthForm.visit_type);
      const today = new Date().toISOString().split('T')[0];

      const { data: inserted, error } = await supabase.from('veterinary_sessions').insert({
        pet_id: selectedPet.id,
        owner_id: user.id,
        appointment_type: appointmentType,
        date: today,
        veterinarian_name: quickHealthForm.veterinarian,
        veterinary_clinic: quickHealthForm.clinic,
        diagnosis: quickHealthForm.diagnosis || 'Registro desde Health Journal',
        treatment: quickHealthForm.treatment || null,
        prescription: quickHealthForm.medications || null,
        notes: quickHealthForm.notes || null,
        cost: quickHealthForm.cost ? parseFloat(quickHealthForm.cost) : null,
      }).select('id').single();

      if (error) throw error;

      if (quickHealthForm.visit_type === 'vaccination' && inserted?.id) {
        await upsertPetVaccinationFromSession({
          petId: selectedPet.id,
          ownerId: user.id,
          administeredAt: today,
          vaccineName: quickHealthForm.diagnosis || 'Vacunación',
          veterinarianName: quickHealthForm.veterinarian,
          veterinaryClinic: quickHealthForm.clinic,
          sessionId: inserted.id,
          notes: quickHealthForm.notes,
          petSpecies: selectedPet.species,
        });
      }

      await loadHealthRecords();
      await loadVaccinations();
      setActiveTab('history');

      toast({
        title: 'Registro guardado',
        description: `Visita de ${selectedPet.name} registrada correctamente.`,
      });

      setQuickHealthForm({
        visit_type: 'checkup',
        veterinarian: '',
        clinic: '',
        diagnosis: '',
        treatment: '',
        medications: '',
        notes: '',
        cost: '',
      });
    } catch (error) {
      console.error('Error saving health record:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el registro de salud',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPetHealthMood = () => {
    if (overdueVaccinations > 0)
      return { message: `${overdueVaccinations} vacuna(s) vencida(s)`, icon: '💉', color: 'text-red-600' };
    if (dueSoonVaccinations > 0)
      return { message: `${dueSoonVaccinations} vacuna(s) por vencer`, icon: '⚠️', color: 'text-orange-600' };
    if (healthRecords.length === 0)
      return { message: 'Sin visitas registradas', icon: '📋', color: 'text-gray-600' };
    if (daysSinceLastVisit != null && daysSinceLastVisit > 365)
      return { message: 'Revisión anual pendiente', icon: '🩺', color: 'text-landing-mango-dark' };
    return { message: 'Vacunación al día', icon: '😊', color: 'text-landing-mint-dark' };
  };

  const getVisitTypeLabel = (visitType: string) => {
    const match = HEALTH_JOURNAL_VISIT_TYPES.find((item) => item.value === visitType);
    return match?.label ?? visitType;
  };

  const getPetEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog':
        return '🐕';
      case 'cat':
        return '🐱';
      case 'bird':
        return '🐦';
      case 'fish':
        return '🐠';
      default:
        return '🐾';
    }
  };

  const healthTabs: MobileTabItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Resumen', shortLabel: 'Resumen', icon: Activity, gradientIndex: 0 },
      { id: 'register', label: 'Registrar', shortLabel: 'Registrar', icon: Plus, gradientIndex: 2 },
      { id: 'history', label: 'Historial', shortLabel: 'Historial', icon: FileText, gradientIndex: 4 },
    ],
    [],
  );

  const statCards = [
    { label: 'Visitas', value: String(healthRecords.length), sub: 'Registradas' },
    { label: 'Vacunas al día', value: String(currentVaccinations), sub: 'Vigentes' },
    { label: 'Vacunas vencidas', value: String(overdueVaccinations), sub: 'Requieren atención' },
    {
      label: 'Gasto vet.',
      value: totalVetCost > 0 ? `$${totalVetCost.toFixed(0)}` : '—',
      sub: 'Total registrado',
    },
  ];

  const petHealthMood = getPetHealthMood();

  if (!selectedPet) {
    return (
      <DashboardShell>
        <PageHeader title="Health Journal" subtitle="Historial de salud y bienestar de tus mascotas">
          <Stethoscope className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </PageHeader>
        <MobileSectionCard>
          <div className="text-center py-10 px-4">
            <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-800">Primero agrega una mascota</p>
            <p className="text-sm text-gray-500 mt-1 mb-4 max-w-sm mx-auto">
              Necesitas al menos una mascota para comenzar su historial de salud.
            </p>
            <Button className={landingBtnPrimary} onClick={() => navigate('/pet-creation')}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar mascota
            </Button>
          </div>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="Health Journal" subtitle={`Salud y bienestar de ${selectedPet.name}`}>
        <Stethoscope className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {selectedPet.image_url ? (
                <img
                  src={selectedPet.image_url}
                  alt={selectedPet.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-white shadow-lg shrink-0"
                />
              ) : (
                <div
                  className={cn(
                    'w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-2xl border-4 border-white shadow-lg shrink-0 bg-gradient-to-r',
                    landingFeatureGradients[0],
                  )}
                >
                  {getPetEmoji(selectedPet.species)}
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedPet.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg">{petHealthMood.icon}</span>
                  <span className={cn('text-sm', petHealthMood.color)}>{petHealthMood.message}</span>
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="flex items-center gap-4 sm:justify-end mb-2">
                <div className="flex items-center gap-1">
                  <Stethoscope className="w-4 h-4 text-landing-aqua-dark" />
                  <span className="font-bold text-gray-900">{healthRecords.length} visitas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Syringe className="w-4 h-4 text-landing-mango-dark" />
                  <span className="font-bold text-gray-900">{currentVaccinations} vacunas</span>
                </div>
              </div>
              <div className="w-full sm:w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint transition-all duration-500"
                  style={{
                    width: `${
                      vaccinations.length > 0
                        ? Math.min(100, (currentVaccinations / vaccinations.length) * 100)
                        : healthRecords.length > 0
                          ? 100
                          : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      <MobileTabStrip tabs={healthTabs} activeTab={activeTab} onChange={setActiveTab} columns={3} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat, index) => {
              const theme = landingCardThemes[index % landingCardThemes.length];
              return (
                <div key={stat.label} className={cn('rounded-2xl border p-4 backdrop-blur-sm', theme.bg, theme.border)}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                </div>
              );
            })}
          </div>

          {vaccinations.length > 0 && (
            <MobileSectionCard>
              <div className="p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
                  <Syringe className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                  Estado de vacunaciones
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vaccinations.map((vaccination) => (
                    <div
                      key={vaccination.id}
                      className={cn(
                        'rounded-xl border p-4',
                        vaccination.status === 'current'
                          ? 'bg-landing-mint/10 border-landing-mint/25'
                          : vaccination.status === 'due_soon'
                            ? 'bg-landing-mango/10 border-landing-mango/25'
                            : 'bg-red-50 border-red-200',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{vaccination.name}</h4>
                          <p className="text-sm text-gray-600 mt-0.5">
                            Próxima:{' '}
                            {vaccination.next_due
                              ? new Date(vaccination.next_due).toLocaleDateString('es-GT')
                              : 'Sin fecha'}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            'shrink-0',
                            vaccination.status === 'current'
                              ? 'bg-landing-mint/15 text-landing-mint-dark border border-landing-mint/30'
                              : vaccination.status === 'due_soon'
                                ? 'bg-landing-mango/15 text-landing-mango-dark border border-landing-mango/30'
                                : 'bg-red-100 text-red-800 border border-red-200',
                          )}
                        >
                          {getVaccinationStatusLabel(vaccination.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </MobileSectionCard>
          )}

          <MobileSectionCard>
            <div className="p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                <Info className="w-4 h-4 text-landing-aqua-dark shrink-0" />
                Consejos de salud
              </h3>
              <ul className="text-sm text-gray-600 space-y-2 leading-relaxed">
                <li>• Lleva a {selectedPet.name} a revisiones regulares y regístralas aquí</li>
                <li>• Mantén las vacunaciones al día según el calendario de tu veterinario</li>
                <li>
                  •{' '}
                  {daysSinceLastVisit != null
                    ? `Última visita hace ${daysSinceLastVisit} día(s)`
                    : 'Aún no hay visitas registradas'}
                </li>
                <li>• También puedes registrar visitas desde Veterinaria en Cuidado</li>
              </ul>
            </div>
          </MobileSectionCard>
        </div>
      )}

      {activeTab === 'register' && (
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
              <Stethoscope className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Registrar visita médica
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="visit-type">Tipo de visita</Label>
                <Select
                  value={quickHealthForm.visit_type}
                  onValueChange={(value) => setQuickHealthForm((prev) => ({ ...prev, visit_type: value }))}
                >
                  <SelectTrigger className="bg-white/90">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEALTH_JOURNAL_VISIT_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="veterinarian">Veterinario *</Label>
                <Input
                  id="veterinarian"
                  value={quickHealthForm.veterinarian}
                  onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, veterinarian: e.target.value }))}
                  placeholder="Dr. María González"
                  className="bg-white/90"
                />
              </div>
              <div>
                <Label htmlFor="clinic">Clínica *</Label>
                <Input
                  id="clinic"
                  value={quickHealthForm.clinic}
                  onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, clinic: e.target.value }))}
                  placeholder="Clínica Veterinaria"
                  className="bg-white/90"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Input
                  id="diagnosis"
                  value={quickHealthForm.diagnosis}
                  onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Salud excelente"
                  className="bg-white/90"
                />
              </div>
              <div>
                <Label htmlFor="treatment">Tratamiento</Label>
                <Input
                  id="treatment"
                  value={quickHealthForm.treatment}
                  onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, treatment: e.target.value }))}
                  placeholder="Revisión general"
                  className="bg-white/90"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="medications">Medicamentos</Label>
                <Input
                  id="medications"
                  value={quickHealthForm.medications}
                  onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, medications: e.target.value }))}
                  placeholder="Ninguna"
                  className="bg-white/90"
                />
              </div>
              <div>
                <Label htmlFor="cost">Costo (Q)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={quickHealthForm.cost}
                  onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, cost: e.target.value }))}
                  placeholder="50"
                  className="bg-white/90"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={quickHealthForm.notes}
                onChange={(e) => setQuickHealthForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="¿Cómo se comportó tu mascota? ¿Algún detalle importante?"
                rows={3}
                className="bg-white/90 resize-none"
              />
            </div>

            <Button onClick={handleQuickHealthRecord} className={cn('w-full mt-4 min-h-[44px]', landingBtnPrimary)}>
              <Stethoscope className="w-4 h-4 mr-2" />
              Guardar registro de salud
            </Button>
          </div>
        </MobileSectionCard>
      )}

      {activeTab === 'history' && (
        <MobileSectionCard>
          <div className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
              <FileText className="w-5 h-5 text-landing-aqua-dark shrink-0" />
              Historial de salud
            </h3>

            {loading ? (
              <SectionLoader message="Cargando historial…" />
            ) : healthRecords.length === 0 ? (
              <div className="text-center py-10 px-2">
                <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">Aún no hay registros de salud</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">Registra la primera visita médica de tu mascota.</p>
                <Button variant="outline" className="min-h-[44px]" onClick={() => setActiveTab('register')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar visita
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {healthRecords.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-white/60 bg-white/70 border-l-4 border-l-landing-aqua p-3 sm:p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{getVisitTypeLabel(record.visit_type)}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {record.veterinarian}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString('es-GT')} · {record.clinic}
                        </p>
                        {record.diagnosis && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            <span className="font-medium text-gray-700">Diagnóstico:</span> {record.diagnosis}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            <span className="font-medium text-gray-700">Notas:</span> {record.notes}
                          </p>
                        )}
                      </div>
                      {record.cost != null && record.cost > 0 && (
                        <div className="flex items-center gap-1 shrink-0 text-sm text-gray-600">
                          <span className="font-medium">${record.cost.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MobileSectionCard>
      )}
    </DashboardShell>
  );
};

export default HealthJournal;
