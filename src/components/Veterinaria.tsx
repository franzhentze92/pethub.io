import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Stethoscope,
  Plus,
  Calendar,
  Filter,
  TrendingUp,
  BarChart3,
  FileImage,
  Edit,
  Trash2,
  Receipt,
  Info,
  PawPrint,
  DollarSign,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { PageLoader } from './PageLoader';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnSolidMint, landingChartColors, solidCardThemeAt } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { formatPetOptionLabel } from '@/utils/petLabels';
import { formatExtractionPreview, parseVetDocument } from '@/lib/parseVetDocument';
import type { VetDocumentExtraction } from '@/lib/vetDocumentTypes';
import {
  getVaccinesForSpecies,
  getVaccineBySlug,
  resolveNextDueDate,
  type VaccineCatalogEntry,
} from '@/lib/vaccinationCatalog';
import { loadVaccineCatalog, upsertPetVaccinationFromSession } from '@/lib/petVaccinations';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import { isVaccinationType, VETERINARY_APPOINTMENT_TYPES } from '@/lib/veterinaryTypes';
import {
  getFollowUpNotificationId,
  getVaccinationNotificationId,
  getVetReminderNotificationId,
  loadVeterinaryPageUnreadIds,
  markVeterinaryNotificationsRead,
  markVeterinaryNotificationsReadForPet,
  sessionHasUnreadNotification,
} from '@/utils/veterinaryNotifications';
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  weight?: number;
}

interface VeterinarySession {
  id: string;
  pet_id: string;
  pet_name: string;
  appointment_type: string;
  date: string;
  veterinarian_name: string;
  veterinary_clinic?: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  prescription: string;
  follow_up_date: string;
  cost: number;
  pdf_url?: string;
  invoice_url?: string;
  created_at: string;
  document_extractions?: VetDocumentExtraction[];
}

