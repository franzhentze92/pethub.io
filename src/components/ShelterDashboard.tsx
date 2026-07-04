import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  useShelter, 
  useAdoptionPetsByShelter, 
  useShelterAdoptionApplications,
  useUpdateAdoptionApplication,
  useAddShelterPet,
  useUpdateShelterPet,
  useDeleteShelterPet,
  useShelterImages,
  useShelterVideos,
  useCreateShelter
} from '@/hooks/useAdoption';
import { useUserProfile } from '@/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from './PageHeader';
import { DashboardShell } from './dashboard/DashboardShell';
import PageLoader, { LandingSpinner } from '@/components/PageLoader';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { BlueprintMascotNavTab } from '@/components/blueprint/BlueprintMascotNavTab';
import { DashboardStatCard } from './dashboard/DashboardStatCard';
import { landingChartColors, plainPageAccentTabActive, shelterTabAccent } from '@/lib/landingTheme';
import { useShelterDashboardTheme } from '@/contexts/ShelterDashboardThemeContext';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, 
  Users, 
  PawPrint, 
  Calendar, 
  Star, 
  Edit, 
  Plus, 
  Trash2, 
  Eye, 
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  LogOut,
  Image,
  Play,
  Grid,
  List,
  MessageCircle,
  Send,
  Loader2,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { storage, fileValidation } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Pet {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  age?: number;
  size?: string;
  sex?: string;
  color?: string;
  weight?: number;
  description?: string;
  image_url?: string;
  good_with_kids?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  house_trained?: boolean;
  spayed_neutered?: boolean;
  special_needs?: boolean;
  special_needs_description?: string;
  medical_notes?: string;
  adoption_fee?: string;
  location?: string;
  created_at: string;
}

interface Quote {
  id: string;
  pet_id: string;
  applicant_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  pet_name?: string;
  applicant_name?: string;
}

const SHELTER_MAIN_TABS: MobileTabItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: BarChart3, gradientIndex: 0 },
  { id: 'profile', label: 'Perfil', shortLabel: 'Perfil', icon: Building2, gradientIndex: 1 },
  { id: 'pets', label: 'Mascotas', shortLabel: 'Mascotas', icon: PawPrint, gradientIndex: 2 },
  { id: 'quotes', label: 'Solicitudes', shortLabel: 'Solicitudes', icon: MessageSquare, gradientIndex: 3 },
  { id: 'media', label: 'Media', shortLabel: 'Media', icon: Image, gradientIndex: 4 },
];

const filterPanelClass = (borderLight: string) =>
  cn('rounded-2xl bg-white border shadow-sm p-4 space-y-4', borderLight);

const PET_SPECIES_CHIPS = [
  { id: '', label: 'Todas' },
  { id: 'Dog', label: 'Perros' },
  { id: 'Cat', label: 'Gatos' },
  { id: 'Other', label: 'Otros' },
] as const;

const QUOTE_STATUS_CHIPS = [
  { id: '', label: 'Todas' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'approved', label: 'Aprobada' },
  { id: 'rejected', label: 'Rechazada' },
] as const;

const DEFAULT_PET_FILTERS = {
  search: '',
  size: '',
  species: '',
  age: '',
  gender: '',
  house_trained: false,
  spayed_neutered: false,
  special_needs: false,
  good_with_kids: false,
  good_with_dogs: false,
  good_with_cats: false,
};

const formatDateShort = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const getQuoteStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    default: return status;
  }
};