const Veterinaria: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deepLinkHandled = useRef<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [veterinarySessions, setVeterinarySessions] = useState<VeterinarySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedPetForAnalytics, setSelectedPetForAnalytics] = useState('all');
  const [activeTab, setActiveTab] = useState('register');
  const guidedTour = useBlueprintGuidedTourOptional();
  
  // Form states
  const [selectedPet, setSelectedPet] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [veterinarianName, setVeterinarianName] = useState('');
  const [veterinaryClinic, setVeterinaryClinic] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [cost, setCost] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [editingSession, setEditingSession] = useState<VeterinarySession | null>(null);
  const [vaccineCatalog, setVaccineCatalog] = useState<VaccineCatalogEntry[]>([]);
  const [selectedVaccineSlug, setSelectedVaccineSlug] = useState('');
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  const loadPets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species, breed, weight')
        .eq('owner_id', user?.id);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      toast.error('No se pudieron cargar tus mascotas.');
    }
  }, [user?.id]);

  const loadVeterinarySessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('veterinary_sessions')
        .select(`
          *,
          pets(name)
        `)
        .eq('owner_id', user?.id)
        .order('date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
          setVeterinarySessions([]);
          return;
        }
        console.error('Error loading veterinary sessions:', error);
        setVeterinarySessions([]);
        return;
      }

      const { data: extractions } = await supabase
        .from('vet_document_extractions')
        .select('*')
        .eq('owner_id', user?.id);

      const extractionsBySession = (extractions ?? []).reduce<Record<string, VetDocumentExtraction[]>>(
        (acc, row) => {
          const list = acc[row.session_id] ?? [];
          list.push(row as VetDocumentExtraction);
          acc[row.session_id] = list;
          return acc;
        },
        {},
      );

      const formattedSessions =
        data?.map((session) => ({
          ...session,
          pet_name: session.pets?.name || 'Mascota desconocida',
          document_extractions: extractionsBySession[session.id] ?? [],
        })) || [];

      setVeterinarySessions(formattedSessions);
    } catch (error) {
      console.error('Error loading veterinary sessions:', error);
      setVeterinarySessions([]);
    }
  }, [user?.id]);

  const queueDocumentParsing = useCallback(
    async (
      sessionId: string,
      documentUrl: string,
      documentType: 'lab_results' | 'invoice',
      forceReparse = false,
    ) => {
      const result = await parseVetDocument({
        sessionId,
        documentUrl,
        documentType,
        forceReparse,
      });

      if (result.success) {
        toast.success(
          documentType === 'lab_results'
            ? 'Resultados del PDF analizados correctamente.'
            : 'Factura analizada correctamente.',
        );
        await loadVeterinarySessions();
        return;
      }

      toast.error(result.error || 'No se pudo analizar el documento.');
      await loadVeterinarySessions();
    },
    [loadVeterinarySessions],
  );

  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }

    const loadAll = async () => {
      setInitialLoading(true);
      const [catalog] = await Promise.all([
        loadVaccineCatalog(),
        loadPets(),
        loadVeterinarySessions(),
      ]);
      setVaccineCatalog(catalog);
      setInitialLoading(false);
    };

    void loadAll();
  }, [user, loadPets, loadVeterinarySessions]);

  const refreshUnreadIds = useCallback(async () => {
    if (!user?.id) return;
    const ids = await loadVeterinaryPageUnreadIds(user.id);
    setUnreadIds(ids);
  }, [user?.id]);

  useEffect(() => {
    void refreshUnreadIds();
  }, [refreshUnreadIds]);

  useEffect(() => {
    const onUpdate = () => {
      void refreshUnreadIds();
    };
    window.addEventListener('notifications-updated', onUpdate);
    return () => window.removeEventListener('notifications-updated', onUpdate);
  }, [refreshUnreadIds]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('veterinary_page_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'veterinary_sessions', filter: `owner_id=eq.${user.id}` },
        () => {
          void loadVeterinarySessions();
          void refreshUnreadIds();
          dispatchNotificationsUpdated();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pet_vaccinations', filter: `owner_id=eq.${user.id}` },
        () => {
          void refreshUnreadIds();
          dispatchNotificationsUpdated();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pet_reminders', filter: `owner_id=eq.${user.id}` },
        () => {
          void refreshUnreadIds();
          dispatchNotificationsUpdated();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadVeterinarySessions, refreshUnreadIds]);

  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab) {
      setActiveTab(state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    if (guidedTour?.isActive && guidedTour.currentStep?.moduleTab) {
      setActiveTab(guidedTour.currentStep.moduleTab);
    }
  }, [guidedTour?.isActive, guidedTour?.currentStep?.moduleTab]);

  const resetForm = () => {
    setSelectedPet('');
    setAppointmentType('');
    setAppointmentDate(new Date().toISOString().split('T')[0]);
    setVeterinarianName('');
    setVeterinaryClinic('');
    setDiagnosis('');
    setTreatment('');
    setNotes('');
    setPrescription('');
    setFollowUpDate('');
    setCost('');
    setPdfFile(null);
    setInvoiceFile(null);
    setEditingSession(null);
    setSelectedVaccineSlug('');
  };

  const selectedPetData = pets.find((pet) => pet.id === selectedPet);
  const vaccinesForSelectedPet = useMemo(
    () => getVaccinesForSpecies(selectedPetData?.species, vaccineCatalog),
    [selectedPetData?.species, vaccineCatalog],
  );

  const handleAppointmentTypeChange = (value: string) => {
    setAppointmentType(value);
    if (!isVaccinationType(value)) {
      setSelectedVaccineSlug('');
    }
  };

  const handleVaccineChange = (slug: string) => {
    setSelectedVaccineSlug(slug);
    const vaccine = getVaccineBySlug(slug, vaccineCatalog);
    if (vaccine) {
      setDiagnosis(vaccine.name);
      if (!followUpDate && appointmentDate) {
        setFollowUpDate(
          resolveNextDueDate({
            administeredAt: appointmentDate,
            vaccineSlug: slug,
            catalog: vaccineCatalog,
          }) ?? '',
        );
      }
    }
  };

  const loadSessionForEdit = (session: VeterinarySession) => {
    setEditingSession(session);
    setSelectedPet(session.pet_id);
    setAppointmentType(session.appointment_type);
    setAppointmentDate(session.date);
    setVeterinarianName(session.veterinarian_name);
    setVeterinaryClinic(session.veterinary_clinic || '');
    setDiagnosis(session.diagnosis);
    setTreatment(session.treatment || '');
    setNotes(session.notes || '');
    setPrescription(session.prescription || '');
    setFollowUpDate(session.follow_up_date || '');
    setCost(session.cost?.toString() || '');
    setPdfFile(null);
    setInvoiceFile(null);
    setActiveTab('register');

    if (
      user?.id &&
      sessionHasUnreadNotification(session.id, session.follow_up_date, unreadIds)
    ) {
      void markVeterinaryNotificationsRead(user.id, [
        getFollowUpNotificationId(session.id),
      ]).then(() => {
        void refreshUnreadIds();
        dispatchNotificationsUpdated();
      });
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    const state = location.state as {
      petId?: string;
      petReminderId?: string;
      vaccinationId?: string;
      veterinarySessionId?: string;
      tab?: string;
    } | null;
    const linkKey =
      state?.veterinarySessionId || state?.vaccinationId || state?.petReminderId || state?.petId;
    if (!user?.id || !linkKey || deepLinkHandled.current === linkKey) return;

    if (state.veterinarySessionId) {
      const session = veterinarySessions.find((item) => item.id === state.veterinarySessionId);
      if (!session) return;
      loadSessionForEdit(session);
    }

    deepLinkHandled.current = linkKey;
    if (state.tab) setActiveTab(state.tab);
    if (state.petId) setSelectedPet(state.petId);

    const markRead = async () => {
      if (state.veterinarySessionId) {
        await markVeterinaryNotificationsRead(user.id, [
          getFollowUpNotificationId(state.veterinarySessionId),
        ]);
      } else if (state.vaccinationId) {
        await markVeterinaryNotificationsRead(user.id, [
          getVaccinationNotificationId(state.vaccinationId),
        ]);
      } else if (state.petReminderId) {
        await markVeterinaryNotificationsRead(user.id, [
          getVetReminderNotificationId(state.petReminderId),
        ]);
      } else if (state.petId) {
        await markVeterinaryNotificationsReadForPet(user.id, state.petId);
      }
      await refreshUnreadIds();
    };

    void markRead();

    navigate('/veterinaria', {
      replace: true,
      state: state.tab ? { tab: state.tab } : undefined,
    });
  }, [location.state, user?.id, navigate, refreshUnreadIds, veterinarySessions]);

  const handleFileUpload = async (file: File, folder: string = 'veterinary-documents') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(folder)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(folder)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const saveVeterinarySession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPet || !appointmentType || !veterinarianName || !diagnosis) {
      toast.error("Por favor, completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      let pdfUrl = editingSession?.pdf_url || '';
      if (pdfFile) {
        pdfUrl = await handleFileUpload(pdfFile);
      }

      let invoiceUrl = editingSession?.invoice_url || '';
      if (invoiceFile) {
        invoiceUrl = await handleFileUpload(invoiceFile);
      }

      const veterinaryData = {
        pet_id: selectedPet,
        appointment_type: appointmentType,
        date: appointmentDate,
        veterinarian_name: veterinarianName,
        veterinary_clinic: veterinaryClinic || null,
        diagnosis: diagnosis,
        treatment: treatment || null,
        notes: notes || null,
        prescription: prescription || null,
        follow_up_date: followUpDate || null,
        cost: cost ? parseFloat(cost) : null,
        pdf_url: pdfUrl || null,
        invoice_url: invoiceUrl || null,
        owner_id: user?.id
      };

      if (editingSession) {
        const { error } = await supabase
          .from('veterinary_sessions')
          .update(veterinaryData)
          .eq('id', editingSession.id);

        if (error) throw error;

        toast.success("¡Visita veterinaria actualizada correctamente!");

        const sessionId = editingSession.id;
        if (isVaccinationType(appointmentType) && user?.id) {
          await upsertPetVaccinationFromSession({
            petId: selectedPet,
            ownerId: user.id,
            administeredAt: appointmentDate,
            vaccineSlug: selectedVaccineSlug || null,
            vaccineName: diagnosis,
            nextDueDate: followUpDate || null,
            veterinarianName: veterinarianName,
            veterinaryClinic: veterinaryClinic,
            sessionId,
            notes,
            petSpecies: selectedPetData?.species,
            catalog: vaccineCatalog,
          });
        }
        if (pdfFile && pdfUrl) {
          void queueDocumentParsing(sessionId, pdfUrl, 'lab_results');
        }
        if (invoiceFile && invoiceUrl) {
          void queueDocumentParsing(sessionId, invoiceUrl, 'invoice');
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('veterinary_sessions')
          .insert([veterinaryData])
          .select('id')
          .single();

        if (error) throw error;

        toast.success("¡Visita veterinaria registrada correctamente!");
        void guidedTour?.notifySectionSaved('veterinary');

        if (inserted?.id) {
          if (isVaccinationType(appointmentType) && user?.id) {
            await upsertPetVaccinationFromSession({
              petId: selectedPet,
              ownerId: user.id,
              administeredAt: appointmentDate,
              vaccineSlug: selectedVaccineSlug || null,
              vaccineName: diagnosis,
              nextDueDate: followUpDate || null,
              veterinarianName: veterinarianName,
              veterinaryClinic: veterinaryClinic,
              sessionId: inserted.id,
              notes,
              petSpecies: selectedPetData?.species,
              catalog: vaccineCatalog,
            });
          }
          if (pdfUrl) {
            void queueDocumentParsing(inserted.id, pdfUrl, 'lab_results');
          }
          if (invoiceUrl) {
            void queueDocumentParsing(inserted.id, invoiceUrl, 'invoice');
          }
        }
      }

      resetForm();
      await loadVeterinarySessions();
      if (user?.id && selectedPet) {
        await markVeterinaryNotificationsReadForPet(user.id, selectedPet);
      }
      void refreshUnreadIds();
      dispatchNotificationsUpdated();
      if (editingSession) {
        setActiveTab('history');
      } else {
        setActiveTab('history');
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error saving veterinary session:', error);
      toast.error(
        editingSession 
          ? "No se pudo actualizar la visita veterinaria." 
          : "No se pudo registrar la visita veterinaria."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteVeterinarySession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta visita veterinaria?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('veterinary_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success("¡Visita veterinaria eliminada correctamente!");

      await loadVeterinarySessions();
      void refreshUnreadIds();
      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error deleting veterinary session:', error);
      toast.error("No se pudo eliminar la visita veterinaria.");
    } finally {
      setLoading(false);
    }
  };

  const appointmentTypes = [...VETERINARY_APPOINTMENT_TYPES];

  const registerUnreadCount = useMemo(
    () =>
      [...unreadIds].filter(
        (id) => id.startsWith('vet-vaccination-') || id.startsWith('vet-reminder-'),
      ).length,
    [unreadIds],
  );

  const historyUnreadCount = useMemo(
    () => [...unreadIds].filter((id) => id.startsWith('vet-followup-')).length,
    [unreadIds],
  );

  const veterinaryTabs: MobileTabItem[] = useMemo(
    () => [
      {
        id: 'register',
        label: editingSession ? 'Editar Visita' : 'Registrar Visita',
        shortLabel: registerUnreadCount
          ? `${editingSession ? 'Editar' : 'Registrar'} · ${registerUnreadCount} aviso${registerUnreadCount !== 1 ? 's' : ''}`
          : editingSession
            ? 'Editar'
            : 'Registrar',
        icon: Plus,
        gradientIndex: 0,
      },
      { id: 'analytics', label: 'Análisis', shortLabel: 'Análisis', icon: BarChart3, gradientIndex: 2 },
      {
        id: 'history',
        label: 'Historial',
        shortLabel: historyUnreadCount
          ? `Historial · ${historyUnreadCount} aviso${historyUnreadCount !== 1 ? 's' : ''}`
          : 'Historial',
        icon: Calendar,
        gradientIndex: 4,
      },
    ],
    [editingSession, registerUnreadCount, historyUnreadCount],
  );

  // Analytics functions
  const getFilteredVeterinarySessions = () => {
    if (selectedPetForAnalytics === 'all') {
      return veterinarySessions;
    }
    return veterinarySessions.filter(session => session.pet_id === selectedPetForAnalytics);
  };

  const getVeterinaryStats = () => {
    const filteredSessions = getFilteredVeterinarySessions();
    
    if (filteredSessions.length === 0) {
      return {
        total_sessions: 0,
        total_cost: 0,
        average_cost: 0,
        most_common_type: 'N/A',
        most_visited_pet: 'N/A'
      };
    }

    const totalSessions = filteredSessions.length;
    // Ensure cost is converted to number and sum correctly
    const totalCost = filteredSessions.reduce((sum, session) => {
      const costValue = typeof session.cost === 'string' ? parseFloat(session.cost) : (session.cost || 0);
      return sum + (isNaN(costValue) ? 0 : costValue);
    }, 0);
    // Calculate average (keep full precision, round only for display)
    const averageCost = totalSessions > 0 ? totalCost / totalSessions : 0;

    // Find most common appointment type
    const typeCounts = filteredSessions.reduce((acc, session) => {
      acc[session.appointment_type] = (acc[session.appointment_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b
    );

    // Find most visited pet
    const petCounts = filteredSessions.reduce((acc, session) => {
      acc[session.pet_name] = (acc[session.pet_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostVisitedPet = Object.keys(petCounts).reduce((a, b) => 
      petCounts[a] > petCounts[b] ? a : b
    );

    return {
      total_sessions: totalSessions,
      total_cost: totalCost,
      average_cost: averageCost,
      most_common_type: appointmentTypes.find(t => t.value === mostCommonType)?.label || mostCommonType,
      most_visited_pet: mostVisitedPet
    };
  };


  // Prepare chart data for time series
  const getChartData = () => {
    const filteredSessions = getFilteredVeterinarySessions();
    
    // Group sessions by date (normalize date to YYYY-MM-DD format for grouping)
    const sessionsByDate = filteredSessions.reduce((acc, session) => {
      // Normalize date to YYYY-MM-DD format for consistent grouping
      const sessionDate = new Date(session.date);
      const normalizedDate = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!acc[normalizedDate]) {
        acc[normalizedDate] = {
          date: sessionDate.toLocaleDateString('es-GT'),
          sessions: 0,
          cost: 0,
          sortDate: normalizedDate // Keep original for sorting
        };
      }
      // Ensure sessions is incremented as a number
      acc[normalizedDate].sessions = (acc[normalizedDate].sessions || 0) + 1;
      const costValue = typeof session.cost === 'string' ? parseFloat(session.cost) : (session.cost || 0);
      acc[normalizedDate].cost += isNaN(costValue) ? 0 : costValue;
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by date (using sortDate for accurate sorting)
    return Object.values(sessionsByDate).sort((a: any, b: any) => 
      a.sortDate.localeCompare(b.sortDate)
    );
  };

  const veterinaryStats = getVeterinaryStats();
  const chartData = getChartData();

  const statCards = veterinaryStats.total_sessions > 0
    ? [
        { label: 'Total visitas', value: String(veterinaryStats.total_sessions), sub: 'Visitas registradas' },
        { label: 'Costo total', value: `Q${Math.round(veterinaryStats.total_cost * 100) / 100}`, sub: 'Total gastado' },
        { label: 'Costo promedio', value: `Q${Math.round(veterinaryStats.average_cost * 100) / 100}`, sub: 'Por visita' },
        { label: 'Tipo más común', value: veterinaryStats.most_common_type, sub: 'Visita más frecuente', small: true },
        { label: 'Mascota más visitada', value: veterinaryStats.most_visited_pet, sub: 'Más visitas', small: true },
      ]
    : [];

  const renderHowItWorks = () => (
    <MobileSectionCard variant="plain">
      <div className="p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
          <Info className="w-4 h-4 text-landing-aqua-dark shrink-0" />
          ¿Cómo funciona?
        </h3>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            <strong className="text-gray-800">1. Registra</strong> cada visita con diagnóstico, tratamiento y documentos.
          </p>
          <p>
            <strong className="text-gray-800">2. Adjunta</strong> resultados en PDF y facturas para tener todo centralizado.
          </p>
          <p>
            <strong className="text-gray-800">3. Revisa</strong> el historial y análisis para controlar costos y salud.
          </p>
        </div>
      </div>
    </MobileSectionCard>
  );

  const renderPetFilter = () => (
    <MobileSectionCard variant="plain">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-landing-aqua-dark shrink-0" />
          <span className="text-sm font-semibold text-gray-800">Filtrar por mascota</span>
        </div>
        <Select value={selectedPetForAnalytics} onValueChange={setSelectedPetForAnalytics}>
          <SelectTrigger className="w-full bg-white/90">
            <SelectValue placeholder="Selecciona una mascota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las mascotas</SelectItem>
            {pets.map((pet) => (
              <SelectItem key={pet.id} value={pet.id}>
                {pet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </MobileSectionCard>
  );

  if (initialLoading) {
    return (
      <DashboardShell variant="plain">
        <PageLoader variant="inline" message="Cargando visitas veterinarias…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell variant="plain">
      <PageHeader
        variant="solid"
        accent="mint"
        title="Veterinaria"
        subtitle="Registra y gestiona las visitas veterinarias de tus mascotas"
      >
        <Stethoscope className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      {unreadIds.size > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-sm text-amber-900 mb-4">
          Tienes {unreadIds.size}{' '}
          {unreadIds.size === 1 ? 'aviso veterinario' : 'avisos veterinarios'} sin revisar. Revisa
          vacunas, seguimientos y recordatorios pendientes.
        </div>
      )}

      <MobileTabStrip
        tabs={veterinaryTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="solid"
        accent="mint"
        columns={3}
      />

      {activeTab === 'register' && (
        <div className="space-y-4">
          {renderHowItWorks()}

          {pets.length === 0 ? (
            <MobileSectionCard variant="plain">
              <div className="text-center py-10 px-4">
                <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-800">Primero agrega una mascota</p>
                <p className="text-sm text-gray-500 mt-1 mb-4 max-w-sm mx-auto">
                  Necesitas al menos una mascota registrada para guardar visitas veterinarias.
                </p>
                <Button className={landingBtnSolidMint} onClick={() => navigate('/pet-creation')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar mascota
                </Button>
              </div>
            </MobileSectionCard>
          ) : (
            <MobileSectionCard variant="plain">
              <div className="p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900 mb-4">
                  <Stethoscope className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                  {editingSession ? 'Editar Visita Veterinaria' : 'Nueva Visita Veterinaria'}
                </h3>

                <form onSubmit={saveVeterinarySession} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pet">Mascota *</Label>
                      <Select value={selectedPet} onValueChange={setSelectedPet}>
                        <SelectTrigger className="bg-white/90">
                          <SelectValue placeholder="Seleccionar mascota" />
                        </SelectTrigger>
                        <SelectContent>
                          {pets.map((pet) => (
                            <SelectItem key={pet.id} value={pet.id}>
                              {formatPetOptionLabel(pet, 'breed')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="appointmentType">Tipo de Visita *</Label>
                      <Select value={appointmentType} onValueChange={handleAppointmentTypeChange}>
                        <SelectTrigger className="bg-white/90">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {appointmentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isVaccinationType(appointmentType) && (
                      <div className="sm:col-span-2">
                        <Label htmlFor="vaccineType">Vacuna aplicada</Label>
                        <Select value={selectedVaccineSlug} onValueChange={handleVaccineChange}>
                          <SelectTrigger className="bg-white/90">
                            <SelectValue placeholder="Seleccionar vacuna del catálogo" />
                          </SelectTrigger>
                          <SelectContent>
                            {vaccinesForSelectedPet.map((vaccine) => (
                              <SelectItem key={vaccine.slug} value={vaccine.slug}>
                                {vaccine.name}
                                {vaccine.is_core ? '' : ' (opcional)'}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">Otra vacuna</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          La próxima fecha se calcula según el intervalo recomendado de cada vacuna.
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="appointmentDate">Fecha de la Visita *</Label>
                      <Input
                        id="appointmentDate"
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="bg-white/90"
                      />
                    </div>

                    <div>
                      <Label htmlFor="veterinarianName">Veterinario *</Label>
                      <Input
                        id="veterinarianName"
                        value={veterinarianName}
                        onChange={(e) => setVeterinarianName(e.target.value)}
                        placeholder="Nombre del veterinario"
                        className="bg-white/90"
                      />
                    </div>

                    <div>
                      <Label htmlFor="veterinaryClinic">Veterinaria/Clínica</Label>
                      <Input
                        id="veterinaryClinic"
                        value={veterinaryClinic}
                        onChange={(e) => setVeterinaryClinic(e.target.value)}
                        placeholder="Nombre de la veterinaria o clínica"
                        className="bg-white/90"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cost">Costo (Q)</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="0.00"
                        className="bg-white/90"
                      />
                    </div>

                    <div>
                      <Label htmlFor="followUpDate">Fecha de Seguimiento</Label>
                      <Input
                        id="followUpDate"
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="bg-white/90"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="diagnosis">Diagnóstico *</Label>
                    <Textarea
                      id="diagnosis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Diagnóstico médico..."
                      rows={3}
                      className="bg-white/90 resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="treatment">Tratamiento</Label>
                    <Textarea
                      id="treatment"
                      value={treatment}
                      onChange={(e) => setTreatment(e.target.value)}
                      placeholder="Tratamiento recomendado..."
                      rows={3}
                      className="bg-white/90 resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="prescription">Receta Médica</Label>
                    <Textarea
                      id="prescription"
                      value={prescription}
                      onChange={(e) => setPrescription(e.target.value)}
                      placeholder="Medicamentos recetados..."
                      rows={3}
                      className="bg-white/90 resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas Adicionales</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                      className="bg-white/90 resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pdfFile">Subir Documento PDF (Resultados)</Label>
                    <Input
                      id="pdfFile"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="bg-white/90 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-landing-aqua/15 file:text-landing-aqua-dark hover:file:bg-landing-aqua/25"
                    />
                    {editingSession?.pdf_url && !pdfFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Documento actual:{' '}
                        <a href={editingSession.pdf_url} target="_blank" rel="noopener noreferrer" className="text-landing-aqua-dark underline">
                          Ver documento
                        </a>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="invoiceFile">Subir Factura (PDF o Imagen)</Label>
                    <Input
                      id="invoiceFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                      className="bg-white/90 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-landing-mint/15 file:text-landing-mint-dark hover:file:bg-landing-mint/25"
                    />
                    {editingSession?.invoice_url && !invoiceFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Factura actual:{' '}
                        <a href={editingSession.invoice_url} target="_blank" rel="noopener noreferrer" className="text-landing-aqua-dark underline">
                          Ver factura
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      data-blueprint-guided="register-vet-visit"
                      className={cn('flex-1 min-h-[44px]', landingBtnSolidMint)}
                    >
                      <Stethoscope className="w-4 h-4 mr-2 shrink-0" />
                      {loading
                        ? editingSession
                          ? 'Actualizando...'
                          : 'Registrando...'
                        : editingSession
                          ? 'Actualizar Visita'
                          : 'Registrar Visita Veterinaria'}
                    </Button>
                    {editingSession && (
                      <Button type="button" variant="outline" onClick={resetForm} disabled={loading} className="min-h-[44px]">
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </MobileSectionCard>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {veterinarySessions.length === 0 && renderHowItWorks()}
          {renderPetFilter()}

          {statCards.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {statCards.map((stat, index) => {
                const theme = solidCardThemeAt(index);
                return (
                  <div
                    key={stat.label}
                    className={cn('rounded-2xl border p-4 bg-white', theme.bg, theme.border)}
                  >
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{stat.label}</p>
                    <p className={cn('font-bold text-gray-900 mt-1 break-words', stat.small ? 'text-base' : 'text-xl sm:text-2xl')}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <MobileSectionCard variant="plain">
              <div className="text-center py-10 px-4">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">Sin datos para analizar</p>
                <p className="text-sm text-gray-500 mt-1">Registra visitas para ver estadísticas y gráficos.</p>
              </div>
            </MobileSectionCard>
          )}

          {chartData.length > 0 ? (
            <MobileSectionCard variant="plain">
              <div className="p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
                  <TrendingUp className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                  Progreso de Visitas Veterinarias
                </h3>
                <div className="h-64 sm:h-80 w-full -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        height={56}
                        interval="preserveStartEnd"
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={36} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={44} />
                      <Tooltip
                        formatter={(value: number | string, name: string) => {
                          if (name === 'cost') {
                            const costValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
                            return [`Q${Math.round(costValue * 100) / 100}`, 'Costo'];
                          }
                          if (name === 'sessions') return [`${value}`, 'Visitas'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="line" />
                      <Line
                        type="monotone"
                        dataKey="sessions"
                        yAxisId="left"
                        stroke={landingChartColors.mint}
                        strokeWidth={2.5}
                        dot={{ fill: landingChartColors.mint, strokeWidth: 2, r: 3 }}
                        name="Visitas"
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        yAxisId="right"
                        stroke={landingChartColors.mango}
                        strokeWidth={2.5}
                        dot={{ fill: landingChartColors.mango, strokeWidth: 2, r: 3 }}
                        name="Costo"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: landingChartColors.mint }} />
                    <span>Visitas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: landingChartColors.mango }} />
                    <span>Costo (Q)</span>
                  </div>
                </div>
              </div>
            </MobileSectionCard>
          ) : null}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {renderPetFilter()}

          <MobileSectionCard variant="plain">
            <div className="p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
                <Calendar className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                Historial Veterinario
              </h3>

              {getFilteredVeterinarySessions().length === 0 ? (
                <div className="text-center py-10 px-2">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-700">No hay visitas veterinarias registradas</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">Comienza registrando tu primera visita veterinaria.</p>
                  <Button variant="outline" className="min-h-[44px]" onClick={() => setActiveTab('register')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar visita
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredVeterinarySessions().map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-white/60 bg-white/70 border-l-4 border-l-landing-aqua p-3 sm:p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Stethoscope className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                            <span className="font-semibold text-gray-900">
                              {appointmentTypes.find((t) => t.value === session.appointment_type)?.label || session.appointment_type}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {session.pet_name}
                            </Badge>
                            <Badge className="bg-landing-aqua/15 text-landing-aqua-dark border border-landing-aqua/25 text-xs shrink-0">
                              {session.veterinarian_name}
                            </Badge>
                            {sessionHasUnreadNotification(
                              session.id,
                              session.follow_up_date,
                              unreadIds,
                            ) && (
                              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs shrink-0">
                                Seguimiento pendiente
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                            {new Date(session.date).toLocaleDateString('es-GT', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm text-gray-600">
                            {session.veterinary_clinic && (
                              <div>
                                <span className="font-medium text-gray-700">Clínica:</span>
                                <p className="mt-0.5">{session.veterinary_clinic}</p>
                              </div>
                            )}
                            {session.cost != null && session.cost > 0 && (
                              <div className="inline-flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-landing-mango-dark shrink-0" />
                                <strong>Q{typeof session.cost === 'number' ? session.cost.toFixed(2) : session.cost}</strong>
                              </div>
                            )}
                            <div className="sm:col-span-2">
                              <span className="font-medium text-gray-700">Diagnóstico:</span>
                              <p className="mt-0.5 leading-relaxed">{session.diagnosis}</p>
                            </div>
                            {session.treatment && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-gray-700">Tratamiento:</span>
                                <p className="mt-0.5 leading-relaxed">{session.treatment}</p>
                              </div>
                            )}
                            {session.prescription && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-gray-700">Receta:</span>
                                <p className="mt-0.5 leading-relaxed">{session.prescription}</p>
                              </div>
                            )}
                            {session.follow_up_date && (
                              <div>
                                <span className="font-medium text-gray-700">Seguimiento:</span>
                                <p className="mt-0.5">
                                  {new Date(session.follow_up_date).toLocaleDateString('es-GT')}
                                </p>
                              </div>
                            )}
                            {session.notes && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-gray-700">Notas:</span>
                                <p className="mt-0.5 italic leading-relaxed">&ldquo;{session.notes}&rdquo;</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {session.pdf_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(session.pdf_url, '_blank')}
                                className="text-xs min-h-[36px]"
                              >
                                <FileImage className="w-3.5 h-3.5 mr-1" />
                                Ver PDF
                              </Button>
                            )}
                            {session.invoice_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(session.invoice_url, '_blank')}
                                className="text-xs min-h-[36px]"
                              >
                                <Receipt className="w-3.5 h-3.5 mr-1" />
                                Ver Factura
                              </Button>
                            )}
                          </div>

                          {session.document_extractions && session.document_extractions.length > 0 && (
                            <div className="mt-3 rounded-lg border border-landing-aqua/20 bg-landing-aqua/5 p-3 space-y-2">
                              <p className="text-xs font-semibold text-landing-aqua-dark flex items-center gap-1">
                                <Info className="w-3.5 h-3.5" />
                                Análisis del documento
                              </p>
                              {session.document_extractions.map((extraction) => (
                                <div key={extraction.id} className="text-sm text-gray-700 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">
                                      {extraction.document_type === 'invoice' ? 'Factura' : 'Resultados'}
                                    </Badge>
                                    {extraction.parse_status === 'processing' && (
                                      <span className="text-xs text-gray-500">Analizando…</span>
                                    )}
                                    {extraction.parse_status === 'failed' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() =>
                                          void queueDocumentParsing(
                                            session.id,
                                            extraction.document_url,
                                            extraction.document_type,
                                            true,
                                          )
                                        }
                                      >
                                        Reintentar
                                      </Button>
                                    )}
                                  </div>
                                  <p className="leading-relaxed">{formatExtractionPreview(extraction)}</p>
                                  {extraction.structured_data?.abnormal_highlights &&
                                    extraction.structured_data.abnormal_highlights.length > 0 && (
                                      <ul className="text-xs text-gray-600 list-disc pl-4">
                                        {extraction.structured_data.abnormal_highlights
                                          .slice(0, 4)
                                          .map((item) => (
                                            <li key={item}>{item}</li>
                                          ))}
                                      </ul>
                                    )}
                                  <p className="text-[11px] text-gray-500 italic">
                                    Resumen informativo. Consulta siempre a tu veterinario.
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadSessionForEdit(session)}
                            className="flex-1 sm:flex-none min-h-[40px] text-xs"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteVeterinarySession(session.id)}
                            className="flex-1 sm:flex-none min-h-[40px] text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            disabled={loading}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </MobileSectionCard>
        </div>
      )}
    </DashboardShell>
  );
};

export default Veterinaria;