const getQuoteStatusClass = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-landing-tropical/30 text-landing-mango-dark';
    case 'approved': return 'bg-landing-mint/20 text-landing-mint-dark';
    case 'rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const ShelterDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { accent: pageAccent, ui: pageUi, btn: pageBtn, outlineBtn: pageOutlineBtn, syncTabs } =
    useShelterDashboardTheme();
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Check if navigation state has activeTab
    const state = location.state as { activeTab?: string } | null;
    return state?.activeTab || 'dashboard';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    syncTabs(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    syncTabs(activeTab);
  }, [activeTab, syncTabs]);

  // Check navigation state for activeTab on mount and when location changes
  useEffect(() => {
    const state = location.state as { activeTab?: string } | null;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
      // Scroll to top when tab changes via navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  // Scroll to top whenever activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Listen for tab change events from SettingsDropdown
  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      setActiveTab(event.detail);
      // Scroll to top when tab changes via event
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('shelterDashboardTabChange', handleTabChangeEvent as EventListener);
    return () => {
      window.removeEventListener('shelterDashboardTabChange', handleTabChangeEvent as EventListener);
    };
  }, []);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showAddPetForm, setShowAddPetForm] = useState(false);
  const [petViewMode, setPetViewMode] = useState<'cards' | 'list'>('cards');
  const [quoteViewMode, setQuoteViewMode] = useState<'cards' | 'list'>('cards');
  const [showPetFilters, setShowPetFilters] = useState(false);
  const [showQuoteFilters, setShowQuoteFilters] = useState(false);
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [newShelter, setNewShelter] = useState({
    name: '',
    location: '',
    phone: '',
    description: ''
  });
  const [shelterForm, setShelterForm] = useState({
    name: '',
    location: '',
    phone: '',
    email: '',
    mission_statement: '',
    years_experience: 0,
    total_volunteers: 0
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();


  const [petFilters, setPetFilters] = useState({
    search: '',
    size: '',
    species: '',
    age: '',
    gender: '',
    house_trained: false,
    spayed_neutered: false,
    special_needs: false,
    good_with_kids: false,
    good_with_dogs: false,
    good_with_cats: false
  });
  const [quoteFilters, setQuoteFilters] = useState({
    search: '',
    status: '',
    dateRange: ''
  });
  
  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatRoom, setChatRoom] = useState<any | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSubscriptionRef = useRef<any>(null);
  const [newPet, setNewPet] = useState({
    name: '',
    species: 'Dog',
    breed: '',
    age: '',
    size: '',
    gender: '',
    color: '',
    weight: '',
    description: '',
    image_url: '',
    good_with_kids: false,
    good_with_dogs: false,
    good_with_cats: false,
    house_trained: false,
    spayed_neutered: false,
    special_needs: false,
    special_needs_description: '',
    medical_notes: '',
    adoption_fee: '',
    location: ''
  });

  // Lista completa de razas de perros
  const dogBreeds = [
    'Mestizo',
    'Afgano',
    'Airedale Terrier',
    'Akita',
    'Akita Americano',
    'Alaskan Malamute',
    'American Bulldog',
    'American Pit Bull Terrier',
    'American Staffordshire Terrier',
    'American Water Spaniel',
    'Australian Cattle Dog',
    'Australian Kelpie',
    'Australian Shepherd',
    'Australian Terrier',
    'Azawakh',
    'Basenji',
    'Basset Hound',
    'Beagle',
    'Bearded Collie',
    'Bedlington Terrier',
    'Belgian Malinois',
    'Belgian Shepherd',
    'Belgian Tervuren',
    'Bergamasco',
    'Bernese Mountain Dog',
    'Bichon Frisé',
    'Bichon Maltés',
    'Black and Tan Coonhound',
    'Bloodhound',
    'Border Collie',
    'Border Terrier',
    'Borzoi',
    'Boston Terrier',
    'Bouvier des Flandres',
    'Boxer',
    'Boykin Spaniel',
    'Bracco Italiano',
    'Briard',
    'Brittany',
    'Brussels Griffon',
    'Bull Terrier',
    'Bulldog',
    'Bulldog Francés',
    'Bullmastiff',
    'Cairn Terrier',
    'Cane Corso',
    'Cardigan Welsh Corgi',
    'Cavalier King Charles Spaniel',
    'Chesapeake Bay Retriever',
    'Chihuahua',
    'Chinese Crested',
    'Chin',
    'Chow Chow',
    'Clumber Spaniel',
    'Cocker Spaniel',
    'Cocker Spaniel Americano',
    'Collie',
    'Coonhound',
    'Curly-Coated Retriever',
    'Dachshund',
    'Dalmatian',
    'Dandie Dinmont Terrier',
    'Doberman Pinscher',
    'Dogo Argentino',
    'Dogo de Burdeos',
    'English Cocker Spaniel',
    'English Foxhound',
    'English Setter',
    'English Springer Spaniel',
    'English Toy Spaniel',
    'Field Spaniel',
    'Finnish Spitz',
    'Flat-Coated Retriever',
    'Fox Terrier',
    'Foxhound',
    'French Bulldog',
    'German Pinscher',
    'German Shepherd',
    'German Shorthaired Pointer',
    'German Wirehaired Pointer',
    'Giant Schnauzer',
    'Glen of Imaal Terrier',
    'Golden Retriever',
    'Gordon Setter',
    'Great Dane',
    'Great Pyrenees',
    'Greater Swiss Mountain Dog',
    'Greyhound',
    'Harrier',
    'Havanese',
    'Ibizan Hound',
    'Irish Red and White Setter',
    'Irish Setter',
    'Irish Terrier',
    'Irish Water Spaniel',
    'Irish Wolfhound',
    'Italian Greyhound',
    'Jack Russell Terrier',
    'Japanese Chin',
    'Keeshond',
    'Kerry Blue Terrier',
    'Komondor',
    'Kuvasz',
    'Labrador Retriever',
    'Lagotto Romagnolo',
    'Lakeland Terrier',
    'Leonberger',
    'Lhasa Apso',
    'Lowchen',
    'Maltese',
    'Manchester Terrier',
    'Mastiff',
    'Miniature Bull Terrier',
    'Miniature Pinscher',
    'Miniature Schnauzer',
    'Neapolitan Mastiff',
    'Newfoundland',
    'Norfolk Terrier',
    'Norwegian Buhund',
    'Norwegian Elkhound',
    'Norwich Terrier',
    'Nova Scotia Duck Tolling Retriever',
    'Old English Sheepdog',
    'Otterhound',
    'Papillon',
    'Parson Russell Terrier',
    'Pekingese',
    'Pembroke Welsh Corgi',
    'Petit Basset Griffon Vendéen',
    'Pharaoh Hound',
    'Plott',
    'Pointer',
    'Polish Lowland Sheepdog',
    'Pomeranian',
    'Poodle',
    'Poodle Estándar',
    'Poodle Miniatura',
    'Poodle Toy',
    'Portuguese Water Dog',
    'Pug',
    'Puli',
    'Pumi',
    'Rat Terrier',
    'Redbone Coonhound',
    'Rhodesian Ridgeback',
    'Rottweiler',
    'Saint Bernard',
    'Saluki',
    'Samoyed',
    'Schipperke',
    'Schnauzer',
    'Schnauzer Estándar',
    'Scottish Deerhound',
    'Scottish Terrier',
    'Sealyham Terrier',
    'Shar Pei',
    'Shetland Sheepdog',
    'Shiba Inu',
    'Shih Tzu',
    'Siberian Husky',
    'Silky Terrier',
    'Skye Terrier',
    'Smooth Fox Terrier',
    'Soft Coated Wheaten Terrier',
    'Spinone Italiano',
    'Staffordshire Bull Terrier',
    'Standard Schnauzer',
    'Sussex Spaniel',
    'Swedish Vallhund',
    'Tibetan Mastiff',
    'Tibetan Spaniel',
    'Tibetan Terrier',
    'Toy Fox Terrier',
    'Treeing Walker Coonhound',
    'Vizsla',
    'Weimaraner',
    'Welsh Springer Spaniel',
    'Welsh Terrier',
    'West Highland White Terrier',
    'Whippet',
    'Wire Fox Terrier',
    'Wirehaired Pointing Griffon',
    'Xoloitzcuintli',
    'Yorkshire Terrier',
    'Otra'
  ].sort((a, b) => {
    // Mantener "Mestizo" y "Otra" al final
    if (a === 'Mestizo') return -1;
    if (b === 'Mestizo') return 1;
    if (a === 'Otra') return 1;
    if (b === 'Otra') return -1;
    return a.localeCompare(b);
  });


  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('user_role');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };



  // Get shelter data for the current user
  const { data: shelter, isLoading: shelterLoading, error: shelterError } = useShelter(user?.id); // Assuming user ID is shelter ID
  const { data: pets = [], isLoading: petsLoading, error: petsError } = useAdoptionPetsByShelter(user?.id);
  const { data: userProfile, isLoading: profileLoading, error: profileError } = useUserProfile(user?.id);
  const { data: quotes = [], isLoading: quotesLoading, error: quotesError } = useShelterAdoptionApplications(user?.id);
  const { data: shelterImages = [], isLoading: imagesLoading, error: imagesError } = useShelterImages(user?.id);
  const { data: shelterVideos = [], isLoading: videosLoading, error: videosError } = useShelterVideos(user?.id);

  // Initialize form when shelter data is available
  React.useEffect(() => {
    if (shelter) {
      setShelterForm({
        name: shelter.name || '',
        location: shelter.location || '',
        phone: shelter.phone || '',
        email: shelter.email || '',
        mission_statement: shelter.mission_statement || '',
        years_experience: shelter.years_experience || 0,
        total_volunteers: shelter.total_volunteers || 0
      });
    }
  }, [shelter]);

  // Check for any errors
  const hasErrors = shelterError || petsError || profileError || quotesError || imagesError || videosError;
  // Only block UI for critical loading states, not all data
  const isCriticalLoading = shelterLoading || profileLoading;
  const isLoading = shelterLoading || petsLoading || profileLoading || quotesLoading || imagesLoading || videosLoading;


  // Log errors for debugging
  if (shelterError) console.error('Shelter error:', shelterError);
  if (petsError) console.error('Pets error:', petsError);
  if (profileError) console.error('Profile error:', profileError);
  if (quotesError) console.error('Quotes error:', quotesError);
  if (imagesError) console.error('Images error:', imagesError);
  if (videosError) console.error('Videos error:', videosError);

  // Use real data only - no mock data
  const isUsingMockData = false;
  const displayPets = pets;
  const displayQuotes = quotes;

  // Filter pets based on current filters
  const filteredPets = displayPets.filter(pet => {
    // Search filter (name, breed, description)
    if (petFilters.search && 
        !pet.name.toLowerCase().includes(petFilters.search.toLowerCase()) && 
        !pet.breed?.toLowerCase().includes(petFilters.search.toLowerCase()) &&
        !pet.description?.toLowerCase().includes(petFilters.search.toLowerCase())) {
      return false;
    }
    
    // Size filter
    if (petFilters.size && pet.size !== petFilters.size) {
      return false;
    }
    
    // Species filter
    if (petFilters.species && pet.species !== petFilters.species) {
      return false;
    }
    
    // Age filter
    if (petFilters.age && pet.age?.toString() !== petFilters.age) {
      return false;
    }
    
    // Gender filter
    if (petFilters.gender && pet.sex !== petFilters.gender) {
      return false;
    }
    
    // Behavior filters
    if (petFilters.good_with_kids && !pet.good_with_kids) {
      return false;
    }
    if (petFilters.good_with_dogs && !pet.good_with_dogs) {
      return false;
    }
    if (petFilters.good_with_cats && !pet.good_with_cats) {
      return false;
    }
    
    // Training filters
    if (petFilters.house_trained && !pet.house_trained) {
      return false;
    }
    if (petFilters.spayed_neutered && !pet.spayed_neutered) {
      return false;
    }
    
    // Special needs filter
    if (petFilters.special_needs && !pet.special_needs) {
      return false;
    }
    
    return true;
  });

  // Filter quotes based on current filters
  const filteredQuotes = displayQuotes.filter(quote => {
    if (quoteFilters.search && 
        !quote.pet_name?.toLowerCase().includes(quoteFilters.search.toLowerCase()) && 
        !quote.applicant_name?.toLowerCase().includes(quoteFilters.search.toLowerCase())) {
      return false;
    }
    if (quoteFilters.status && quote.status !== quoteFilters.status) {
      return false;
    }
    return true;
  });

  const hasActivePetFilters =
    petFilters.search !== '' ||
    petFilters.size !== '' ||
    petFilters.species !== '' ||
    petFilters.age !== '' ||
    petFilters.gender !== '' ||
    petFilters.house_trained ||
    petFilters.spayed_neutered ||
    petFilters.special_needs ||
    petFilters.good_with_kids ||
    petFilters.good_with_dogs ||
    petFilters.good_with_cats;

  const hasActiveQuoteFilters =
    quoteFilters.search !== '' || quoteFilters.status !== '' || quoteFilters.dateRange !== '';

  const clearPetFilters = () => {
    setPetFilters(DEFAULT_PET_FILTERS);
    setShowPetFilters(false);
  };

  const clearQuoteFilters = () => {
    setQuoteFilters({ search: '', status: '', dateRange: '' });
    setShowQuoteFilters(false);
  };

  // Hooks for mutations
  const updateApplication = useUpdateAdoptionApplication();
  const addPet = useAddShelterPet();
  const updatePet = useUpdateShelterPet();
  const deletePet = useDeleteShelterPet();
  const createShelter = useCreateShelter();

  const handleCreateShelter = async () => {
    if (!user?.id || !newShelter.name.trim()) {
      toast.error('El nombre del albergue es obligatorio');
      return;
    }

    try {
      await createShelter.mutateAsync({
        name: newShelter.name.trim(),
        location: newShelter.location.trim() || undefined,
        phone: newShelter.phone.trim() || undefined,
        description: newShelter.description.trim() || undefined,
        owner_id: user.id
      });

      // Reset form and hide it
      setNewShelter({ name: '', location: '', phone: '', description: '' });
      setShowShelterForm(false);
      
      // Show success message
      toast.success('¡Albergue creado exitosamente!');
      
      // Refresh data without page reload
      queryClient.invalidateQueries({ queryKey: ['shelter', user.id] });
    } catch (error) {
      console.error('Error creating shelter:', error);
      toast.error('Error al crear el albergue. Por favor, intenta de nuevo.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast.error('No se pudo identificar el usuario');
      return;
    }

    try {
      console.log('Attempting to save shelter profile...', {
        userId: user.id,
        shelterForm: shelterForm,
        currentShelter: currentShelter
      });

      // First, check if the shelters table exists and has the right structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('shelters')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Shelters table error:', tableError);
        toast.error(`La tabla 'shelters' no existe o no es accesible. ${tableError.message}`);
        return;
      }

      // Check if shelter exists for this user
      const { data: existingShelter, error: checkError } = await supabase
        .from('shelters')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      if (checkError) {
        console.error('Error checking for existing shelter:', checkError);
        toast.error(`Error al verificar el albergue existente: ${checkError.message}`);
        return;
      }

      let shelterId = existingShelter?.id;

      if (!existingShelter) {
        // Create a new shelter if it doesn't exist
        console.log('No existing shelter found, creating new one...');
        const { data: newShelter, error: createError } = await supabase
          .from('shelters')
          .insert({
            owner_id: user.id,
            name: shelterForm.name || 'Mi Albergue',
            location: shelterForm.location || '',
            phone: shelterForm.phone || '',
            email: shelterForm.email || '',
            description: shelterForm.mission_statement || '',
            mission_statement: shelterForm.mission_statement || '',
            years_experience: shelterForm.years_experience || 0,
            total_volunteers: shelterForm.total_volunteers || 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating new shelter:', createError);
          toast.error(`Error al crear el albergue: ${createError.message}`);
          return;
        }

        shelterId = newShelter.id;
        console.log('New shelter created successfully:', newShelter);
      } else {
        // Update existing shelter
        console.log('Updating existing shelter...');
        const { error: updateError } = await supabase
          .from('shelters')
          .update({
            name: shelterForm.name,
            location: shelterForm.location,
            phone: shelterForm.phone,
            email: shelterForm.email,
            description: shelterForm.mission_statement,
            mission_statement: shelterForm.mission_statement,
            years_experience: shelterForm.years_experience || 0,
            total_volunteers: shelterForm.total_volunteers || 0
          })
          .eq('owner_id', user.id);

        if (updateError) {
          console.error('Error updating shelter:', updateError);
          toast.error(`Error al actualizar el albergue: ${updateError.message}`);
          return;
        }

        console.log('Shelter updated successfully');
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['shelter', user.id] });
      queryClient.invalidateQueries({ queryKey: ['shelters'] });

      toast.success('Los cambios fueron guardados correctamente');
      
      console.log('Profile saved successfully, form data preserved');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(`Error inesperado: ${error.message}`);
    }
  };

  const validatePetForm = () => {
    if (!newPet.name.trim()) {
      toast.error('El nombre de la mascota es obligatorio');
      return false;
    }
    if (!newPet.age || parseInt(newPet.age) < 0) {
      toast.error('La edad debe ser un número válido mayor o igual a 0');
      return false;
    }
    return true;
  };

  const handleAddPet = async () => {
    if (!user?.id || !currentShelter) return;
    
    if (!validatePetForm()) return;
    
    try {
      await addPet.mutateAsync({
        name: newPet.name,
        species: newPet.species,
        breed: newPet.breed || undefined,
        age: newPet.age ? parseInt(newPet.age) : undefined,
        size: newPet.size || undefined,
        sex: newPet.gender || undefined,
        color: newPet.color || undefined,
        weight: newPet.weight ? parseFloat(newPet.weight) : undefined,
        description: newPet.description || undefined,
        image_url: newPet.image_url || undefined,
        good_with_kids: newPet.good_with_kids,
        good_with_dogs: newPet.good_with_dogs,
        good_with_cats: newPet.good_with_cats,
        house_trained: newPet.house_trained,
        spayed_neutered: newPet.spayed_neutered,
        special_needs: newPet.special_needs,
        special_needs_description: newPet.special_needs_description || undefined,
        medical_notes: newPet.medical_notes || undefined,
        adoption_fee: newPet.adoption_fee || undefined,
        location: newPet.location || undefined,
        status: 'available',
        shelter_id: currentShelter.id,
        owner_id: user.id
      });
      
      // Invalidate pets list and show toast
      queryClient.invalidateQueries({ queryKey: ['adoption-pets-by-shelter', user.id] });
      toast.success(`${newPet.name} ha sido agregada al albergue correctamente`);
      setShowAddPetForm(false);
      setNewPet({
        name: '',
        species: 'Dog',
        breed: '',
        age: '',
        size: '',
        gender: '',
        color: '',
        weight: '',
        description: '',
        image_url: '',
        good_with_kids: false,
        good_with_dogs: false,
        good_with_cats: false,
        house_trained: false,
        spayed_neutered: false,
        special_needs: false,
        special_needs_description: '',
        medical_notes: '',
        adoption_fee: '',
        location: ''
      });
    } catch (error) {
      console.error('Error adding pet:', error);
      const errorMessage = error?.message || error?.details || 'Error desconocido';
      toast.error(`No se pudo agregar la mascota: ${errorMessage}`);
    }
  };

  const handleEditPet = (pet: Pet) => {
    // Prevent editing mock pets
    if (isUsingMockData) {
      toast.error('No puedes editar mascotas de ejemplo. Agrega una mascota real primero.');
      return;
    }
    
    setEditingPet(pet);
    setShowAddPetForm(true);
    setActiveTab('add-pet');
    setNewPet({
      name: pet.name,
      species: pet.species || 'Dog',
      breed: pet.breed || '',
      age: pet.age?.toString() || '',
      size: pet.size || '',
      gender: pet.sex || '',
      color: pet.color || '',
      weight: pet.weight?.toString() || '',
      description: pet.description || '',
      image_url: pet.image_url || '',
      good_with_kids: pet.good_with_kids || false,
      good_with_dogs: pet.good_with_dogs || false,
      good_with_cats: pet.good_with_cats || false,
      house_trained: pet.house_trained || false,
      spayed_neutered: pet.spayed_neutered || false,
      special_needs: pet.special_needs || false,
      special_needs_description: pet.special_needs_description || '',
      medical_notes: pet.medical_notes || '',
      adoption_fee: pet.adoption_fee || '',
      location: pet.location || ''
    });
  };

  const handleUpdatePet = async () => {
    if (!editingPet) return;
    
    if (!validatePetForm()) return;
    
    try {
      await updatePet.mutateAsync({
        petId: editingPet.id,
        petData: {
          name: newPet.name,
          species: newPet.species,
          breed: newPet.breed || undefined,
          age: newPet.age ? parseInt(newPet.age) : undefined,
          size: newPet.size || undefined,
          sex: newPet.gender || undefined,
          color: newPet.color || undefined,
          weight: newPet.weight ? parseFloat(newPet.weight) : undefined,
          description: newPet.description || undefined,
          image_url: newPet.image_url || undefined,
          good_with_kids: newPet.good_with_kids,
          good_with_dogs: newPet.good_with_dogs,
          good_with_cats: newPet.good_with_cats,
          house_trained: newPet.house_trained,
          spayed_neutered: newPet.spayed_neutered,
          special_needs: newPet.special_needs,
          special_needs_description: newPet.special_needs_description || undefined,
          medical_notes: newPet.medical_notes || undefined,
          adoption_fee: newPet.adoption_fee || undefined,
          location: newPet.location || undefined
        }
      });
      
      // Invalidate list and notify
      queryClient.invalidateQueries({ queryKey: ['adoption-pets-by-shelter', user?.id] });
      toast.success(`La información de ${newPet.name} ha sido actualizada correctamente`);
      setEditingPet(null);
      setShowAddPetForm(false);
      setNewPet({
        name: '',
        species: 'Dog',
        breed: '',
        age: '',
        size: '',
        gender: '',
        color: '',
        weight: '',
        description: '',
        image_url: '',
        good_with_kids: false,
        good_with_dogs: false,
        good_with_cats: false,
        house_trained: false,
        spayed_neutered: false,
        special_needs: false,
        special_needs_description: '',
        medical_notes: '',
        adoption_fee: '',
        location: ''
      });
    } catch (error) {
      console.error('Error updating pet:', error);
      const errorMessage = error?.message || error?.details || 'Error desconocido';
      toast.error(`No se pudo actualizar la mascota: ${errorMessage}`);
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!currentShelter) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar esta mascota?')) {
      try {
        await deletePet.mutateAsync({
          petId,
          shelterId: currentShelter.id
        });
        toast.success('La mascota ha sido eliminada del albergue correctamente');
      } catch (error) {
        console.error('Error deleting pet:', error);
        toast.error(`No se pudo eliminar la mascota: ${error.message}`);
      }
    }
  };

  // Chat functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOrCreateChatRoom = async () => {
    if (!selectedApplication || !user) return;

    try {
      setLoadingChat(true);

      // Get pet owner information
      const { data: petData, error: petError } = await supabase
        .from('adoption_pets')
        .select('shelter_id, owner_id')
        .eq('id', selectedApplication.pet_id)
        .maybeSingle();

      if (petError && petError.code !== 'PGRST116') {
        console.error('Error fetching pet data:', petError);
      }

      const shelterOwnerId = petData?.owner_id;
      const applicantId = selectedApplication.applicant_id;

      // Ensure we have both parties
      if (!shelterOwnerId || !applicantId) {
        toast.error('No se pudo identificar a los participantes del chat');
        return;
      }

      // First, try to find existing chat room
      const { data: existingRoom, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('adoption_application_id', selectedApplication.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching chat room:', fetchError);
      }

      if (existingRoom) {
        setChatRoom(existingRoom);
        return;
      }

      // If no existing room, create a new one
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          adoption_application_id: selectedApplication.id,
          owner1_id: applicantId,
          owner2_id: shelterOwnerId
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating chat room:', createError);
        toast.error('Error al crear el chat. Asegúrate de que la tabla chat_rooms tenga el campo adoption_application_id.');
        return;
      }

      setChatRoom(newRoom);

    } catch (error) {
      console.error('Error loading/creating chat room:', error);
      toast.error('Error al cargar el chat');
    } finally {
      setLoadingChat(false);
    }
  };

  const loadMessages = async () => {
    if (!chatRoom) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_room_id', chatRoom.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setChatMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!chatRoom) return;

    // Unsubscribe from previous subscription if it exists
    if (chatSubscriptionRef.current) {
      chatSubscriptionRef.current.unsubscribe();
    }

    const subscription = supabase
      .channel(`adoption_chat_${chatRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_room_id=eq.${chatRoom.id}`
      }, (payload) => {
        setChatMessages(prev => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(msg => msg.id === payload.new.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, payload.new as any];
        });
        // Scroll to bottom when new message arrives
        setTimeout(() => scrollToBottom(), 100);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to chat messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to chat messages');
        }
      });

    chatSubscriptionRef.current = subscription;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom || !user || sending) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      chat_room_id: chatRoom.id,
      sender_id: user.id,
      message: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      read_at: null
    };

    // Add message optimistically to UI
    setChatMessages(prev => [...prev, optimisticMessage as any]);
    setNewMessage('');
    scrollToBottom();

    try {
      setSending(true);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: chatRoom.id,
          sender_id: user.id,
          message: messageText,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Error al enviar el mensaje');
        // Remove optimistic message on error
        setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
        setNewMessage(messageText); // Restore message text
        return;
      }

      // Replace optimistic message with real one
      if (data) {
        setChatMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempId);
          // Check if message already exists (from subscription)
          const exists = filtered.some(msg => msg.id === data.id);
          if (exists) {
            return filtered;
          }
          return [...filtered, data];
        });
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Chat useEffect hooks
  useEffect(() => {
    if (showChatModal && selectedApplication) {
      loadOrCreateChatRoom();
    } else {
      // Cleanup when modal closes
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe();
        chatSubscriptionRef.current = null;
      }
      setChatRoom(null);
      setChatMessages([]);
      setNewMessage('');
    }
  }, [showChatModal, selectedApplication]);

  // Load messages when chat room is available
  useEffect(() => {
    if (chatRoom) {
      loadMessages();
      subscribeToMessages();
    }
    
    return () => {
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe();
        chatSubscriptionRef.current = null;
      }
    };
  }, [chatRoom]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleQuoteAction = async (quoteId: string, action: 'approved' | 'rejected') => {
    if (!currentShelter) {
      console.error('No current shelter found');
      toast.error('No se encontró el albergue actual');
      return;
    }
    
    try {
      console.log('Updating application:', { quoteId, action, shelterId: currentShelter.id });
      
      // Use mutate instead of mutateAsync for better UX
      updateApplication.mutate({
        applicationId: quoteId,
        status: action,
        shelterId: currentShelter.id
      }, {
        onSuccess: () => {
          toast.success(`La solicitud ha sido ${action === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`);
        },
        onError: (error) => {
          console.error('Error updating application:', error);
          toast.error(`No se pudo actualizar la solicitud: ${error.message || 'Error desconocido'}`);
        }
      });
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error(`No se pudo actualizar la solicitud: ${error.message || 'Error desconocido'}`);
    }
  };

  // Handle shelter image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !currentShelter) {
      console.log('Missing requirements:', { file: !!file, userId: !!user?.id, shelter: !!currentShelter });
      return;
    }

    setUploadingImage(true);
    try {
      console.log('Starting image upload for shelter:', currentShelter.id);
      
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `shelters/${currentShelter.id}/images/${fileName}`;
      
      console.log('Uploading to storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('shelter-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('shelter-images')
        .getPublicUrl(filePath);

      console.log('Got public URL:', publicUrl);

      // Save to database
      const insertData = {
        shelter_id: currentShelter.id,
        image_url: publicUrl,
        alt_text: file.name
      };
      
      console.log('Inserting to database:', insertData);
      
      const { error: dbError } = await supabase
        .from('shelter_images')
        .insert(insertData);

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      toast.success('La imagen se ha subido correctamente');
      // Refresh the images list without leaving current tab
      queryClient.invalidateQueries({ queryKey: ['shelter-images', user.id] });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`Error al subir imagen: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle pet image upload
  const handlePetImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !currentShelter) {
      console.log('Missing requirements for pet image:', { file: !!file, userId: !!user?.id, shelter: !!currentShelter });
      return;
    }

    console.log('=== PET IMAGE UPLOAD START ===');
    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('User ID:', user.id);
    console.log('Shelter ID:', currentShelter.id);

    setUploadingImage(true);
    try {
      console.log('Starting pet image upload for shelter:', currentShelter.id);
      
      // Upload file to pet-images storage bucket
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${currentShelter.id}/${fileName}`;
      
      console.log('Uploading pet image to storage:', filePath);
      console.log('Using bucket: pet-images');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pet-images')
        .upload(filePath, file);

      console.log('Upload response:', { uploadData, uploadError });

      if (uploadError) {
        console.error('Pet image storage upload error:', uploadError);
        console.error('Error details:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pet-images')
        .getPublicUrl(filePath);

      console.log('Got pet image public URL:', publicUrl);

      // Update the newPet state with the image URL
      setNewPet(prev => {
        const updated = {
          ...prev,
          image_url: publicUrl
        };
        console.log('Updated newPet state:', updated);
        return updated;
      });

      console.log('Updated newPet state with image URL:', publicUrl);
      toast.success('La imagen se ha subido correctamente');
      console.log('=== PET IMAGE UPLOAD SUCCESS ===');
    } catch (error) {
      console.error('=== PET IMAGE UPLOAD ERROR ===');
      console.error('Error uploading pet image:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`Error al subir imagen de mascota: ${error.message}`);
    } finally {
      setUploadingImage(false);
      console.log('=== PET IMAGE UPLOAD END ===');
    }
  };

  // Handle video upload
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !currentShelter) {
      console.log('Video upload missing requirements:', { file: !!file, userId: !!user?.id, shelter: !!currentShelter });
      return;
    }

    console.log('Starting video upload for shelter:', currentShelter.id);
    setUploadingVideo(true);
    try {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `shelters/${currentShelter.id}/videos/${fileName}`;
      
      console.log('Uploading video to storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('shelter-videos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Video storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('shelter-videos')
        .getPublicUrl(filePath);

      console.log('Got video public URL:', publicUrl);

      // Save to database
      const insertData = {
        shelter_id: currentShelter.id,
        title: file.name,
        youtube_url: publicUrl,
        description: `Video subido: ${file.name}`
      };
      
      console.log('Inserting video to database:', insertData);
      const { error: dbError } = await supabase
        .from('shelter_videos')
        .insert(insertData);

      if (dbError) {
        console.error('Video database insert error:', dbError);
        throw dbError;
      }

      toast.success('El video se ha subido correctamente');
      // Refresh the videos list without leaving current tab
      queryClient.invalidateQueries({ queryKey: ['shelter-videos', user.id] });
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('No se pudo subir el video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const pageHeader = useMemo(() => {
    const name = shelter?.name ?? 'Albergue';
    switch (activeTab) {
      case 'profile':
        return { title: 'Perfil', subtitle: 'Datos y contacto del albergue' };
      case 'pets':
      case 'add-pet':
        return { title: 'Mascotas', subtitle: 'Catálogo de adopción' };
      case 'quotes':
        return { title: 'Solicitudes', subtitle: 'Adopciones recibidas' };
      case 'media':
        return { title: 'Media', subtitle: 'Galería del albergue' };
      default:
        return { title: 'Dashboard Albergue', subtitle: name };
    }
  }, [activeTab, shelter?.name]);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso denegado</h2>
        <p className="text-gray-500">Debes iniciar sesión para acceder al dashboard del albergue.</p>
      </div>
    );
  }

  // Show loading state only for critical data
  if (isCriticalLoading) {
    return (
      <DashboardShell variant="plain">
        <PageLoader variant="skeleton" />
      </DashboardShell>
    );
  }

  if (!shelter) {
    if (showShelterForm) {
      return (
        <DashboardShell variant="plain">
          <PageHeader title="Crear Albergue" subtitle="Completa la información de tu albergue" />
          <MobileSectionCard className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
              <Label htmlFor="shelter-name">Nombre del Albergue *</Label>
              <Input
                id="shelter-name"
                value={newShelter.name}
                onChange={(e) => setNewShelter({ ...newShelter, name: e.target.value })}
                placeholder="Ej: Refugio de Mascotas Felices"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="shelter-location">Ubicación</Label>
              <Input
                id="shelter-location"
                value={newShelter.location}
                onChange={(e) => setNewShelter({ ...newShelter, location: e.target.value })}
                placeholder="Ciudad, Estado, País"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="shelter-phone">Teléfono</Label>
              <Input
                id="shelter-phone"
                value={newShelter.phone}
                onChange={(e) => setNewShelter({ ...newShelter, phone: e.target.value })}
                placeholder="+502 1234-5678"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="shelter-description">Descripción</Label>
              <Textarea
                id="shelter-description"
                value={newShelter.description}
                onChange={(e) => setNewShelter({ ...newShelter, description: e.target.value })}
                placeholder="Describe tu albergue, misión, servicios, etc."
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowShelterForm(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleCreateShelter}
                disabled={!newShelter.name.trim() || createShelter.isPending}
                className={cn('flex-1', pageBtn, 'border-0')}
              >
                {createShelter.isPending ? 'Creando...' : 'Crear Albergue'}
              </Button>
            </div>
          </MobileSectionCard>
        </DashboardShell>
      );
    }

    return (
      <DashboardShell variant="plain">
        <MobileSectionCard className="p-8 text-center max-w-md mx-auto">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-800">¡Bienvenido a PetHub!</h2>
          <p className="text-gray-600 mt-2">Aún no tienes un albergue registrado.</p>
          <p className="text-gray-500 text-sm mt-1">Créalo para gestionar mascotas y adopciones con datos reales.</p>
          <Button onClick={() => setShowShelterForm(true)} className={cn('mt-6', pageBtn, 'border-0')}>
            <Building2 className="w-5 h-5 mr-2" />
            Crear Mi Albergue
          </Button>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  // Show error state (real connection/query failures only)
  if (hasErrors) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-red-700">Error de conexión</h2>
          <p className="text-gray-600 mt-2">No se pudieron cargar los datos del albergue.</p>
          <div className="mt-4 p-4 bg-red-50 rounded-lg text-left text-sm">
            <p className="font-semibold text-red-800">Detalles del error:</p>
            {shelterError && <p className="text-red-600">• Error del albergue: {shelterError.message}</p>}
            {petsError && <p className="text-red-600">• Error de mascotas: {petsError.message}</p>}
            {profileError && <p className="text-red-600">• Error del perfil: {profileError.message}</p>}
            {quotesError && <p className="text-red-600">• Error de solicitudes: {quotesError.message}</p>}
            {imagesError && <p className="text-red-600">• Error de imágenes: {imagesError.message}</p>}
            {videosError && <p className="text-red-600">• Error de videos: {videosError.message}</p>}
          </div>
          
          {/* Database Connection Test */}
          <div className={cn('mt-4 p-4 rounded-xl text-left text-sm border', pageUi.bgLight, pageUi.borderLight)}>
            <p className={cn('font-semibold', pageUi.text)}>Diagnóstico de Base de Datos</p>
            <p className="text-gray-600 mt-2">
              Los errores sugieren que las tablas de la base de datos no han sido creadas aún.
            </p>
            <p className="text-gray-600 mt-1">
              Para solucionarlo, ejecuta el script de base de datos en Supabase:
            </p>
            <div className="mt-2 p-2 bg-white rounded border text-xs">
              <p className="font-mono text-gray-700">1. Ve a tu proyecto Supabase</p>
              <p className="font-mono text-gray-700">2. Abre el SQL Editor</p>
              <p className="font-mono text-gray-700">3. Ejecuta: supabase-shelter-dashboard-schema.sql</p>
              <p className="font-mono text-gray-700">4. Luego ejecuta: supabase-shelter-dashboard-sample-data.sql</p>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const currentShelter = shelter;

  const pendingQuotesCount = displayQuotes.filter((q) => q.status === 'pending').length;
  const approvedQuotesCount = displayQuotes.filter((q) => q.status === 'approved').length;

  const bottomNavActive = (tab: string) =>
    activeTab === tab || (tab === 'pets' && activeTab === 'add-pet');

  type ShelterMainTab = keyof typeof shelterTabAccent;

  const shelterBottomNavClass = (tab: ShelterMainTab) =>
    cn(
      'flex w-full flex-col items-center justify-center rounded-xl p-1.5 transition-all duration-200 min-w-0 flex-1',
      bottomNavActive(tab)
        ? cn('shadow-lg scale-105', plainPageAccentTabActive[shelterTabAccent[tab]])
        : 'text-gray-500 hover:text-gray-700',
    );

  return (
    <DashboardShell variant="plain">
      <PageHeader
        title={pageHeader.title}
        subtitle={pageHeader.subtitle}
        variant="solid"
        accent={pageAccent}
      />
      <div className="hidden md:block">
        <MobileTabStrip
          tabs={SHELTER_MAIN_TABS}
          activeTab={activeTab === 'add-pet' ? 'pets' : activeTab}
          onChange={handleTabChange}
          variant="solid"
          accent={pageAccent}
        />
      </div>

      {/* Main Content */}
      <div className="pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <DashboardStatCard
              variant="plain"
              icon={PawPrint}
              value={displayPets.length}
              label="Mascotas"
              footer={`${displayPets.filter((p) => p.species === 'Dog').length} perros · ${displayPets.filter((p) => p.species === 'Cat').length} gatos`}
              gradientIndex={0}
            />
            <DashboardStatCard
              variant="plain"
              icon={Clock}
              value={pendingQuotesCount}
              label="Pendientes"
              footer="Requieren atención"
              gradientIndex={2}
            />
            <DashboardStatCard
              variant="plain"
              icon={CheckCircle2}
              value={approvedQuotesCount}
              label="Aprobadas"
              footer="Adopciones confirmadas"
              gradientIndex={1}
            />
            <DashboardStatCard
              variant="plain"
              icon={Users}
              value={currentShelter?.total_volunteers || 0}
              label="Voluntarios"
              footer="Miembros activos"
              gradientIndex={3}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Adoption Applications Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Solicitudes de Adopción (Últimos 7 días)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const last7Days = Array.from({ length: 7 }, (_, i) => {
                      const date = subDays(new Date(), 6 - i);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayStart = startOfDay(date);
                      const dayEnd = endOfDay(date);
                      
                      const dayQuotes = displayQuotes.filter(q => {
                        const quoteDate = parseISO(q.created_at);
                        return quoteDate >= dayStart && quoteDate <= dayEnd;
                      });
                      
                      return {
                        date: format(date, 'dd/MM', { locale: es }),
                        Pendientes: dayQuotes.filter(q => q.status === 'pending').length,
                        Aprobadas: dayQuotes.filter(q => q.status === 'approved').length,
                        Rechazadas: dayQuotes.filter(q => q.status === 'rejected').length
                      };
                    });
                    return last7Days;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Pendientes" fill={landingChartColors.mango} />
                    <Bar dataKey="Aprobadas" fill={landingChartColors.aqua} />
                    <Bar dataKey="Rechazadas" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pets by Species Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5" />
                  Mascotas por Especie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const speciesCount = displayPets.reduce((acc, pet) => {
                      const species = pet.species || 'Otro';
                      acc[species] = (acc[species] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return Object.entries(speciesCount).map(([species, count]) => ({
                      especie: species === 'Dog' ? 'Perro' : species === 'Cat' ? 'Gato' : species,
                      cantidad: count
                    }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="especie" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill={landingChartColors.mint} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Solicitudes Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {displayQuotes.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay solicitudes recientes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayQuotes.slice(0, 5).map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {quote.pet_name || 'Mascota'}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {quote.applicant_name || 'Solicitante'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(quote.created_at), "dd 'de' MMM, yyyy", { locale: es })}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            quote.status === 'approved' ? 'default' : 
                            quote.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                          className="ml-2 shrink-0"
                        >
                          {quote.status === 'pending' ? 'Pendiente' : 
                           quote.status === 'approved' ? 'Aprobada' : 
                           'Rechazada'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pets Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5" />
                  Resumen de Mascotas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={cn('flex items-center justify-between p-3 rounded-lg', pageUi.bgLight)}>
                    <div className="flex items-center gap-2">
                      <PawPrint className={cn('w-5 h-5', pageUi.text)} />
                      <span className="font-medium text-gray-700">Total Mascotas</span>
                    </div>
                    <span className={cn('text-2xl font-bold', pageUi.text)}>{displayPets.length}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Perros</p>
                      <p className="text-xl font-bold text-gray-900">
                        {displayPets.filter(p => p.species === 'Dog').length}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Gatos</p>
                      <p className="text-xl font-bold text-gray-900">
                        {displayPets.filter(p => p.species === 'Cat').length}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Otros</p>
                      <p className="text-xl font-bold text-gray-900">
                        {displayPets.filter(p => p.species && p.species !== 'Dog' && p.species !== 'Cat').length}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Con Imagen</p>
                      <p className="text-xl font-bold text-gray-900">
                        {displayPets.filter(p => p.image_url).length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 md:space-y-6">
          <MobileSectionCard className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex items-center gap-2">
              <Building2 className={cn('w-5 h-5', pageUi.text)} />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">Información del Albergue</h3>
            </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shelter-name" className="text-sm md:text-base">Nombre del Albergue</Label>
                    <Input 
                      id="shelter-name" 
                      value={shelterForm.name} 
                      onChange={(e) => setShelterForm({...shelterForm, name: e.target.value})}
                      className={cn('bg-white border-gray-300 w-full', pageUi.border)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shelter-location" className="text-sm md:text-base">Ubicación</Label>
                    <Input 
                      id="shelter-location" 
                      value={shelterForm.location} 
                      onChange={(e) => setShelterForm({...shelterForm, location: e.target.value})}
                      className={cn('bg-white border-gray-300 w-full', pageUi.border)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shelter-phone" className="text-sm md:text-base">Teléfono</Label>
                    <Input 
                      id="shelter-phone" 
                      value={shelterForm.phone} 
                      onChange={(e) => setShelterForm({...shelterForm, phone: e.target.value})}
                      className={cn('bg-white border-gray-300 w-full', pageUi.border)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shelter-email" className="text-sm md:text-base">Email</Label>
                    <Input 
                      id="shelter-email" 
                      value={shelterForm.email} 
                      onChange={(e) => setShelterForm({...shelterForm, email: e.target.value})}
                      className={cn('bg-white border-gray-300 w-full', pageUi.border)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                                     <div>
                    <Label htmlFor="shelter-mission" className="text-sm md:text-base">Declaración de Misión</Label>
                     <Textarea 
                       id="shelter-mission" 
                      value={shelterForm.mission_statement} 
                      onChange={(e) => setShelterForm({...shelterForm, mission_statement: e.target.value})}
                       placeholder="Describe la misión de tu albergue..."
                       rows={4}
                      className="w-full resize-none"
                     />
                   </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                      <Label htmlFor="shelter-years" className="text-sm md:text-base">Años de Experiencia</Label>
                       <Input 
                         id="shelter-years" 
                         type="number" 
                        value={shelterForm.years_experience} 
                        onChange={(e) => setShelterForm({...shelterForm, years_experience: parseInt(e.target.value) || 0})}
                         min="0"
                        className="w-full"
                       />
                     </div>
                     <div>
                      <Label htmlFor="shelter-volunteers" className="text-sm md:text-base">Total de Voluntarios</Label>
                       <Input 
                         id="shelter-volunteers" 
                         type="number" 
                        value={shelterForm.total_volunteers} 
                        onChange={(e) => setShelterForm({...shelterForm, total_volunteers: parseInt(e.target.value) || 0})}
                         min="0"
                        className="w-full"
                       />
                     </div>
                   </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSaveProfile} 
                  className={cn('w-full sm:w-auto', pageBtn, 'border-0')}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
          </MobileSectionCard>
        </TabsContent>

        {/* Pets Tab */}
        <TabsContent value="pets" className="space-y-6">
          {/* Pets Header with Filters and View Toggle */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Mascotas del Albergue</h3>
              <Button
                onClick={() => { setShowAddPetForm(true); setActiveTab('add-pet'); }}
                className={cn(pageBtn, 'border-0 w-full sm:w-auto min-h-[44px] rounded-xl shrink-0')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Mascota
              </Button>
            </div>

            {/* Filtros */}
            <div className={filterPanelClass(pageUi.borderLight)}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Nombre, raza o descripción…"
                  value={petFilters.search}
                  onChange={(e) => setPetFilters({ ...petFilters, search: e.target.value })}
                  className="pl-10 pr-4 min-h-[44px] rounded-xl border-gray-200/80 bg-white/90"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PET_SPECIES_CHIPS.map((chip) => {
                  const active = petFilters.species === chip.id;
                  return (
                    <button
                      key={chip.id || 'all'}
                      type="button"
                      onClick={() => setPetFilters({ ...petFilters, species: chip.id })}
                      className={cn(
                        'min-h-[40px] rounded-xl px-2 py-2 text-[11px] font-medium transition-all text-center leading-tight',
                        active ? cn(plainPageAccentTabActive[pageAccent], 'shadow-md')
                          : cn('bg-white border border-gray-200 text-gray-600 shadow-sm', pageUi.hoverBg)
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPetFilters(!showPetFilters)}
                  className={cn(
                    'flex items-center gap-2 min-h-[44px]',
                    pageOutlineBtn,
                    showPetFilters && pageUi.bgLight
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Más filtros
                  {showPetFilters && <X className="w-4 h-4" />}
                </Button>

                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={petViewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPetViewMode('cards')}
                    className={cn('h-9 px-3', petViewMode === 'cards' && 'bg-white shadow-sm')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={petViewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPetViewMode('list')}
                    className={cn('h-9 px-3', petViewMode === 'list' && 'bg-white shadow-sm')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                {hasActivePetFilters && (
                  <Button variant="ghost" onClick={clearPetFilters} className="text-red-600 hover:bg-red-50 min-h-[44px]">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Limpiar
                  </Button>
                )}

                <span className="text-sm font-medium text-gray-600 ml-auto bg-white/60 px-3 py-2 rounded-full whitespace-nowrap">
                  {filteredPets.length} de {displayPets.length} mascotas
                </span>
              </div>

              {showPetFilters && (
                <div className="pt-4 border-t border-gray-100/80 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Tamaño</label>
                      <Select value={petFilters.size || 'all'} onValueChange={(v) => setPetFilters({ ...petFilters, size: v === 'all' ? '' : v })}>
                        <SelectTrigger className="min-h-[44px] rounded-xl">
                          <SelectValue placeholder="Tamaño" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pequeño">Pequeño</SelectItem>
                          <SelectItem value="mediano">Mediano</SelectItem>
                          <SelectItem value="grande">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Edad</label>
                      <Select value={petFilters.age || 'all'} onValueChange={(v) => setPetFilters({ ...petFilters, age: v === 'all' ? '' : v })}>
                        <SelectTrigger className="min-h-[44px] rounded-xl">
                          <SelectValue placeholder="Edad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n === 10 ? '10+ años' : `${n} año${n > 1 ? 's' : ''}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Características</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'good_with_kids' as const, label: '👶 Niños' },
                        { key: 'good_with_dogs' as const, label: '🐕 Perros' },
                        { key: 'good_with_cats' as const, label: '🐱 Gatos' },
                        { key: 'house_trained' as const, label: '🏠 Educado' },
                        { key: 'spayed_neutered' as const, label: '✂️ Esterilizado' },
                        { key: 'special_needs' as const, label: '❤️ Especial' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPetFilters({ ...petFilters, [key]: !petFilters[key] })}
                          className={cn(
                            'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                            petFilters[key]
                              ? cn(plainPageAccentTabActive[pageAccent], 'border shadow-sm')
                              : cn('bg-white border-gray-200 text-gray-600', pageUi.hoverBg)
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {petsLoading ? (
            <MobileSectionCard className="p-8 text-center">
              <Loader2 className={cn('w-10 h-10 animate-spin mx-auto mb-3', pageUi.text)} />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Cargando mascotas…</h3>
              <p className="text-sm text-gray-500">Obteniendo datos del albergue</p>
            </MobileSectionCard>
          ) : filteredPets.length === 0 ? (
            <MobileSectionCard className="p-8 text-center">
              <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {displayPets.length === 0 ? 'No hay mascotas' : 'Sin resultados'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {displayPets.length === 0
                  ? 'Agrega tu primera mascota para comenzar a gestionar adopciones.'
                  : 'Prueba cambiar los filtros de búsqueda.'}
              </p>
              {displayPets.length === 0 && (
                <Button
                  onClick={() => { setShowAddPetForm(true); setActiveTab('add-pet'); }}
                  className={cn(pageBtn, 'border-0 min-h-[44px] rounded-xl')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Mascota
                </Button>
              )}
            </MobileSectionCard>
          ) : petViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPets.map((pet) => (
                <MobileSectionCard key={pet.id} className="overflow-hidden p-0">
                  <div className={cn('h-44 flex items-center justify-center relative', pageUi.bgLight)}>
                    {pet.image_url ? (
                      <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <PawPrint className={cn('w-16 h-16', pageUi.iconMuted)} />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-lg" onClick={() => handleEditPet(pet)} disabled={isUsingMockData}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-lg" onClick={() => handleDeletePet(pet.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-gray-900 truncate">{pet.name}</h4>
                      {pet.age != null && <span className="text-xs text-gray-500 shrink-0">{pet.age} años</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pet.breed && <Badge variant="secondary" className="text-[10px]">{pet.breed}</Badge>}
                      {pet.size && <Badge variant="outline" className="text-[10px]">{pet.size}</Badge>}
                      {pet.species && (
                        <Badge variant="outline" className={cn('text-[10px] border', pageUi.border, pageUi.text)}>
                          {pet.species === 'Dog' ? 'Perro' : pet.species === 'Cat' ? 'Gato' : pet.species}
                        </Badge>
                      )}
                    </div>
                    {pet.description && <p className="text-sm text-gray-600 line-clamp-2">{pet.description}</p>}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {pet.good_with_kids && <span className="text-xs px-2 py-0.5 rounded-full bg-landing-mint/15">👶</span>}
                      {pet.good_with_dogs && <span className={cn('text-xs px-2 py-0.5 rounded-full', pageUi.bgLight)}>🐕</span>}
                      {pet.good_with_cats && <span className={cn('text-xs px-2 py-0.5 rounded-full', pageUi.bgLight)}>🐱</span>}
                    </div>
                  </div>
                </MobileSectionCard>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPets.map((pet) => (
                <MobileSectionCard key={pet.id} className="p-4">
                  <div className="flex gap-3">
                    <div className={cn('w-16 h-16 rounded-xl overflow-hidden shrink-0 ring-2 ring-white shadow-sm', pageUi.bgLight)}>
                      {pet.image_url ? (
                        <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className={cn('w-7 h-7', pageUi.iconMuted)} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-gray-900 truncate">{pet.name}</h4>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditPet(pet)} disabled={isUsingMockData}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDeletePet(pet.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[pet.breed, pet.age != null ? `${pet.age} años` : null, pet.size].filter(Boolean).join(' · ')}
                      </p>
                      {pet.description && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{pet.description}</p>}
                    </div>
                  </div>
                </MobileSectionCard>
              ))}
            </div>
          )}
         </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Solicitudes de Adopción</h3>

          <div className={filterPanelClass(pageUi.borderLight)}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Mascota o solicitante…"
                value={quoteFilters.search}
                onChange={(e) => setQuoteFilters({ ...quoteFilters, search: e.target.value })}
                className="pl-10 pr-4 min-h-[44px] rounded-xl border-gray-200/80 bg-white/90"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {QUOTE_STATUS_CHIPS.map((chip) => {
                const active = quoteFilters.status === chip.id;
                return (
                  <button
                    key={chip.id || 'all'}
                    type="button"
                    onClick={() => setQuoteFilters({ ...quoteFilters, status: chip.id })}
                    className={cn(
                      'min-h-[40px] rounded-xl px-2 py-2 text-[11px] font-medium transition-all text-center leading-tight',
                      active ? cn(plainPageAccentTabActive[pageAccent], 'shadow-md')
                        : cn('bg-white border border-gray-200 text-gray-600 shadow-sm', pageUi.hoverBg)
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={quoteViewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setQuoteViewMode('cards')}
                  className={cn('h-9 px-3', quoteViewMode === 'cards' && 'bg-white shadow-sm')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={quoteViewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setQuoteViewMode('list')}
                  className={cn('h-9 px-3', quoteViewMode === 'list' && 'bg-white shadow-sm')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {hasActiveQuoteFilters && (
                <Button variant="ghost" onClick={clearQuoteFilters} className="text-red-600 hover:bg-red-50 min-h-[44px]">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}

              <span className="text-sm font-medium text-gray-600 ml-auto bg-white/60 px-3 py-2 rounded-full whitespace-nowrap">
                {filteredQuotes.length} de {displayQuotes.length} solicitudes
              </span>
            </div>
          </div>

          {filteredQuotes.length === 0 ? (
            <MobileSectionCard className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {displayQuotes.length === 0 ? 'No hay solicitudes' : 'Sin resultados'}
              </h3>
              <p className="text-sm text-gray-500">
                {displayQuotes.length === 0
                  ? 'Cuando los usuarios soliciten adoptar tus mascotas, aparecerán aquí.'
                  : 'Prueba cambiar los filtros de búsqueda.'}
              </p>
            </MobileSectionCard>
          ) : quoteViewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => {
                const petImage = displayPets.find((p) => p.id === quote.pet_id)?.image_url;
                return (
                  <MobileSectionCard key={quote.id} className="p-4">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
                        {petImage ? (
                          <img src={petImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn('w-full h-full flex items-center justify-center', pageUi.bgLight)}>
                            <PawPrint className={cn('w-7 h-7', pageUi.iconMuted)} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{quote.pet_name || 'Mascota'}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{quote.applicant_name || 'Solicitante'} · {formatDateShort(quote.created_at)}</p>
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', getQuoteStatusClass(quote.status))}>
                            {getQuoteStatusLabel(quote.status)}
                          </span>
                        </div>
                        {quote.message && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-3 bg-gray-50/80 rounded-lg px-3 py-2">{quote.message}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedApplication(quote); setShowChatModal(true); }}
                            className={cn('min-h-[40px]', pageOutlineBtn)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          {quote.status === 'pending' ? (
                            <Button
                              size="sm"
                              onClick={() => handleQuoteAction(quote.id, 'approved')}
                              className={cn('min-h-[40px]', pageBtn, 'border-0')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled className="min-h-[40px] opacity-50">
                              {getQuoteStatusLabel(quote.status)}
                            </Button>
                          )}
                          {quote.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuoteAction(quote.id, 'rejected')}
                              className="min-h-[40px] col-span-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </MobileSectionCard>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuotes.map((quote) => (
                <MobileSectionCard key={quote.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{quote.pet_name}</p>
                      <p className="text-xs text-gray-500">{quote.applicant_name} · {formatDateShort(quote.created_at)}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', getQuoteStatusClass(quote.status))}>
                      {getQuoteStatusLabel(quote.status)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedApplication(quote); setShowChatModal(true); }}>
                        <MessageCircle className={cn('w-4 h-4', pageUi.text)} />
                      </Button>
                      {quote.status === 'pending' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-landing-mint-dark" onClick={() => handleQuoteAction(quote.id, 'approved')}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => handleQuoteAction(quote.id, 'rejected')}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </MobileSectionCard>
              ))}
            </div>
          )}
      </TabsContent>

        {/* Add Pet Tab */}
        <TabsContent value="add-pet" className="space-y-4">
          {!showAddPetForm && !editingPet ? (
            <MobileSectionCard className="p-8 text-center">
              <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Gestionar Mascotas</h3>
              <p className="text-sm text-gray-500 mb-6">Agrega nuevas mascotas o edita las existentes desde la pestaña Mascotas</p>
              <Button
                onClick={() => {
                  setShowAddPetForm(true);
                  setActiveTab('add-pet');
                }}
                className={cn(pageBtn, 'border-0 min-h-[44px]')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Nueva Mascota
              </Button>
            </MobileSectionCard>
          ) : (
            <MobileSectionCard className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
                <Plus className={cn('w-5 h-5', pageUi.text)} />
                {editingPet ? 'Editar Mascota' : 'Agregar Nueva Mascota'}
              </h3>
              <div className="space-y-6">
                                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   {/* Basic Information */}
                   <div className="space-y-4">
                     <h4 className="font-semibold text-gray-800 border-b pb-2">Información Básica</h4>
                     <div>
                       <Label htmlFor="pet-name">Nombre *</Label>
                       <Input 
                         id="pet-name" 
                         value={newPet.name} 
                         onChange={(e) => setNewPet({...newPet, name: e.target.value})}
                         placeholder="Nombre de la mascota"
                       />
                     </div>
                     <div>
                       <Label htmlFor="pet-species">Especie *</Label>
                       <select
                         id="pet-species"
                         value={newPet.species}
                         onChange={(e) => setNewPet({...newPet, species: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                       >
                         <option value="Dog">Perro</option>
                         <option value="Cat">Gato</option>
                         <option value="Bird">Ave</option>
                         <option value="Fish">Pez</option>
                         <option value="Rabbit">Conejo</option>
                         <option value="Hamster">Hámster</option>
                         <option value="Other">Otro</option>
                       </select>
                     </div>
                     <div>
                       <Label htmlFor="pet-breed">Raza</Label>
                       {newPet.species === 'Dog' ? (
                         <select
                           id="pet-breed"
                           value={newPet.breed}
                           onChange={(e) => setNewPet({...newPet, breed: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                         >
                           <option value="">Selecciona una raza</option>
                           {dogBreeds.map((breed) => (
                             <option key={breed} value={breed}>
                               {breed}
                             </option>
                           ))}
                         </select>
                       ) : (
                       <Input 
                         id="pet-breed" 
                         value={newPet.breed} 
                         onChange={(e) => setNewPet({...newPet, breed: e.target.value})}
                         placeholder="Raza de la mascota"
                       />
                       )}
                     </div>
                     <div>
                       <Label htmlFor="pet-age">Edad (años)</Label>
                       <Input 
                         id="pet-age" 
                         type="number" 
                         value={newPet.age} 
                         onChange={(e) => setNewPet({...newPet, age: e.target.value})}
                         placeholder="Edad en años"
                       />
                     </div>
                     <div>
                       <Label htmlFor="pet-gender">Género</Label>
                       <select 
                         id="pet-gender"
                         value={newPet.gender}
                         onChange={(e) => setNewPet({...newPet, gender: e.target.value})}
                         className="w-full p-2 border border-gray-300 rounded-md"
                       >
                         <option value="">Seleccionar género</option>
                         <option value="macho">Macho</option>
                         <option value="hembra">Hembra</option>
                       </select>
                     </div>
                     <div>
                       <Label htmlFor="pet-size">Tamaño</Label>
                       <select 
                         id="pet-size"
                         value={newPet.size}
                         onChange={(e) => setNewPet({...newPet, size: e.target.value})}
                         className="w-full p-2 border border-gray-300 rounded-md"
                       >
                         <option value="">Seleccionar tamaño</option>
                         <option value="pequeño">Pequeño</option>
                         <option value="mediano">Mediano</option>
                         <option value="grande">Grande</option>
                       </select>
                     </div>
                     <div>
                       <Label htmlFor="pet-color">Color</Label>
                       <Input 
                         id="pet-color" 
                         value={newPet.color} 
                         onChange={(e) => setNewPet({...newPet, color: e.target.value})}
                         placeholder="Color principal"
                       />
                     </div>
                     <div>
                       <Label htmlFor="pet-weight">Peso (kg)</Label>
                       <Input 
                         id="pet-weight" 
                         type="number" 
                         step="0.1"
                         value={newPet.weight} 
                         onChange={(e) => setNewPet({...newPet, weight: e.target.value})}
                         placeholder="Peso en kg"
                       />
                     </div>
                   </div>
                   
                   {/* Behavior & Health */}
                   <div className="space-y-4">
                     <h4 className="font-semibold text-gray-800 border-b pb-2">Comportamiento & Salud</h4>
                     <div className="space-y-3">
                       <Label>Comportamiento</Label>
                       <div className="space-y-2">
                         <label className="flex items-center space-x-2">
                           <input 
                             type="checkbox" 
                             checked={newPet.good_with_kids}
                             onChange={(e) => setNewPet({...newPet, good_with_kids: e.target.checked})}
                             className="rounded"
                           />
                           <span className="text-sm">Bueno con niños</span>
                         </label>
                         <label className="flex items-center space-x-2">
                           <input 
                             type="checkbox" 
                             checked={newPet.good_with_dogs}
                             onChange={(e) => setNewPet({...newPet, good_with_dogs: e.target.checked})}
                             className="rounded"
                           />
                           <span className="text-sm">Bueno con perros</span>
                         </label>
                         <label className="flex items-center space-x-2">
                           <input 
                             type="checkbox" 
                             checked={newPet.good_with_cats}
                             onChange={(e) => setNewPet({...newPet, good_with_cats: e.target.checked})}
                             className="rounded"
                           />
                           <span className="text-sm">Bueno con gatos</span>
                         </label>
                         <label className="flex items-center space-x-2">
                           <input 
                             type="checkbox" 
                             checked={newPet.house_trained}
                             onChange={(e) => setNewPet({...newPet, house_trained: e.target.checked})}
                             className="rounded"
                           />
                           <span className="text-sm">Entrenado en casa</span>
                         </label>
                         <label className="flex items-center space-x-2">
                           <input 
                             type="checkbox" 
                             checked={newPet.spayed_neutered}
                             onChange={(e) => setNewPet({...newPet, spayed_neutered: e.target.checked})}
                             className="rounded"
                           />
                           <span className="text-sm">Esterilizado/Castrado</span>
                         </label>
                       </div>
                     </div>
                     
                     <div>
                       <Label htmlFor="pet-medical-notes">Notas Médicas</Label>
                       <Textarea 
                         id="pet-medical-notes" 
                         value={newPet.medical_notes} 
                         onChange={(e) => setNewPet({...newPet, medical_notes: e.target.value})}
                         placeholder="Vacunas, tratamientos, etc."
                         rows={3}
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="pet-special-needs">Necesidades Especiales</Label>
                       <div className="space-y-2">
                         <label className="flex items-center space-x-2">
                           <input 
                             type="checkbox" 
                             checked={newPet.special_needs}
                             onChange={(e) => setNewPet({...newPet, special_needs: e.target.checked})}
                             className="rounded"
                           />
                           <span className="text-sm">Tiene necesidades especiales</span>
                         </label>
                         {newPet.special_needs && (
                           <Textarea 
                             value={newPet.special_needs_description} 
                             onChange={(e) => setNewPet({...newPet, special_needs_description: e.target.value})}
                             placeholder="Describe las necesidades especiales..."
                             rows={3}
                           />
                         )}
                       </div>
                     </div>
                   </div>
                   
                   {/* Additional Details */}
                   <div className="space-y-4">
                     <h4 className="font-semibold text-gray-800 border-b pb-2">Detalles Adicionales</h4>
                     <div>
                       <Label htmlFor="pet-description">Descripción</Label>
                       <Textarea 
                         id="pet-description" 
                         value={newPet.description} 
                         onChange={(e) => setNewPet({...newPet, description: e.target.value})}
                         placeholder="Describe la mascota, personalidad, etc."
                         rows={4}
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="pet-location">Ubicación</Label>
                       <Input 
                         id="pet-location" 
                         value={newPet.location} 
                         onChange={(e) => setNewPet({...newPet, location: e.target.value})}
                         placeholder="Ciudad, estado"
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="pet-adoption-fee">Cuota de Adopción</Label>
                       <Input 
                         id="pet-adoption-fee" 
                         value={newPet.adoption_fee} 
                         onChange={(e) => setNewPet({...newPet, adoption_fee: e.target.value})}
                         placeholder="$0.00 o 'Gratis'"
                       />
                     </div>
                     
                     <div>
                       <Label>Foto de la Mascota</Label>
                       <div className="mt-2">
                         <input
                           type="file"
                           accept="image/*"
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             
                             console.log('=== PET IMAGE UPLOAD START ===');
                             console.log('File:', file.name, file.size, file.type);
                             
                             setUploadingImage(true);
                             try {
                               // Upload to pet-images bucket
                               const fileName = `pet-${Date.now()}-${file.name}`;
                               const filePath = `${currentShelter?.id || 'test'}/${fileName}`;
                               
                               console.log('Uploading to:', filePath);
                               
                               const { data, error } = await supabase.storage
                                 .from('pet-images')
                                 .upload(filePath, file);
                               
                               if (error) {
                                 console.error('Upload error:', error);
                                 toast.error(`Error al subir la imagen: ${error.message}`);
                                 return;
                               }
                               
                               console.log('Upload success:', data);
                               
                               // Get public URL
                               const { data: { publicUrl } } = supabase.storage
                                 .from('pet-images')
                                 .getPublicUrl(filePath);
                               
                               console.log('Public URL:', publicUrl);
                               
                               // Update state
                               setNewPet(prev => ({ ...prev, image_url: publicUrl }));
                               
                               toast.success('La imagen de la mascota se ha guardado correctamente');
                               console.log('=== PET IMAGE UPLOAD SUCCESS ===');
                               
                             } catch (error) {
                               console.error('Error:', error);
                               toast.error(`No se pudo subir la imagen: ${error.message}`);
                             } finally {
                               setUploadingImage(false);
                             }
                           }}
                           className={cn('w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer transition-colors', pageUi.borderActive.replace(/^border-/, 'hover:border-'))}
                         />
                         {uploadingImage && (
                           <p className={cn('text-sm mt-2 text-center', pageUi.text)}>Subiendo imagen…</p>
                         )}
                         {newPet.image_url && (
                           <div className="mt-2">
                             <img src={newPet.image_url} alt="Pet preview" className="w-32 h-32 object-cover rounded-lg mx-auto" />
                             <p className="text-xs text-green-600 text-center mt-1">Image uploaded!</p>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddPetForm(false);
                      setEditingPet(null);
                      setNewPet({
                        name: '',
                        species: 'Dog',
                        breed: '',
                        age: '',
                        size: '',
                        gender: '',
                        color: '',
                        weight: '',
                        description: '',
                        image_url: '',
                        good_with_kids: false,
                        good_with_dogs: false,
                        good_with_cats: false,
                        house_trained: false,
                        spayed_neutered: false,
                        special_needs: false,
                        special_needs_description: '',
                        medical_notes: '',
                        adoption_fee: '',
                        location: ''
                      });
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={editingPet ? handleUpdatePet : handleAddPet}
                    className={cn(pageBtn, 'border-0')}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingPet ? 'Actualizar Mascota' : 'Agregar Mascota'}
                  </Button>
                </div>
              </div>
            </MobileSectionCard>
          )}
        </TabsContent>

         {/* Media Tab */}
         <TabsContent value="media" className="space-y-4">
           <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
             <Image className={cn('w-5 h-5', pageUi.text)} />
             Imágenes y Videos
           </h3>

           <MobileSectionCard className="p-4 space-y-4">
             <div className="flex items-center justify-between gap-3">
               <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                 <Image className="w-4 h-4" />
                 Imágenes ({shelterImages.length})
               </h4>
               <input
                 type="file"
                 accept="image/*"
                 onChange={handleImageUpload}
                 className="hidden"
                 id="image-upload-header"
                 disabled={uploadingImage}
               />
               <Button
                 size="sm"
                 className={cn(pageBtn, 'border-0 min-h-[40px]')}
                 onClick={() => document.getElementById('image-upload-header')?.click()}
                 disabled={uploadingImage}
               >
                 <Upload className="w-4 h-4 mr-1" />
                 {uploadingImage ? 'Subiendo…' : 'Subir'}
               </Button>
             </div>

             {shelterImages.length === 0 ? (
               <div className={cn('text-center py-8 border-2 border-dashed rounded-xl bg-white', pageUi.borderLight)}>
                 <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                 <p className="text-sm text-gray-500">Estas imágenes aparecerán en el perfil público del albergue.</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                 {shelterImages.map((image) => (
                   <div key={image.id} className="relative group">
                     <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden ring-2 ring-white shadow-sm">
                       <img
                         src={image.image_url || '/placeholder.svg'}
                         alt=""
                         className="w-full h-full object-cover"
                       />
                     </div>
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                       <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setPreviewImageUrl(image.image_url)}>
                         <Eye className="w-4 h-4" />
                       </Button>
                       <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={async () => {
                         const { error } = await supabase.from('shelter_images').delete().eq('id', image.id);
                         if (error) toast.error(`Error al eliminar: ${error.message}`);
                         else {
                           toast.success('Imagen eliminada correctamente');
                           queryClient.invalidateQueries({ queryKey: ['shelter-images', user.id] });
                         }
                       }}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </MobileSectionCard>

           <MobileSectionCard className="p-4 space-y-4">
             <div className="flex items-center justify-between gap-3">
               <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                 <Video className="w-4 h-4" />
                 Videos ({shelterVideos.length})
               </h4>
               <input
                 type="file"
                 accept="video/*"
                 onChange={handleVideoUpload}
                 className="hidden"
                 id="video-upload-header"
                 disabled={uploadingVideo}
               />
               <Button
                 size="sm"
                 className={cn(pageBtn, 'border-0 min-h-[40px]')}
                 onClick={() => document.getElementById('video-upload-header')?.click()}
                 disabled={uploadingVideo}
               >
                 <Upload className="w-4 h-4 mr-1" />
                 {uploadingVideo ? 'Subiendo…' : 'Subir'}
               </Button>
             </div>

             {shelterVideos.length === 0 ? (
               <div className="text-center py-8 border-2 border-dashed border-landing-mint/20 rounded-xl bg-white/50">
                 <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                 <p className="text-sm text-gray-500">Los videos aparecerán en el perfil público del albergue.</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                 {shelterVideos.map((video) => (
                   <div key={video.id} className="relative group">
                     <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden ring-2 ring-white shadow-sm">
                       <div className={cn('w-full h-full flex items-center justify-center', pageUi.bgLight)}>
                         <Play className={cn('w-10 h-10', pageUi.text)} />
                       </div>
                     </div>
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                       <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setPreviewVideoUrl(video.youtube_url)}>
                         <Play className="w-4 h-4" />
                       </Button>
                       <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={async () => {
                         const { error } = await supabase.from('shelter_videos').delete().eq('id', video.id);
                         if (error) toast.error(`Error al eliminar: ${error.message}`);
                         else {
                           toast.success('Video eliminado correctamente');
                           queryClient.invalidateQueries({ queryKey: ['shelter-videos', user.id] });
                         }
                       }}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                     <p className="mt-1.5 text-xs text-gray-500 text-center truncate">
                       {video.title || video.youtube_url?.split('/').pop() || 'Video'}
                     </p>
                   </div>
                 ))}
               </div>
             )}
           </MobileSectionCard>

           <div className={filterPanelClass(pageUi.borderLight)}>
             <p className="text-sm font-medium text-gray-700">Subir nuevo contenido</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className={cn('border-2 border-dashed rounded-xl p-5 text-center bg-white', pageUi.border, pageUi.bgSoft)}>
                 <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                 <p className="text-sm text-gray-600 mb-1">PNG, JPG, GIF hasta 50MB</p>
                 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" disabled={uploadingImage} />
                 <Button className={cn(pageBtn, 'border-0 mt-2')} onClick={() => document.getElementById('image-upload')?.click()} disabled={uploadingImage}>
                   <Upload className="w-4 h-4 mr-2" />
                   {uploadingImage ? 'Subiendo…' : 'Seleccionar imagen'}
                 </Button>
               </div>
               <div className="border-2 border-dashed border-landing-mint/25 rounded-xl p-5 text-center bg-white/60">
                 <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                 <p className="text-sm text-gray-600 mb-1">MP4, MOV hasta 50MB</p>
                 <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" id="video-upload" disabled={uploadingVideo} />
                 <Button className={cn(pageBtn, 'border-0 mt-2')} onClick={() => document.getElementById('video-upload')?.click()} disabled={uploadingVideo}>
                   <Upload className="w-4 h-4 mr-2" />
                   {uploadingVideo ? 'Subiendo…' : 'Seleccionar video'}
                 </Button>
               </div>
             </div>
           </div>
         </TabsContent>
       </Tabs>
      </div>

      <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <img src={previewImageUrl} alt="Vista previa" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewVideoUrl} onOpenChange={() => setPreviewVideoUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa de video</DialogTitle>
          </DialogHeader>
          {previewVideoUrl && (
            <video src={previewVideoUrl} controls className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Adoption Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className={cn('w-5 h-5', pageUi.text)} />
              Chat con el Cliente
            </DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="flex-1 flex flex-col">
              {/* Application Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-xl">🐾</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {selectedApplication.pet_name || 'Mascota'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Solicitud de adopción • {new Date(selectedApplication.created_at).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Cliente: {selectedApplication.applicant_name || 'Usuario'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[400px]">
                {loadingChat ? (
                  <div className="flex items-center justify-center h-full">
                    <LandingSpinner size="sm" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No hay mensajes aún</p>
                    <p className="text-xs mt-1">Comienza la conversación</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      const isSystemMessage = message.message_type === 'system';

                      if (isSystemMessage) {
                        return (
                          <div key={message.id} className="flex justify-center px-2">
                            <div className="text-center max-w-[90%] px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                              <p className="text-sm text-gray-800 leading-relaxed">{message.message}</p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                Sistema • {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`rounded-lg p-3 max-w-[70%] shadow-sm ${
                              isOwnMessage
                                ? cn(pageBtn, 'text-white')
                                : 'bg-white text-gray-900 border border-gray-100'
                            }`}
                          >
                            <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                              {message.message}
                            </p>
                            <p className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                              {isOwnMessage
                                ? 'Tú'
                                : selectedApplication.applicant_id === message.sender_id
                                  ? 'Cliente'
                                  : 'Albergue'}{' '}
                              • {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input 
                  placeholder="Escribe tu mensaje..." 
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending || loadingChat || !chatRoom}
                />
                <Button 
                  type="button" 
                  className={cn(pageBtn, 'border-0')}
                  onClick={sendMessage}
                  disabled={sending || loadingChat || !chatRoom || !newMessage.trim()}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation Menu - Mobile Only */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 shadow-2xl backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex h-[58px] w-full max-w-lg items-end overflow-visible px-1">
          <div className="relative flex min-w-0 flex-1 items-end justify-around">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={shelterBottomNavClass('dashboard')}
            >
              <BarChart3 size={17} className="mb-0.5" />
              <span className="text-[9px] font-medium truncate leading-tight">Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={shelterBottomNavClass('profile')}
            >
              <Building2 size={17} className="mb-0.5" />
              <span className="text-[9px] font-medium truncate leading-tight">Perfil</span>
            </button>
          </div>

          <BlueprintMascotNavTab dashboard="shelter" />

          <div className="relative flex min-w-0 flex-[1.35] items-end justify-around">
            <button
              onClick={() => handleTabChange('pets')}
              className={shelterBottomNavClass('pets')}
            >
              <PawPrint size={17} className="mb-0.5" />
              <span className="text-[9px] font-medium truncate leading-tight">Mascotas</span>
            </button>

            <button
              onClick={() => handleTabChange('quotes')}
              className={shelterBottomNavClass('quotes')}
            >
              <MessageSquare size={17} className="mb-0.5" />
              <span className="text-[9px] font-medium truncate leading-tight">Solicitudes</span>
            </button>

            <button
              onClick={() => handleTabChange('media')}
              className={shelterBottomNavClass('media')}
            >
              <Image size={17} className="mb-0.5" />
              <span className="text-[9px] font-medium truncate leading-tight">Media</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default ShelterDashboard;

