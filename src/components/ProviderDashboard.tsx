import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, 
  Users, 
  Calendar, 
  Star, 
  Settings,
  LogOut,
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  Plus,
  Edit,
  Trash2,
  Clock,
  Coins,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Tag,
  Scale,
  Ruler,
  Image as ImageIcon,
  Info,
  FileText,
  Timer,
  BookOpen,
  Grid,
  List,
  ShoppingCart,
  Store,
  ShoppingBag,
  Scissors,
  Sparkles
} from 'lucide-react';
import { useProvider, ProviderService, ProviderProduct } from '@/hooks/useProvider';
import ProviderServiceModal from './ProviderServiceModal';
import { ProviderAvailabilitySettings } from '@/components/availability/ProviderAvailabilitySettings';
import ProviderProductModal from './ProviderProductModal';
import ProviderProductImportDialog from './ProviderProductImportDialog';
import ProviderOrders from './ProviderOrders';
import LocationPicker from './LocationPicker';
import ProviderReviews from './ProviderReviews';
import OrderItemPetsList from './OrderItemPetsList';
import ProfilePictureUpload from './ProfilePictureUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { DashboardShell } from './dashboard/DashboardShell';
import PageLoader from '@/components/PageLoader';
import PageHeader from './PageHeader';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { BlueprintMascotNavTab } from '@/components/blueprint/BlueprintMascotNavTab';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { DashboardStatCard } from './dashboard/DashboardStatCard';
import {
  plainPageAccentTabActive,
  providerMainTabAccent,
  resolveProviderDashboardAccent,
  type ProviderDashboardMainTab,
} from '@/lib/landingTheme';
import { useProviderDashboardTheme } from '@/contexts/ProviderDashboardThemeContext';
import { cn } from '@/lib/utils';
import { formatAppointmentPrice } from '@/utils/appointmentDisplay';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, isSameDay, startOfDay, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const SERVICE_CATEGORIES = [
  { value: 'veterinaria', label: 'Veterinaria', icon: '🐕' },
  { value: 'grooming', label: 'Grooming', icon: '✂️' },
  { value: 'entrenamiento', label: 'Entrenamiento', icon: '🎾' },
  { value: 'alojamiento', label: 'Alojamiento', icon: '🏠' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'fisioterapia', label: 'Fisioterapia', icon: '💆' },
  { value: 'nutricion', label: 'Nutrición', icon: '🥩' },
  { value: 'otro', label: 'Otro', icon: '🔧' }
];

const PRODUCT_CATEGORIES = [
  { value: 'alimentos', label: 'Alimentos', icon: '🍖' },
  { value: 'juguetes', label: 'Juguetes', icon: '🎾' },
  { value: 'accesorios', label: 'Accesorios', icon: '🦮' },
  { value: 'higiene', label: 'Higiene', icon: '🧴' },
  { value: 'medicamentos', label: 'Medicamentos', icon: '💊' },
  { value: 'ropa', label: 'Ropa', icon: '👕' },
  { value: 'camas', label: 'Camas y Descanso', icon: '🛏️' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'otro', label: 'Otro', icon: '🔧' }
];

  const ProviderDashboard: React.FC = () => {
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const guidedTour = useBlueprintGuidedTourOptional();
  const [activeTab, setActiveTab] = useState(() => {
    // Check if navigation state has activeTab
    const state = location.state as { activeTab?: string } | null;
    return state?.activeTab || 'dashboard';
  });
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const state = location.state as { activeSubTab?: string } | null;
    return state?.activeSubTab || '';
  });
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProductImportOpen, setIsProductImportOpen] = useState(false);
  const [productImportDraft, setProductImportDraft] = useState<Omit<
    ProviderProduct,
    'id' | 'provider_id' | 'created_at' | 'updated_at'
  > | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProviderProduct | null>(null);
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    cancelledOrders: 0,
    totalProductsSold: 0,
    totalServicesBooked: 0,
    averageRating: 0,
    totalReviews: 0,
    pendingAppointments: 0,
    monthlyChartData: [] as Array<{ month: string; revenue: number; orders: number }>,
    confirmedAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    upcomingAppointments: 0,
    activeServices: 0,
    inactiveServices: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    lowStockProducts: 0,
    totalServiceCategories: 0,
    totalProductCategories: 0
  });

  // Always start with dashboard tab when component mounts
  // (removed localStorage persistence to always show dashboard by default)

  // Check navigation state for activeTab on mount and when location changes
  useEffect(() => {
    const state = location.state as {
      activeTab?: string;
      activeSubTab?: string;
    } | null;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      if (state.activeSubTab) {
        setActiveSubTab(state.activeSubTab);
      }
      window.history.replaceState({}, document.title);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  // Scroll to top whenever activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Listen for tab change events from SettingsDropdown
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
      // Scroll to top when tab changes via event
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('providerDashboardTabChange', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('providerDashboardTabChange', handleTabChange as EventListener);
    };
  }, []);

  const {
    profile,
    services,
    products,
    appointments,
    loading,
    error,
    saveProfile,
    uploadProfilePicture,
    addService,
    updateService,
    deleteService,
    addProduct,
    updateProduct,
    deleteProduct,
    updateAppointmentStatus,
    saveServiceAvailability,
    fetchServiceAvailability,
    saveServiceTimeSlots,
    fetchServiceTimeSlots,
    fetchProviderAvailability,
    fetchProviderTimeSlots,
    saveProviderAvailability,
    saveProviderTimeSlots,
  } = useProvider();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    business_name: '',
    business_type: '',
    phone: '',
    address: '',
    description: '',
    profile_picture_url: '',
    city_id: 0,
    google_place_id: '',
    formatted_address: '',
    neighborhood: '',
    postal_code: '',
    municipality: '', // Municipio
    department: '', // Departamento
    has_delivery: false,
    has_pickup: false,
    delivery_fee: 0,
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined
  });

  // Profile picture state
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);

  // Fetch revenue data
  const fetchRevenueData = async () => {
    if (!profile) return;

    try {
      // Get order items for this provider
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (*)
        `)
        .eq('provider_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Calculate revenue metrics
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let totalOrders = 0;
      let completedOrders = 0;
      let pendingOrders = 0;
      let totalProductsSold = 0;
      let totalServicesBooked = 0;

      const orderMap = new Map<string, any>();

      orderItemsData?.forEach(item => {
        const order = item.orders;
        if (!order) return;

        if (!orderMap.has(order.id)) {
          orderMap.set(order.id, {
            ...order,
            items: []
          });
        }

        const orderData = orderMap.get(order.id);
        orderData.items.push(item);
      });

      // Generate monthly data for the last 6 months
      const monthlyDataMap = new Map<string, { revenue: number; orders: number }>();
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM', { locale: es });
        monthlyDataMap.set(monthKey, { revenue: 0, orders: 0 });
        return { key: monthKey, label: monthLabel };
      });

      orderMap.forEach(order => {
        totalOrders++;
        
        if (order.status === 'completed') {
          completedOrders++;
        } else if (order.status === 'pending') {
          pendingOrders++;
        }

        if (order.payment_status === 'completed') {
          const orderTotal = order.items.reduce((sum: number, item: any) => sum + item.total_price, 0);
          totalRevenue += orderTotal;

          // Count products and services sold
          order.items.forEach((item: any) => {
            if (item.item_type === 'product') {
              totalProductsSold += item.quantity;
            } else if (item.item_type === 'service') {
              totalServicesBooked += item.quantity;
            }
          });

          // Check if order is from current month
          const orderDate = new Date(order.created_at);
          if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
            monthlyRevenue += orderTotal;
          }

          // Add to monthly chart data
          const orderMonthKey = format(orderDate, 'yyyy-MM');
          if (monthlyDataMap.has(orderMonthKey)) {
            const monthData = monthlyDataMap.get(orderMonthKey)!;
            monthData.revenue += orderTotal;
            monthData.orders += 1;
          }
        }
      });

      // Convert monthly data map to array
      const monthlyChartData = last6Months.map(({ key, label }) => {
        const data = monthlyDataMap.get(key) || { revenue: 0, orders: 0 };
        return {
          month: label,
          revenue: data.revenue,
          orders: data.orders
        };
      });

      // Calculate average rating from profile
      const averageRating = profile?.rating || 0;
      const totalReviews = profile?.total_reviews || 0;

      // Calculate order status breakdown
      const confirmedOrders = Array.from(orderMap.values()).filter((o: any) => o.status === 'confirmed').length;
      const processingOrders = Array.from(orderMap.values()).filter((o: any) => o.status === 'processing').length;
      const shippedOrders = Array.from(orderMap.values()).filter((o: any) => o.status === 'shipped').length;
      const cancelledOrders = Array.from(orderMap.values()).filter((o: any) => o.status === 'cancelled').length;

      setRevenueData(prev => ({
        ...prev,
        totalRevenue,
        monthlyRevenue,
        totalOrders,
        completedOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        cancelledOrders,
        totalProductsSold,
        totalServicesBooked,
        averageRating,
        totalReviews,
        monthlyChartData
      }));
    } catch (err) {
      console.error('Error fetching revenue data:', err);
    }
  };

  // Departments state for location selection
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Calendar state for appointments
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const state = location.state as { appointmentId?: string; activeSubTab?: string } | null;
    if (!state?.appointmentId || state.activeSubTab !== 'appointments' || appointments.length === 0) return;

    const appointment = appointments.find((item) => item.id === state.appointmentId);
    if (appointment?.appointment_date) {
      setSelectedDate(parseISO(appointment.appointment_date));
    }
  }, [location.state, appointments]);

  // Fetch unique departments for location selection
  const fetchDepartments = async () => {
    try {
      // Get all departments from guatemala_cities table (without filtering by is_active)
      // This ensures we get all 22 departments of Guatemala
      const { data, error } = await supabase
        .from('guatemala_cities')
        .select('department');
      
      if (error) throw error;
      
      // Get unique departments and sort them
      const uniqueDepartments = Array.from(new Set((data || []).map(c => c.department)))
        .filter(Boolean)
        .sort();
      
      // If we don't have all 22 departments, use a hardcoded list as fallback
      const allGuatemalaDepartments = [
        'Alta Verapaz',
        'Baja Verapaz',
        'Chimaltenango',
        'Chiquimula',
        'El Progreso',
        'Escuintla',
        'Guatemala',
        'Huehuetenango',
        'Izabal',
        'Jalapa',
        'Jutiapa',
        'Petén',
        'Quetzaltenango',
        'Quiché',
        'Retalhuleu',
        'Sacatepéquez',
        'San Marcos',
        'Santa Rosa',
        'Sololá',
        'Suchitepéquez',
        'Totonicapán',
        'Zacapa'
      ];
      
      // Use the hardcoded list if we have fewer departments than expected
      // Otherwise use the unique departments from the database
      const finalDepartments = uniqueDepartments.length >= 20 
        ? uniqueDepartments 
        : allGuatemalaDepartments;
      
      setDepartments(finalDepartments);
      console.log('Departments loaded:', finalDepartments.length, finalDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to hardcoded list if query fails
      const allGuatemalaDepartments = [
        'Alta Verapaz',
        'Baja Verapaz',
        'Chimaltenango',
        'Chiquimula',
        'El Progreso',
        'Escuintla',
        'Guatemala',
        'Huehuetenango',
        'Izabal',
        'Jalapa',
        'Jutiapa',
        'Petén',
        'Quetzaltenango',
        'Quiché',
        'Retalhuleu',
        'Sacatepéquez',
        'San Marcos',
        'Santa Rosa',
        'Sololá',
        'Suchitepéquez',
        'Totonicapán',
        'Zacapa'
      ];
      setDepartments(allGuatemalaDepartments);
    }
  };

  // Fetch departments on component mount
  React.useEffect(() => {
    fetchDepartments();
  }, []);

  // New providers should start in edit mode so they can complete their profile (incl. map)
  React.useEffect(() => {
    if (!loading && user && !profile) {
      setIsProfileEditing(true);
    }
  }, [loading, user, profile]);

  React.useEffect(() => {
    if (
      guidedTour?.isActive &&
      guidedTour.dashboard === 'provider' &&
      guidedTour.currentStep?.sectionId === 'provider-profile' &&
      guidedTour.currentStep?.waitForSave &&
      !isProfileEditing
    ) {
      setIsProfileEditing(true);
    }
  }, [
    guidedTour?.isActive,
    guidedTour?.dashboard,
    guidedTour?.currentStep?.id,
    guidedTour?.currentStep?.sectionId,
    guidedTour?.currentStep?.waitForSave,
    isProfileEditing,
  ]);

  // Initialize profile form when profile data is loaded
  React.useEffect(() => {
    if (profile) {
      console.log('🔄 Profile loaded, initializing form:', {
        latitude: profile.latitude,
        longitude: profile.longitude,
        address: profile.address,
        municipality: profile.municipality,
        department: profile.department,
      });

      setProfileForm({
        business_name: profile.business_name || '',
        business_type: profile.business_type || '',
        phone: profile.phone || '',
        address: profile.address || '',
        description: profile.description || '',
        profile_picture_url: profile.profile_picture_url || '',
        city_id: profile.city_id || 0,
        google_place_id: profile.google_place_id || '',
        formatted_address: profile.formatted_address || '',
        neighborhood: profile.neighborhood || '',
        postal_code: profile.postal_code || '',
        municipality: profile.municipality || '',
        department: profile.department || '',
        has_delivery: profile.has_delivery || false,
        has_pickup: profile.has_pickup || false,
        delivery_fee: profile.delivery_fee || 0,
        latitude: profile.latitude ?? undefined,
        longitude: profile.longitude ?? undefined
      });
      fetchRevenueData();
      
      // Update appointment and service/product stats
      if (appointments && products && services) {
        const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
        const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').length;
        const completedAppointments = appointments.filter(a => a.status === 'completed').length;
        const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
        
        // Get upcoming appointments (future dates)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingAppointments = appointments.filter(a => {
          const aptDate = new Date(a.appointment_date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate >= today && (a.status === 'pending' || a.status === 'confirmed');
        }).length;

        const activeServices = services.filter(s => s.is_active).length;
        const inactiveServices = services.filter(s => !s.is_active).length;
        const activeProducts = products.filter(p => p.is_active).length;
        const inactiveProducts = products.filter(p => !p.is_active).length;
        const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;
        
        // Get unique categories
        const serviceCategories = new Set(services.map(s => s.service_category));
        const productCategories = new Set(products.map(p => p.product_category));

        setRevenueData(prev => ({
          ...prev,
          pendingAppointments,
          confirmedAppointments,
          completedAppointments,
          cancelledAppointments,
          upcomingAppointments,
          activeServices,
          inactiveServices,
          activeProducts,
          inactiveProducts,
          lowStockProducts,
          totalServiceCategories: serviceCategories.size,
          totalProductCategories: productCategories.size
        }));
      }
    }
  }, [profile, appointments, products, services]);

  

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('user_role');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileSave = async () => {
    console.log('💾 handleProfileSave called');
    console.log('📋 Current profileForm before save:', {
      latitude: profileForm.latitude,
      longitude: profileForm.longitude,
      address: profileForm.address,
      business_name: profileForm.business_name
    });
    
    try {
      let profilePictureUrl = profileForm.profile_picture_url;

      // Upload new profile picture if selected
      if (selectedProfilePicture) {
        profilePictureUrl = await uploadProfilePicture(selectedProfilePicture);
      }

      // Validate that we have a profile picture
      if (!profilePictureUrl) {
        toast({
          title: "⚠️ Foto de Perfil Requerida",
          description: "La foto de perfil es obligatoria para continuar.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Validate required business fields
      if (!profileForm.business_name?.trim() || !profileForm.business_type?.trim()) {
        toast({
          title: "⚠️ Información Requerida",
          description: "Completa el nombre del negocio y el tipo de negocio.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Validate that we have address information
      if (!profileForm.address || !profileForm.municipality || !profileForm.department) {
        toast({
          title: "⚠️ Dirección Requerida",
          description: "Debes completar la dirección, municipio y departamento para continuar.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Prepare profile data, ensuring latitude and longitude are included
      const profileDataToSave = {
        ...profileForm,
        profile_picture_url: profilePictureUrl,
        latitude: profileForm.latitude !== undefined ? profileForm.latitude : null,
        longitude: profileForm.longitude !== undefined ? profileForm.longitude : null
      };

      console.log('💾 Saving profile with location data:', {
        latitude: profileDataToSave.latitude,
        longitude: profileDataToSave.longitude,
        address: profileDataToSave.address
      });

      await saveProfile(profileDataToSave);

      void guidedTour?.notifySectionSaved('provider-profile');

      setIsProfileEditing(false);
      setSelectedProfilePicture(null);
      toast({
        title: profile ? "✅ Perfil Actualizado" : "✅ Perfil Creado",
        description: "Tu perfil de proveedor ha sido guardado exitosamente.",
        variant: "default",
        duration: 4000,
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      const supabaseError = error as { message?: string; details?: string; hint?: string };
      const errorMessage =
        supabaseError.details ||
        supabaseError.message ||
        (error instanceof Error ? error.message : 'Error desconocido');
      toast({
        title: "❌ Error al Guardar",
        description: `No se pudo actualizar el perfil: ${errorMessage}`,
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  const handleServiceSave = async (serviceData, availability = [], timeSlots = []) => {
    try {
      const usesCustom = Boolean(serviceData.uses_custom_availability);
      const availabilityToSave = usesCustom ? availability : [];
      const timeSlotsToSave = usesCustom ? timeSlots : [];

      let savedService;
      if (editingService) {
        savedService = await updateService(editingService.id, serviceData);

        await saveServiceAvailability(editingService.id, availabilityToSave);
        await saveServiceTimeSlots(editingService.id, timeSlotsToSave);
        
        toast({
          title: "✅ Servicio Actualizado",
          description: `"${serviceData.service_name}" ha sido actualizado exitosamente.`,
          variant: "default",
          duration: 4000,
        });
      } else {
        savedService = await addService(serviceData);

        await saveServiceAvailability(savedService.id, availabilityToSave);
        await saveServiceTimeSlots(savedService.id, timeSlotsToSave);
        
        toast({
          title: "🎉 Servicio Creado",
          description: `"${serviceData.service_name}" ha sido agregado exitosamente a tu catálogo.`,
          variant: "default",
          duration: 4000,
        });
      }

      console.log('=== SERVICE SAVE COMPLETE ===');
      void guidedTour?.notifySectionSaved('provider-services');
      setEditingService(null);
      setIsServiceModalOpen(false);
    } catch (error) {
      console.error('❌ Error saving service:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "❌ Error al Guardar",
        description: `No se pudo ${editingService ? 'actualizar' : 'crear'} el servicio: ${errorMessage}`,
        variant: "destructive",
        duration: 6000,
      });
      throw error; // Re-throw to prevent silent failures
    }
  };

  const handleServiceEdit = (service: ProviderService) => {
    console.log('handleServiceEdit called with service:', service);
    setEditingService(service);
    setIsServiceModalOpen(true);
    toast({
      title: "✏️ Editando Servicio",
      description: `Editando "${service.service_name}"`,
      variant: "default",
      duration: 2000,
    });
  };

  const handleServiceDelete = async (serviceId) => {
    const serviceToDelete = services.find(s => s.id === serviceId);
    if (!serviceToDelete) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar "${serviceToDelete.service_name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteService(serviceId);
        toast({
          title: "🗑️ Servicio Eliminado",
          description: `"${serviceToDelete.service_name}" ha sido eliminado exitosamente.`,
          variant: "default",
          duration: 4000,
        });
      } catch (error) {
        console.error('Error deleting service:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast({
          title: "❌ Error al Eliminar",
          description: `No se pudo eliminar "${serviceToDelete.service_name}": ${errorMessage}`,
          variant: "destructive",
          duration: 6000,
        });
      }
    }
  };

  const handleAppointmentStatusUpdate = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      
      const statusMessages = {
        'confirmed': '✅ Cita Confirmada',
        'cancelled': '❌ Cita Cancelada',
        'completed': '🎯 Cita Completada',
        'pending': '⏳ Cita Pendiente'
      };
      
      const statusDescriptions = {
        'confirmed': 'La cita ha sido confirmada exitosamente.',
        'cancelled': 'La cita ha sido cancelada.',
        'completed': 'La cita ha sido marcada como completada.',
        'pending': 'La cita está pendiente de confirmación.'
      };
      
      toast({
        title: statusMessages[newStatus] || 'Estado Actualizado',
        description: statusDescriptions[newStatus] || 'El estado de la cita ha sido actualizado.',
        variant: newStatus === 'cancelled' ? 'destructive' : 'default',
        duration: 4000,
      });

      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "❌ Error al Actualizar",
        description: `No se pudo actualizar el estado de la cita: ${errorMessage}`,
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

    // Product handlers
  const handleProductAdd = () => {
    setEditingProduct(null);
    setProductImportDraft(null);
    setIsProductModalOpen(true);
    toast({
      title: "➕ Nuevo Producto",
      description: "Creando un nuevo producto",
      variant: "default",
      duration: 2000,
    });
  };

  const handleProductEdit = (product: ProviderProduct) => {
    console.log('🔄 Opening Edit Product Modal for:', product.product_name);
    setEditingProduct(product);
    setIsProductModalOpen(true);
    toast({
      title: "✏️ Editando Producto",
      description: `Editando "${product.product_name}"`,
      variant: "default",
      duration: 2000,
    });
  };

  const handleProductDelete = async (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar "${productToDelete.product_name}"? Esta acción no se puede deshacer.`)) {
      try {
        console.log('🗑️ Deleting product:', productId);
        await deleteProduct(productId);
        toast({
          title: "🗑️ Producto Eliminado",
          description: `"${productToDelete.product_name}" ha sido eliminado exitosamente.`,
          variant: "default",
          duration: 4000,
        });
      } catch (error) {
        console.error('Error deleting product:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast({
          title: "❌ Error al Eliminar",
          description: `No se pudo eliminar "${productToDelete.product_name}": ${errorMessage}`,
          variant: "destructive",
          duration: 6000,
        });
      }
    }
  };

  const handleProductImportOpen = () => {
    setIsProductImportOpen(true);
  };

  const handleProductImportCreate = async (
    productData: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>
  ) => {
    await addProduct(productData);
    toast({
      title: '🎉 Producto importado',
      description: `"${productData.product_name}" se creó desde el link con ayuda de IA.`,
    });
  };

  const handleProductImportEditDraft = (
    draft: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>
  ) => {
    setEditingProduct(null);
    setProductImportDraft(draft);
    setIsProductModalOpen(true);
    toast({
      title: '✏️ Revisa el producto',
      description: 'Ajusta los campos importados antes de guardar.',
    });
  };

  const handleProductSave = async (productData: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('💾 Saving product data:', productData);
      if (editingProduct) {
        console.log('✏️ Updating existing product:', editingProduct.id);
        await updateProduct(editingProduct.id, productData);
        toast({
          title: "✅ Producto Actualizado",
          description: "El producto ha sido actualizado exitosamente.",
        });
      } else {
        console.log('➕ Creating new product');
        await addProduct(productData);
        toast({
          title: "🎉 Producto Creado",
          description: "El producto ha sido creado exitosamente.",
        });
      }
      void guidedTour?.notifySectionSaved('provider-products');
      setEditingProduct(null);
      setProductImportDraft(null);
      setIsProductModalOpen(false);
    } catch (error) {
      console.error('❌ Error saving product:', error);
      toast({
        title: "❌ Error al Guardar",
        description: "No se pudo guardar el producto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Set default sub-tab when entering grouped tabs
    if (value === 'store') {
      const defaultSubTab = activeSubTab && (activeSubTab === 'services' || activeSubTab === 'products') 
        ? activeSubTab 
        : 'products';
      setActiveSubTab(defaultSubTab);
      try {
        localStorage.setItem('providerDashboardActiveSubTab', defaultSubTab);
      } catch {}
    } else if (value === 'orders') {
      const defaultSubTab = activeSubTab && (activeSubTab === 'orders' || activeSubTab === 'appointments' || activeSubTab === 'reviews')
        ? activeSubTab
        : 'orders';
      setActiveSubTab(defaultSubTab);
      try {
        localStorage.setItem('providerDashboardActiveSubTab', defaultSubTab);
      } catch {}
    } else {
      setActiveSubTab('');
      try {
        localStorage.setItem('providerDashboardActiveSubTab', '');
      } catch {}
    }
    try {
      localStorage.setItem('providerDashboardActiveTab', value);
    } catch {
      // ignore storage errors
    }
    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value);
    try {
      localStorage.setItem('providerDashboardActiveSubTab', value);
    } catch {
      // ignore storage errors
    }
  };

  const providerMainTabs: MobileTabItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: Grid, gradientIndex: 0 },
    { id: 'profile', label: 'Perfil', shortLabel: 'Perfil', icon: User, gradientIndex: 1 },
    { id: 'store', label: 'Tienda', shortLabel: 'Tienda', icon: Store, gradientIndex: 2 },
    { id: 'orders', label: 'Pedidos', shortLabel: 'Pedidos', icon: ShoppingBag, gradientIndex: 3 },
  ], []);

  const storeSubTabs: MobileTabItem[] = useMemo(() => [
    { id: 'products', label: 'Productos', shortLabel: 'Productos', icon: Package, gradientIndex: 2 },
    { id: 'services', label: 'Servicios', shortLabel: 'Servicios', icon: Scissors, gradientIndex: 0 },
  ], []);

  const ordersSubTabs: MobileTabItem[] = useMemo(() => [
    { id: 'orders', label: 'Pedidos', shortLabel: 'Pedidos', icon: ShoppingBag, gradientIndex: 0 },
    { id: 'appointments', label: 'Citas', shortLabel: 'Citas', icon: Calendar, gradientIndex: 2 },
    { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star, gradientIndex: 4 },
  ], []);

  const { accent: pageAccent, ui: pageUi, btn: pageBtn, outlineBtn: pageOutlineBtn, syncTabs } =
    useProviderDashboardTheme();

  useEffect(() => {
    syncTabs(activeTab, activeSubTab);
  }, [activeTab, activeSubTab, syncTabs]);

  const pageHeader = useMemo(() => {
    const business = profile?.business_name || 'Configura tu perfil para comenzar';
    switch (activeTab) {
      case 'profile':
        return { title: 'Perfil del negocio', subtitle: business };
      case 'store':
        return activeSubTab === 'services'
          ? { title: 'Servicios', subtitle: 'Gestiona tu catálogo de servicios' }
          : { title: 'Productos', subtitle: 'Gestiona tu catálogo de productos' };
      case 'orders':
        if (activeSubTab === 'appointments') {
          return { title: 'Citas', subtitle: 'Calendario y reservas de servicios' };
        }
        if (activeSubTab === 'reviews') {
          return { title: 'Reseñas', subtitle: 'Opiniones de tus clientes' };
        }
        return { title: 'Pedidos', subtitle: 'Órdenes y entregas de productos' };
      default:
        return { title: 'Dashboard Proveedor', subtitle: business };
    }
  }, [activeTab, activeSubTab, profile?.business_name]);

  const providerBottomNavClass = (tab: ProviderDashboardMainTab) =>
    cn(
      'flex w-full flex-col items-center justify-center rounded-xl p-2 transition-all duration-200 min-w-0 flex-1',
      activeTab === tab
        ? cn('shadow-lg scale-105', plainPageAccentTabActive[providerMainTabAccent[tab]])
        : 'text-gray-500 hover:text-gray-700',
    );

  if (!user) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso denegado</h2>
        <p className="text-gray-500">Debes iniciar sesión para acceder al dashboard del proveedor.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardShell variant="plain">
        <PageLoader variant="skeleton" />
      </DashboardShell>
    );
  }

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
          tabs={providerMainTabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          variant="solid"
          accent={pageAccent}
        />
      </div>

      {/* Main Content */}
      <div className="pb-24 md:pb-6">
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange} 
          className="space-y-4 md:space-y-6"
        >
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
              {!profile ? (
            <MobileSectionCard className="p-8 text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Configura tu perfil</h3>
                  <p className="text-gray-500 mb-4">
                    Para comenzar a usar el dashboard, necesitas configurar tu perfil de proveedor.
                  </p>
                  <Button onClick={() => handleTabChange('profile')} className={cn(pageBtn)}>
                    Configurar Perfil
                  </Button>
            </MobileSectionCard>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <DashboardStatCard variant="plain" icon={Coins} value={`Q${revenueData.totalRevenue.toFixed(0)}`} label="Ingresos totales" footer={`Q${revenueData.monthlyRevenue.toFixed(0)} este mes`} gradientIndex={0} />
                <DashboardStatCard variant="plain" icon={Package} value={revenueData.totalOrders} label="Total órdenes" footer={`${revenueData.pendingOrders} pendientes`} gradientIndex={2} />
                <DashboardStatCard variant="plain" icon={ShoppingBag} value={revenueData.totalProductsSold} label="Productos vendidos" footer={`${revenueData.activeProducts} activos`} gradientIndex={1} />
                <DashboardStatCard variant="plain" icon={Calendar} value={revenueData.totalServicesBooked} label="Servicios reservados" footer={`${revenueData.upcomingAppointments} próximas`} gradientIndex={3} />
              </div>

              {/* Business Overview and Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Business Summary */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Resumen del Negocio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-landing-mint/10 p-4 rounded-lg border border-landing-mint/25">
                          <h4 className="font-semibold text-landing-mint-dark mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Servicios
                          </h4>
                          <div className="space-y-1 text-sm text-landing-mint-dark">
                            <p>• {revenueData.totalServicesBooked} servicios reservados</p>
                            <p>• {revenueData.activeServices} activos • {revenueData.inactiveServices} inactivos</p>
                            <p>• {revenueData.upcomingAppointments} próximas citas</p>
                            <p>• Promedio: Q{services.length > 0 ? (services.reduce((sum, s) => sum + s.price, 0) / services.length).toFixed(0) : 0}</p>
                            <p>• {revenueData.totalServiceCategories} categorías diferentes</p>
                          </div>
                        </div>
                        <div className={cn('p-4 rounded-lg border', pageUi.bgLight, pageUi.border)}>
                          <h4 className={cn('font-semibold mb-2 flex items-center gap-2', pageUi.text)}>
                            <Package className="w-4 h-4" />
                            Productos
                          </h4>
                          <div className={cn('space-y-1 text-sm', pageUi.text)}>
                            <p>• {revenueData.totalProductsSold} productos vendidos</p>
                            <p>• {revenueData.activeProducts} activos • {revenueData.inactiveProducts} inactivos</p>
                            <p>• {revenueData.lowStockProducts} con stock bajo</p>
                            <p>• {revenueData.totalProductCategories} categorías diferentes</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-landing-mint/10 p-4 rounded-lg border border-landing-mint/25">
                          <h4 className="font-semibold text-landing-mint-dark mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Órdenes
                          </h4>
                          <div className="space-y-1 text-sm text-landing-mint-dark">
                            <p>• {revenueData.totalOrders} total</p>
                            <p>• {revenueData.completedOrders} completadas</p>
                            <p>• {revenueData.pendingOrders} pendientes</p>
                            <p>• {revenueData.confirmedOrders} confirmadas</p>
                            <p>• {revenueData.processingOrders} procesando</p>
                            <p>• {revenueData.shippedOrders} enviadas</p>
                            <p>• {revenueData.cancelledOrders} canceladas</p>
                          </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Citas
                          </h4>
                          <div className="space-y-1 text-sm text-orange-700">
                            <p>• {appointments.length} total</p>
                            <p>• {revenueData.pendingAppointments} pendientes</p>
                            <p>• {revenueData.confirmedAppointments} confirmadas</p>
                            <p>• {revenueData.completedAppointments} completadas</p>
                            <p>• {revenueData.cancelledAppointments} canceladas</p>
                            <p>• {revenueData.upcomingAppointments} próximas</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Información del Negocio
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                          <div>
                            <p><strong>Tipo:</strong> {profile.business_type || 'No especificado'}</p>
                            <p><strong>Dirección:</strong> {profile.address || 'No especificada'}</p>
                            {profile.neighborhood && <p><strong>Colonia/Barrio:</strong> {profile.neighborhood}</p>}
                            {profile.postal_code && <p><strong>Código Postal:</strong> {profile.postal_code}</p>}
                            <p><strong>Teléfono:</strong> {profile.phone || 'No especificado'}</p>
                          </div>
                          <div>
                            <p><strong>Verificación:</strong> 
                              <Badge variant={profile.is_verified ? "default" : "secondary"} className="ml-2">
                                {profile.is_verified ? "✓ Verificado" : "⏳ Pendiente"}
                              </Badge>
                            </p>
                            <p><strong>Entrega:</strong> {profile.has_delivery ? "✓ Disponible" : "✗ No disponible"}</p>
                            <p><strong>Recogida:</strong> {profile.has_pickup ? "✓ Disponible" : "✗ No disponible"}</p>
                            {profile.has_delivery && <p><strong>Costo entrega:</strong> Q{profile.delivery_fee || 0}</p>}
                            <p><strong>Calificación:</strong> {revenueData.averageRating > 0 ? `${revenueData.averageRating.toFixed(1)}/5` : 'N/A'} ({revenueData.totalReviews} reseñas)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Acciones Rápidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={() => {
                        setIsServiceModalOpen(true);
                        setEditingService(null);
                      }}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Servicio
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsProductModalOpen(true);
                        setEditingProduct(null);
                      }}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Producto
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('appointments')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Gestionar Citas
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('profile')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Perfil
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('reviews')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Ver Reseñas
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Actividad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Recent Appointments */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Citas Recientes</h4>
                      {appointments.length > 0 ? (
                        <div className="space-y-2">
                          {appointments.slice(0, 3).map((appointment) => (
                            <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{appointment.provider_services?.service_name || 'Servicio'}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(appointment.appointment_date).toLocaleDateString()} - 
                                  {appointment.client_email}
                                </p>
                                {appointment.pets?.length ? (
                                  <p className={cn('text-xs mt-0.5', pageUi.text)}>
                                    Mascota: {appointment.pets.map((p) => p.name).join(', ')}
                                  </p>
                                ) : null}
                              </div>
                              <Badge 
                                variant={
                                  appointment.status === 'confirmed' ? 'default' :
                                  appointment.status === 'pending' ? 'secondary' :
                                  appointment.status === 'completed' ? 'outline' : 'destructive'
                                }
                              >
                                {appointment.status === 'pending' ? 'Pendiente' :
                                 appointment.status === 'confirmed' ? 'Confirmada' :
                                 appointment.status === 'completed' ? 'Completada' : 'Cancelada'}
                              </Badge>
                            </div>
                          ))}
                </div>
              ) : (
                        <p className="text-gray-500 text-sm">No hay citas recientes</p>
                      )}
                    </div>

                    {/* Low Stock Alert */}
                    {products.filter(p => p.stock_quantity <= p.min_stock_alert).length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <h4 className="font-semibold text-orange-800">Alerta de Stock Bajo</h4>
                        </div>
                        <div className="space-y-1">
                          {products.filter(p => p.stock_quantity <= p.min_stock_alert).slice(0, 3).map((product) => (
                            <p key={product.id} className="text-sm text-orange-700">
                              • {product.product_name} - Solo {product.stock_quantity} unidades restantes
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Análisis de Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-landing-mint/10 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-landing-mint-dark">Ingresos Totales</p>
                          <p className="text-2xl font-bold text-landing-mint-dark">Q{revenueData.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-landing-mint/15 rounded-full">
                          <Coins className="w-5 h-5 text-landing-mint-dark" />
                        </div>
                      </div>
                      <p className="text-xs text-landing-mint-dark mt-1">
                        {revenueData.completedOrders} órdenes completadas
                      </p>
                    </div>

                    <div className={cn('p-4 rounded-lg', pageUi.bgLight)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn('text-sm font-medium', pageUi.text)}>Este Mes</p>
                          <p className={cn('text-2xl font-bold', pageUi.text)}>Q{revenueData.monthlyRevenue.toFixed(2)}</p>
                        </div>
                        <div className={cn('p-2 rounded-full', pageUi.bgLight)}>
                          <Calendar className={cn('w-5 h-5', pageUi.text)} />
                        </div>
                      </div>
                      <p className={cn('text-xs mt-1', pageUi.text)}>
                        {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="bg-landing-mint/10 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn('text-sm font-medium', pageUi.text)}>Total Órdenes</p>
                          <p className="text-2xl font-bold text-landing-mint-dark">{revenueData.totalOrders}</p>
                        </div>
                        <div className="p-2 bg-landing-mint/15 rounded-full">
                          <Package className={cn('w-5 h-5', pageUi.text)} />
                        </div>
                      </div>
                      <p className={cn('text-xs mt-1', pageUi.text)}>
                        {revenueData.pendingOrders} pendientes
                      </p>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-600">Promedio por Orden</p>
                          <p className="text-2xl font-bold text-orange-700">
                            Q{revenueData.totalOrders > 0 ? (revenueData.totalRevenue / revenueData.totalOrders).toFixed(2) : '0.00'}
                          </p>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-full">
                          <Scale className="w-5 h-5 text-orange-600" />
                        </div>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        Valor promedio
                      </p>
                    </div>
                  </div>

                  {/* Revenue Chart */}
                  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-orange-600" />
                      Tendencia de Ingresos
                    </h4>
                    {revenueData.monthlyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={revenueData.monthlyChartData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" fontSize={12} />
                          <YAxis fontSize={12} />
                          <CartesianGrid strokeDasharray="3 3" />
                          <Tooltip 
                            formatter={(value: number) => [`Q${value.toFixed(2)}`, 'Ingresos']}
                            labelFormatter={(label) => `Mes: ${label}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#f97316" 
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                            name="Ingresos"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Coins className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No hay datos de ingresos disponibles</p>
                          <p className="text-xs">Los ingresos aparecerán aquí cuando tengas órdenes completadas</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Indicadores de Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Conversion Rate */}
                  <div className="bg-landing-mint/10 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-landing-mint-dark">Tasa de Conversión</h4>
                        <CheckCircle className={cn('w-5 h-5', pageUi.text)} />
                  </div>
                      <p className="text-2xl font-bold text-landing-mint-dark">
                        {appointments.length > 0 ? 
                          ((appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length / appointments.length) * 100).toFixed(1) 
                          : 0}%
                      </p>
                      <p className={cn('text-xs mt-1', pageUi.text)}>
                        Citas confirmadas/completadas
                      </p>
                    </div>

                    {/* Customer Satisfaction */}
                  <div className={cn('p-4 rounded-lg', pageUi.bgLight)}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={cn('font-semibold', pageUi.text)}>Satisfacción del Cliente</h4>
                        <Star className={cn('w-5 h-5', pageUi.text)} />
                      </div>
                      <p className={cn('text-2xl font-bold', pageUi.text)}>
                        {profile.rating > 0 ? `${profile.rating.toFixed(1)}/5` : 'N/A'}
                      </p>
                      <p className={cn('text-xs mt-1', pageUi.text)}>
                        Basado en {profile.total_reviews} reseñas
                      </p>
                    </div>

                    {/* Service Utilization */}
                    <div className="bg-landing-mint/10 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-landing-mint-dark">Utilización de Servicios</h4>
                        <Package className={cn('w-5 h-5', pageUi.text)} />
                      </div>
                      <p className="text-2xl font-bold text-landing-mint-dark">
                        {services.length > 0 ? 
                          ((services.filter(s => s.is_active).length / services.length) * 100).toFixed(0) 
                          : 0}%
                      </p>
                      <p className={cn('text-xs mt-1', pageUi.text)}>
                        Servicios activos vs total
                      </p>
                    </div>

                    {/* Response Time */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-orange-800">Tiempo de Respuesta</h4>
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-2xl font-bold text-orange-700">
                        {appointments.filter(a => a.status === 'pending').length > 0 ? 'Pendiente' : 'Al día'}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {appointments.filter(a => a.status === 'pending').length} citas pendientes
                      </p>
                    </div>

                    {/* Inventory Health */}
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-red-800">Salud del Inventario</h4>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-2xl font-bold text-red-700">
                        {products.length > 0 ? 
                          ((products.filter(p => p.stock_quantity > p.min_stock_alert).length / products.length) * 100).toFixed(0) 
                          : 100}%
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Productos con stock adecuado
                      </p>
                    </div>

                    {/* Business Growth */}
                    <div className="bg-landing-mint/10 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-landing-mint-dark">Crecimiento del Negocio</h4>
                        <Building2 className="w-5 h-5 text-landing-mint-dark" />
                      </div>
                      <p className="text-2xl font-bold text-landing-mint-dark">
                        {services.length + products.length}
                      </p>
                      <p className="text-xs text-landing-mint-dark mt-1">
                        Total de servicios y productos
                      </p>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Resumen de Rendimiento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-700">
                          <strong>Estado General:</strong> 
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            profile.is_verified && 
                            appointments.filter(a => a.status === 'pending').length === 0 &&
                            products.filter(p => p.stock_quantity <= p.min_stock_alert).length === 0
                              ? 'bg-landing-mint/15 text-landing-mint-dark' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {profile.is_verified && 
                             appointments.filter(a => a.status === 'pending').length === 0 &&
                             products.filter(p => p.stock_quantity <= p.min_stock_alert).length === 0
                              ? 'Excelente' 
                              : 'Necesita atención'}
                          </span>
                        </p>
                        <p className="text-gray-700 mt-1">
                          <strong>Verificación:</strong> 
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            profile.is_verified ? 'bg-landing-mint/15 text-landing-mint-dark' : 'bg-red-100 text-red-800'
                          }`}>
                            {profile.is_verified ? 'Verificado' : 'Pendiente'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-700">
                          <strong>Acciones Requeridas:</strong>
                        </p>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {!profile.is_verified && <li>• Completar verificación del perfil</li>}
                          {appointments.filter(a => a.status === 'pending').length > 0 && 
                            <li>• Responder a {appointments.filter(a => a.status === 'pending').length} citas pendientes</li>}
                          {products.filter(p => p.stock_quantity <= p.min_stock_alert).length > 0 && 
                            <li>• Reabastecer {products.filter(p => p.stock_quantity <= p.min_stock_alert).length} productos</li>}
                          {services.filter(s => !s.is_active).length > 0 && 
                            <li>• Activar {services.filter(s => !s.is_active).length} servicios inactivos</li>}
                          {services.filter(s => !s.is_active).length === 0 && 
                           appointments.filter(a => a.status === 'pending').length === 0 &&
                           products.filter(p => p.stock_quantity <= p.min_stock_alert).length === 0 &&
                           profile.is_verified && 
                           <li>• ¡Todo al día! 🎉</li>}
                    </ul>
                  </div>
                </div>
                  </div>
            </CardContent>
          </Card>
            </>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Perfil del Proveedor
                </CardTitle>
                {!isProfileEditing && (
                  <Button 
                    data-blueprint-guided="edit-provider-profile"
                    onClick={() => {
                      setIsProfileEditing(true);
                      toast({
                        title: "✏️ Editando Perfil",
                        description: "Modifica la información de tu negocio",
                        variant: "default",
                        duration: 2000,
                      });
                    }}
                    className={cn(pageBtn)}
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isProfileEditing && (
                <div className={cn('border rounded-lg p-3 mb-4', pageUi.bgLight, pageUi.border)}>
                  <div className="flex items-center gap-2">
                    <Edit className={cn('w-4 h-4', pageUi.text)} />
                    <p className={cn('text-sm font-medium', pageUi.text)}>
                      Modo de edición activo - Los campos están habilitados para editar
                    </p>
                  </div>
                </div>
              )}
              {/* Profile Picture Upload */}
              <ProfilePictureUpload
                currentImageUrl={profileForm.profile_picture_url}
                onImageChange={setSelectedProfilePicture}
                onImageRemove={() => setSelectedProfilePicture(null)}
                disabled={!isProfileEditing}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="provider-name">Nombre del Negocio *</Label>
                    <Input 
                      id="provider-name" 
                      value={profileForm.business_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, business_name: e.target.value }))}
                      placeholder="Nombre de tu negocio"
                      disabled={!isProfileEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider-phone">Teléfono</Label>
                    <Input 
                      id="provider-phone" 
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      disabled={!isProfileEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider-email">Email</Label>
                    <Input 
                      id="provider-email" 
                      value={user.email || ''} 
                      readOnly 
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="provider-address">Dirección (Calle y Número) *</Label>
                    <Input 
                      id="provider-address" 
                      value={profileForm.address}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Ej: 5ta Avenida 12-34, Zona 10"
                      disabled={!isProfileEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider-neighborhood">Colonia/Barrio</Label>
                    <Input 
                      id="provider-neighborhood" 
                      value={profileForm.neighborhood}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Ej: Zona 10, Colonia El Naranjo"
                      disabled={!isProfileEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider-municipality">Municipio *</Label>
                    <Input 
                      id="provider-municipality" 
                      value={profileForm.municipality}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, municipality: e.target.value }))}
                      placeholder="Ej: Ciudad, zona o municipio"
                      disabled={!isProfileEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider-department">Departamento *</Label>
                    <select 
                      id="provider-department"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                      disabled={!isProfileEditing}
                      className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-50"
                    >
                      <option value="">Seleccionar departamento</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="provider-postal-code">Código Postal</Label>
                    <Input 
                      id="provider-postal-code" 
                      value={profileForm.postal_code}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="Ej: 01010"
                      disabled={!isProfileEditing}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-base font-medium">Opciones de Entrega</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="has-pickup"
                            checked={profileForm.has_pickup}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, has_pickup: e.target.checked }))}
                            disabled={!isProfileEditing}
                            className={cn('rounded border-gray-300', pageUi.text)}
                          />
                          <Label htmlFor="has-pickup" className="text-sm font-normal">
                            Recogida en tienda
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="has-delivery"
                            checked={profileForm.has_delivery}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, has_delivery: e.target.checked }))}
                            disabled={!isProfileEditing}
                            className={cn('rounded border-gray-300', pageUi.text)}
                          />
                          <Label htmlFor="has-delivery" className="text-sm font-normal">
                            Entrega a domicilio
                          </Label>
                        </div>
                      </div>
                    </div>
                    {/* Campo de precio de delivery oculto - el delivery será manejado por la plataforma */}
                    <p className="text-sm text-landing-mint-dark mt-2">
                      ✅ Estas opciones se mostrarán a tus clientes en el marketplace para ayudarlos a elegir
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="provider-type">Tipo de Negocio *</Label>
                    <select 
                      id="provider-type"
                      value={profileForm.business_type}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, business_type: e.target.value }))}
                      disabled={!isProfileEditing}
                      className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-50"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="veterinario">Clínica Veterinaria</option>
                      <option value="hospital_veterinario">Hospital Veterinario</option>
                      <option value="veterinario_emergencias">Veterinario de Emergencias</option>
                      <option value="tienda">Tienda de Mascotas</option>
                      <option value="tienda_alimentos">Tienda de Alimentos para Mascotas</option>
                      <option value="tienda_accesorios">Tienda de Accesorios para Mascotas</option>
                      <option value="peluqueria">Peluquería Canina</option>
                      <option value="peluqueria_felina">Peluquería Felina</option>
                      <option value="spa_mascotas">Spa para Mascotas</option>
                      <option value="entrenamiento">Entrenamiento Canino</option>
                      <option value="adiestramiento">Adiestramiento</option>
                      <option value="guarderia">Guardería para Mascotas</option>
                      <option value="hotel_mascotas">Hotel para Mascotas</option>
                      <option value="pension">Pensión para Mascotas</option>
                      <option value="cuidado_diurno">Cuidado Diurno</option>
                      <option value="transporte">Transporte de Mascotas</option>
                      <option value="servicio_domicilio">Servicio a Domicilio</option>
                      <option value="fotografia">Fotografía de Mascotas</option>
                      <option value="eventos">Organización de Eventos para Mascotas</option>
                      <option value="crematorio">Servicio de Cremación</option>
                      <option value="cementerio">Cementerio para Mascotas</option>
                      <option value="seguros">Seguros para Mascotas</option>
                      <option value="nutricionista">Nutricionista Veterinario</option>
                      <option value="fisioterapia">Fisioterapia Veterinaria</option>
                      <option value="rehabilitacion">Centro de Rehabilitación</option>
                      <option value="rescue">Rescate y Adopción</option>
                      <option value="refugio">Refugio de Animales</option>
                      <option value="albergue">Albergue Temporal</option>
                      <option value="reproduccion">Centro de Reproducción</option>
                      <option value="criador">Criador Certificado</option>
                      <option value="grooming_movil">Grooming Móvil</option>
                      <option value="veterinario_movil">Veterinario Móvil</option>
                      <option value="laboratorio">Laboratorio Veterinario</option>
                      <option value="farmacia_veterinaria">Farmacia Veterinaria</option>
                      <option value="equipos_medicos">Venta de Equipos Médicos</option>
                      <option value="jugueteria">Juguetería para Mascotas</option>
                      <option value="ropa_mascotas">Ropa para Mascotas</option>
                      <option value="accesorios_lujo">Accesorios de Lujo</option>
                      <option value="alimentos_premium">Alimentos Premium</option>
                      <option value="alimentos_naturales">Alimentos Naturales/Orgánicos</option>
                      <option value="suplementos">Suplementos y Vitaminas</option>
                      <option value="juguetes_educativos">Juguetes Educativos</option>
                      <option value="tecnologia_mascotas">Tecnología para Mascotas</option>
                      <option value="seguridad">Productos de Seguridad</option>
                      <option value="limpieza">Productos de Limpieza</option>
                      <option value="higiene">Productos de Higiene</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="provider-description">Descripción</Label>
                    <Textarea 
                      id="provider-description" 
                      value={profileForm.description}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe tu negocio y servicios..."
                      rows={3}
                      disabled={!isProfileEditing}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <LocationPicker
                  latitude={profileForm.latitude}
                  longitude={profileForm.longitude}
                  readOnly={!isProfileEditing}
                  onLocationSelect={(lat, lng) => {
                    setProfileForm(prev => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                    }));
                  }}
                  address={profileForm.address}
                  city={profileForm.municipality}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                {!isProfileEditing ? (
                  <Button 
                    data-blueprint-guided="edit-provider-profile"
                    onClick={() => {
                      setIsProfileEditing(true);
                      toast({
                        title: "✏️ Editando Perfil",
                        description: "Modifica la información de tu negocio",
                        variant: "default",
                        duration: 2000,
                      });
                    }}
                    className={cn(pageBtn)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsProfileEditing(false);
                      setSelectedProfilePicture(null);
                      // Reset form to original values
                      if (profile) {
                        setProfileForm({
                          business_name: profile.business_name || '',
                          business_type: profile.business_type || '',
                          phone: profile.phone || '',
                          address: profile.address || '',
                          description: profile.description || '',
                          profile_picture_url: profile.profile_picture_url || '',
                          city_id: profile.city_id || 0,
                          google_place_id: profile.google_place_id || '',
                          formatted_address: profile.formatted_address || '',
                          neighborhood: profile.neighborhood || '',
                          postal_code: profile.postal_code || '',
                          municipality: profile.municipality || '',
                          department: profile.department || '',
                          has_delivery: profile.has_delivery || false,
                          has_pickup: profile.has_pickup || false,
                          delivery_fee: profile.delivery_fee || 0,
                          latitude: profile.latitude ?? undefined,
                          longitude: profile.longitude ?? undefined,
                        });
                      }
                      toast({
                        title: "❌ Edición Cancelada",
                        description: "Los cambios no han sido guardados",
                        variant: "default",
                        duration: 3000,
                      });
                    }}>
                      Cancelar
                    </Button>
                    <Button
                      data-blueprint-guided="save-provider-profile"
                      onClick={() => {
                      console.log('🔘 Guardar Cambios button clicked');
                      console.log('📋 Current profileForm state:', {
                        latitude: profileForm.latitude,
                        longitude: profileForm.longitude,
                        address: profileForm.address
                      });
                      handleProfileSave();
                    }} className={cn(pageBtn)}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <ProviderAvailabilitySettings
            providerId={profile?.id}
            fetchProviderAvailability={fetchProviderAvailability}
            fetchProviderTimeSlots={fetchProviderTimeSlots}
            saveProviderAvailability={saveProviderAvailability}
            saveProviderTimeSlots={saveProviderTimeSlots}
          />
        </TabsContent>

        {/* Store Tab (Tienda) - Groups Services and Products */}
        <TabsContent value="store" className="space-y-4 md:space-y-6">
          <Tabs value={activeSubTab || 'products'} onValueChange={handleSubTabChange} className="space-y-4 md:space-y-6">
            <MobileTabStrip
              tabs={storeSubTabs}
              activeTab={activeSubTab || 'products'}
              onChange={handleSubTabChange}
              variant="solid"
              accent={resolveProviderDashboardAccent('store', activeSubTab || 'products')}
            />

            {/* Services Sub-Tab */}
            <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Mis Servicios
                </CardTitle>
                <Button
                  data-blueprint-guided="add-service"
                  onClick={() => {
                    setIsServiceModalOpen(true);
                    toast({
                      title: '➕ Nuevo Servicio',
                      description: 'Completa la información para crear un nuevo servicio',
                      variant: 'default',
                      duration: 3000,
                    });
                  }}
                  className={cn(pageBtn, 'w-full sm:w-auto min-h-[44px] rounded-xl shrink-0 border-0')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Servicio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <MobileSectionCard className="p-8 text-center">
                  <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium text-gray-700">No hay servicios configurados aún</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">Agrega tu primer servicio para comenzar</p>
                  <Button
                    onClick={() => {
                      setIsServiceModalOpen(true);
                      setEditingService(null);
                    }}
                    className={cn(pageBtn, 'min-h-[44px] rounded-xl border-0')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Servicio
                  </Button>
                </MobileSectionCard>
              ) : (
                <>
                <div className="space-y-3 lg:hidden">
                  {services.map((service) => (
                    <MobileSectionCard key={service.id} className="p-4">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
                          {service.service_image_url ? (
                            <img src={service.service_image_url} alt={service.service_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={cn('w-full h-full flex items-center justify-center', pageUi.bgLight)}>
                              <ImageIcon className={cn('w-6 h-6', pageUi.text)} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-gray-900 truncate">{service.service_name}</h3>
                            <Badge variant={service.is_active ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                              {service.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                            <Badge variant="outline" className="text-[10px]">
                              {SERVICE_CATEGORIES.find(c => c.value === service.service_category)?.label || 'Sin categoría'}
                            </Badge>
                            <span className="flex items-center gap-1 font-semibold text-gray-900">
                              <Coins className={cn('w-3.5 h-3.5', pageUi.text)} />
                              {service.currency === 'GTQ' ? 'Q.' : '$'}{service.price}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {service.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => handleServiceEdit(service)} className={cn('flex-1 min-h-[40px]', pageOutlineBtn)}>
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleServiceDelete(service.id)} className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </MobileSectionCard>
                  ))}
                </div>
                <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Servicio</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Foto</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Categoría</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Precio</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Duración</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Reservas</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {services.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                          {/* Service Name & Description */}
                          <td className="py-4 px-4">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-1">{service.service_name}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                                {service.description}
                              </p>
                              {service.detailed_description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {service.detailed_description}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Service Image */}
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center">
                              {service.service_image_url ? (
                                <img
                                  src={service.service_image_url}
                                  alt={service.service_name}
                                  className="w-12 h-12 object-cover rounded-md border border-gray-200"
                                />
                              ) : (
                                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-md border border-gray-200">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="text-xs">
                              {service.service_category ? 
                                SERVICE_CATEGORIES.find(c => c.value === service.service_category)?.label || service.service_category
                                : 'Sin categoría'
                              }
                            </Badge>
                          </td>

                          {/* Price */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Coins className={cn('w-4 h-4', pageUi.text)} />
                              <span className="font-medium text-gray-900">
                                {service.currency === 'GTQ' ? 'Q.' : '$'}{service.price}
                              </span>
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className={cn('w-4 h-4', pageUi.text)} />
                              <span className="text-sm font-medium text-gray-900">
                                {service.duration_minutes} min
                              </span>
                            </div>
                          </td>

                          {/* Booking Info */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>Max: {service.max_advance_booking_days || 30} días</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <AlertCircle className="w-3 h-3" />
                                <span>Min: {service.min_advance_booking_hours || 2}h</span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleServiceEdit(service)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleServiceDelete(service.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Products Sub-Tab */}
            <TabsContent value="products" className="space-y-6">
          
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Mis Productos
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleProductImportOpen}
                    variant="outline"
                    className={cn('w-full sm:w-auto min-h-[44px] rounded-xl shrink-0', pageOutlineBtn)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Importar con IA
                  </Button>
                  <Button
                    data-blueprint-guided="add-product"
                    onClick={handleProductAdd}
                    className={cn(pageBtn, 'w-full sm:w-auto min-h-[44px] rounded-xl shrink-0 border-0')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn('mb-4 rounded-xl px-4 py-3 flex gap-3 items-start border', pageUi.border, pageUi.bgSoft)}>
                <Sparkles className={cn('w-5 h-5 shrink-0 mt-0.5', pageUi.text)} />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900">Importa productos desde un link</p>
                  <p className="mt-0.5 text-gray-600">
                    Usa <strong>Importar con IA</strong> para pegar la URL de un producto (ej. otra tienda online)
                    y crear el registro automáticamente con nombre, precio, descripción e imagen.
                  </p>
                </div>
              </div>
              {products.length === 0 ? (
                <MobileSectionCard className="p-8 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium text-gray-700">No hay productos configurados aún</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">Agrega manualmente o importa desde un link con IA</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={handleProductImportOpen}
                      variant="outline"
                      className={cn('min-h-[44px] rounded-xl', pageOutlineBtn)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Importar con IA
                    </Button>
                    <Button
                      onClick={handleProductAdd}
                      className={cn(pageBtn, 'min-h-[44px] rounded-xl border-0')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </div>
                </MobileSectionCard>
              ) : (
                <>
                <div className="space-y-3 lg:hidden">
                  {products.map((product) => {
                    const sizePrices = [product.price_small, product.price_medium, product.price_large, product.price_extra_large]
                      .filter((p): p is number => p != null);
                    const currencySymbol = product.currency === 'GTQ' ? 'Q.' : '$';
                    const priceLabel = sizePrices.length > 0
                      ? (Math.min(...sizePrices) === Math.max(...sizePrices)
                        ? `${currencySymbol}${Math.min(...sizePrices).toFixed(2)}`
                        : `${currencySymbol}${Math.min(...sizePrices).toFixed(2)} – ${currencySymbol}${Math.max(...sizePrices).toFixed(2)}`)
                      : `${currencySymbol}${product.price?.toFixed(2) ?? '0.00'}`;

                    return (
                      <MobileSectionCard key={product.id} className="p-4">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
                            {product.product_image_url ? (
                              <img src={product.product_image_url} alt={product.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className={cn('w-full h-full flex items-center justify-center', pageUi.bgLight)}>
                                <ImageIcon className={cn('w-6 h-6', pageUi.text)} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-gray-900 truncate">{product.product_name}</h3>
                              <Badge variant={product.is_active ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                                {product.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                              <Badge variant="outline" className="text-[10px]">
                                {PRODUCT_CATEGORIES.find(c => c.value === product.product_category)?.label || 'Sin categoría'}
                              </Badge>
                              <span className="flex items-center gap-1 font-semibold text-gray-900">
                                <Coins className={cn('w-3.5 h-3.5', pageUi.text)} />
                                {priceLabel}
                              </span>
                              <span className={cn(
                                'flex items-center gap-1',
                                product.stock_quantity === 0 ? 'text-red-600' :
                                product.stock_quantity <= product.min_stock_alert ? 'text-landing-mango-dark' : 'text-landing-mint-dark'
                              )}>
                                Stock: {product.stock_quantity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" onClick={() => handleProductEdit(product)} className={cn('flex-1 min-h-[40px]', pageOutlineBtn)}>
                            <Edit className="w-4 h-4 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleProductDelete(product.id)} className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </MobileSectionCard>
                    );
                  })}
                </div>
                <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Imagen</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Producto</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Categoría</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Precio</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Stock</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          {/* Product Image */}
                          <td className="py-4 px-4">
                            {product.product_image_url ? (
                              <div className="w-16 h-16 rounded-md overflow-hidden border">
                                <img 
                                  src={product.product_image_url} 
                                  alt={product.product_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-md bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </td>

                          {/* Product Name & Description */}
                          <td className="py-4 px-4">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-1">{product.product_name}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                                {product.description}
                              </p>
                              {product.brand && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Marca: {product.brand}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="text-xs">
                              {product.product_category ? 
                                PRODUCT_CATEGORIES.find(c => c.value === product.product_category)?.label || product.product_category
                                : 'Sin categoría'
                              }
                            </Badge>
                          </td>

                          {/* Price */}
                          <td className="py-4 px-4">
                            {(() => {
                              // Check if product has size-based prices
                              const sizePrices = [
                                product.price_small,
                                product.price_medium,
                                product.price_large,
                                product.price_extra_large
                              ].filter((p): p is number => p !== null && p !== undefined);
                              
                              const currencySymbol = product.currency === 'GTQ' ? 'Q.' : '$';
                              
                              if (sizePrices.length > 0) {
                                // Show price range
                                const minPrice = Math.min(...sizePrices);
                                const maxPrice = Math.max(...sizePrices);
                                
                                if (minPrice === maxPrice) {
                                  // All prices are the same
                                  return (
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Coins className={cn('w-4 h-4', pageUi.text)} />
                                        <span className="font-medium text-gray-900">
                                          {currencySymbol}{minPrice.toFixed(2)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Todos los tamaños
                                      </p>
                                    </div>
                                  );
                                } else {
                                  // Show range
                                  return (
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Coins className={cn('w-4 h-4', pageUi.text)} />
                                        <span className="font-medium text-gray-900">
                                          {currencySymbol}{minPrice.toFixed(2)} - {currencySymbol}{maxPrice.toFixed(2)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Por tamaño
                                      </p>
                                    </div>
                                  );
                                }
                              } else {
                                // Show general price
                                return (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Coins className={cn('w-4 h-4', pageUi.text)} />
                                      <span className="font-medium text-gray-900">
                                        {currencySymbol}{product.price.toFixed(2)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Precio general
                                    </p>
                                  </div>
                                );
                              }
                            })()}
                          </td>

                          {/* Stock */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Package className={`w-4 h-4 ${
                                product.stock_quantity === 0 
                                  ? 'text-red-600' 
                                  : product.stock_quantity <= product.min_stock_alert
                                  ? 'text-yellow-600'
                                  : 'text-landing-mint-dark'
                              }`} />
                              <span className={`text-sm font-medium ${
                                product.stock_quantity === 0 
                                  ? 'text-red-600' 
                                  : product.stock_quantity <= product.min_stock_alert
                                  ? 'text-yellow-600'
                                  : 'text-landing-mint-dark'
                              }`}>
                                {product.stock_quantity}
                              </span>
                            </div>
                            {product.stock_quantity <= product.min_stock_alert && product.stock_quantity > 0 && (
                              <p className="text-xs text-yellow-600 mt-1">Stock bajo</p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <Badge variant={product.is_active ? "default" : "secondary"}>
                              {product.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProductEdit(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProductDelete(product.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Orders Tab (Pedidos) - Groups Orders, Appointments and Reviews */}
        <TabsContent value="orders" className="space-y-4 md:space-y-6">
          <Tabs value={activeSubTab || 'orders'} onValueChange={handleSubTabChange} className="space-y-4 md:space-y-6">
            <MobileTabStrip
              tabs={ordersSubTabs}
              activeTab={activeSubTab || 'orders'}
              onChange={handleSubTabChange}
              variant="solid"
              accent={resolveProviderDashboardAccent('orders', activeSubTab || 'orders')}
            />

            {/* Orders Sub-Tab */}
            <TabsContent value="orders" className="space-y-6" data-blueprint-guided="provider-orders-section">
              <ProviderOrders accent={resolveProviderDashboardAccent('orders', 'orders')} />
            </TabsContent>

            {/* Appointments Sub-Tab */}
            <TabsContent value="appointments" className="space-y-6" data-blueprint-guided="provider-appointments-section">
          <Card className="border-0 shadow-lg overflow-hidden min-w-0">
            <CardHeader className={cn('border-b', pageUi.bgLight, pageUi.border)}>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className={cn('p-2 rounded-lg', pageUi.bgLight)}>
                  <Calendar className={cn('w-6 h-6', pageUi.text)} />
                </div>
                <span className="text-gray-800">Mis Citas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {appointments.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className={cn('w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center', pageUi.bgLight)}>
                    <Calendar className={cn('w-12 h-12', pageUi.iconMuted)} />
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">No hay citas programadas</p>
                  <p className="text-sm text-gray-500">Las citas aparecerán aquí cuando los clientes las reserven</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 min-w-0">
                  {/* Calendar View */}
                  <div className="lg:col-span-8 min-w-0">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-3 sm:p-5 lg:p-8 overflow-hidden min-w-0">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={es}
                        className="rounded-lg w-full max-w-full p-0"
                        classNames={{
                          months: "flex flex-col space-y-3 w-full max-w-full",
                          month: "space-y-2 sm:space-y-3 w-full max-w-full",
                          caption: "flex justify-center pt-1 relative items-center mb-2 sm:mb-4 px-8",
                          caption_label: "text-base sm:text-xl lg:text-2xl font-bold text-gray-800",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-landing-mint/10 transition-colors shadow-sm border border-gray-200",
                          table: "w-full max-w-full border-collapse",
                          head_row: "flex w-full mb-1 sm:mb-2",
                          head_cell:
                            "text-gray-600 flex-1 min-w-0 text-center font-bold text-[0.65rem] sm:text-xs lg:text-sm uppercase tracking-wide py-1",
                          row: "flex w-full mt-0.5 sm:mt-1",
                          cell: "flex-1 min-w-0 aspect-square p-0.5 relative flex items-center justify-center",
                          day: "h-full w-full max-h-9 sm:max-h-10 lg:max-h-12 rounded-lg font-semibold text-xs sm:text-sm hover:bg-landing-mint/10 transition-all duration-200",
                          day_selected:
                            cn(pageBtn, 'font-bold shadow-md ring-2', pageUi.borderActive),
                          day_today: cn('font-bold border-2', pageUi.bgLight, pageUi.text, pageUi.borderActive),
                          day_outside: "text-gray-400 opacity-50",
                        }}
                        modifiers={{
                          hasAppointments: appointments.map(apt => 
                            startOfDay(parseISO(apt.appointment_date))
                          )
                        }}
                        modifiersClassNames={{
                          hasAppointments: cn(pageUi.bgLight, pageUi.text, 'font-semibold border', pageUi.border, pageUi.hoverBg)
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Appointments List for Selected Date */}
                  <div className="lg:col-span-4 min-w-0">
                    <div className="lg:sticky lg:top-6">
                      <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                        <h3 className="font-bold text-lg text-gray-800 capitalize">
                          {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona una fecha'}
                        </h3>
                        {selectedDate && (
                          <p className="text-sm text-gray-600 mt-1">
                            {appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length} 
                            {' '}cita{appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {selectedDate ? (
                        <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                          {appointments
                            .filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate))
                            .sort((a, b) => {
                              const timeA = a.appointment_time || '00:00';
                              const timeB = b.appointment_time || '00:00';
                              return timeA.localeCompare(timeB);
                            })
                            .map((appointment) => (
                              <div 
                                key={appointment.id} 
                                className={cn(
                                  'group relative bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300',
                                  pageUi.borderActive.replace(/^border-/, 'hover:border-'),
                                )}
                              >
                                <div className={cn('absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300', pageUi.bgSoft)} />
                                <div className="relative">
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-base truncate">
                                          {appointment.service_variant_name ||
                                            appointment.provider_services?.service_name ||
                                            'Servicio'}
                                        </h4>
                                        <Badge 
                                          variant={getStatusBadgeVariant(appointment.status)} 
                                          className="shrink-0 text-xs font-semibold px-2 py-1 shadow-sm"
                                        >
                                          {getStatusIcon(appointment.status)}
                                          <span className="ml-1.5">
                                            {appointment.status === 'confirmed' && 'Confirmada'}
                                            {appointment.status === 'pending' && 'Pendiente'}
                                            {appointment.status === 'cancelled' && 'Cancelada'}
                                            {appointment.status === 'completed' && 'Completada'}
                                          </span>
                                        </Badge>
                                      </div>
                                      <div className="space-y-2.5">
                                        {appointment.provider_services?.service_category && (
                                          <div className="flex items-center gap-2 text-sm text-gray-700 bg-landing-mint/10 rounded-lg px-3 py-2 border border-landing-mint/20">
                                            <Tag className={cn('w-4 h-4 shrink-0', pageUi.text)} />
                                            <span className="font-medium capitalize">{appointment.provider_services.service_category}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                          <Clock className={cn('w-4 h-4 shrink-0', pageUi.text)} />
                                          <span className="font-medium">{appointment.appointment_time}</span>
                                        </div>
                                        {appointment.provider_services?.duration_minutes && (
                                          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                            <Timer className={cn('w-4 h-4 shrink-0', pageUi.text)} />
                                            <span className="font-medium">Duración: {appointment.provider_services.duration_minutes} minutos</span>
                                          </div>
                                        )}
                                        <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                          <User className={cn('w-4 h-4 shrink-0 mt-0.5', pageUi.text)} />
                                          <div className="min-w-0">
                                            {appointment.client_name && (
                                              <p className="font-semibold text-gray-900 truncate">{appointment.client_name}</p>
                                            )}
                                            {appointment.client_phone && (
                                              <p className="text-gray-600 truncate">{appointment.client_phone}</p>
                                            )}
                                            {appointment.client_email && appointment.client_email !== appointment.client_name && (
                                              <p className="text-gray-500 truncate text-xs">{appointment.client_email}</p>
                                            )}
                                          </div>
                                        </div>
                                        <OrderItemPetsList pets={appointment.pets || []} detailed className="px-0" />
                                        <div className={cn('flex items-center gap-2 text-sm text-gray-700 rounded-lg px-3 py-2 border', pageUi.bgSoft, pageUi.border)}>
                                          <Coins className={cn('w-4 h-4 shrink-0', pageUi.text)} />
                                          <span className="font-bold text-landing-mint-dark">
                                            {formatAppointmentPrice(
                                              appointment.total_price,
                                              appointment.currency,
                                              appointment.provider_services?.price,
                                              appointment.provider_services?.currency,
                                            )}
                                          </span>
                                        </div>
                                        {appointment.provider_services?.description && (
                                          <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                              <Info className={cn('w-4 h-4 shrink-0 mt-0.5', pageUi.text)} />
                                              <div>
                                                <span className={cn('font-semibold block mb-1', pageUi.text)}>Descripción:</span>
                                                <p className="text-gray-700">{appointment.provider_services.description}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {appointment.provider_services?.detailed_description && (
                                          <div className="pt-2">
                                            <div className={cn('flex items-start gap-2 text-xs text-gray-600 rounded-lg px-3 py-2 border border-gray-100', pageUi.bgLight)}>
                                              <BookOpen className={cn('w-4 h-4 shrink-0 mt-0.5', pageUi.text)} />
                                              <div>
                                                <span className={cn('font-semibold block mb-1', pageUi.text)}>Detalles:</span>
                                                <p className="text-gray-700">{appointment.provider_services.detailed_description}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {appointment.provider_services?.preparation_instructions && (
                                          <div className="pt-2">
                                            <div className="flex items-start gap-2 text-xs text-gray-600 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200">
                                              <FileText className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
                                              <div>
                                                <span className="font-semibold text-yellow-800 block mb-1">Instrucciones de Preparación:</span>
                                                <p className="text-gray-700">{appointment.provider_services.preparation_instructions}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {appointment.provider_services?.cancellation_policy && (
                                          <div className="pt-2">
                                            <div className="flex items-start gap-2 text-xs text-gray-600 bg-orange-50 rounded-lg px-3 py-2 border border-orange-200">
                                              <AlertCircle className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                                              <div>
                                                <span className="font-semibold text-orange-800 block mb-1">Política de Cancelación:</span>
                                                <p className="text-gray-700">{appointment.provider_services.cancellation_policy}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {appointment.notes && (
                                          <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className={cn('text-xs text-gray-600 italic rounded-lg px-3 py-2 border border-gray-100', pageUi.bgLight)}>
                                              <span className={cn('font-semibold', pageUi.text)}>Notas del Cliente:</span> {appointment.notes}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 mt-4">
                                    {appointment.status === 'pending' && (
                                      <>
                                        <Button
                                          size="sm"
                                          className={cn('text-xs font-semibold shadow-md hover:shadow-lg transition-all', pageBtn)}
                                          onClick={() => handleAppointmentStatusUpdate(appointment.id, 'confirmed')}
                                        >
                                          ✓ Confirmar
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs font-semibold border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all"
                                          onClick={() => handleAppointmentStatusUpdate(appointment.id, 'cancelled')}
                                        >
                                          ✕ Cancelar
                                        </Button>
                                      </>
                                    )}
                                    {appointment.status === 'confirmed' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn('text-xs font-semibold transition-all', pageOutlineBtn)}
                                        onClick={() => handleAppointmentStatusUpdate(appointment.id, 'completed')}
                                      >
                                        ✓ Marcar Completada
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          {appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate)).length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <Calendar className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="font-medium text-gray-600">No hay citas para este día</p>
                              <p className="text-sm text-gray-500 mt-1">Selecciona otra fecha</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="font-medium text-gray-600">Selecciona una fecha</p>
                          <p className="text-sm text-gray-500 mt-1">en el calendario para ver las citas</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Reviews Sub-Tab */}
            <TabsContent value="reviews" className="space-y-6">
              <ProviderReviews accent={resolveProviderDashboardAccent('orders', 'reviews')} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      </div>

      {/* Service Modal */}
      <ProviderServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        onSave={handleServiceSave}
        service={editingService}
        isEditing={!!editingService}
        onSaveAvailability={async (serviceId, availability) => {
          try {
            await saveServiceAvailability(serviceId, availability);
          } catch (error) {
            console.error('Error saving availability:', error);
            throw error;
          }
        }}
        onSaveTimeSlots={async (serviceId, timeSlots) => {
          try {
            await saveServiceTimeSlots(serviceId, timeSlots);
          } catch (error) {
            console.error('Error saving time slots:', error);
            throw error;
          }
        }}
        onFetchAvailability={fetchServiceAvailability}
        onFetchTimeSlots={fetchServiceTimeSlots}
      />

      {/* Product Import Dialog */}
      <ProviderProductImportDialog
        isOpen={isProductImportOpen}
        onClose={() => setIsProductImportOpen(false)}
        onCreate={handleProductImportCreate}
        onEditDraft={handleProductImportEditDraft}
      />

      {/* Product Modal */}
      <ProviderProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          console.log('🔒 Modal onClose called');
          setIsProductModalOpen(false);
          setEditingProduct(null);
          setProductImportDraft(null);
        }}
        onSave={async (productData) => {
          await handleProductSave(productData);
          setEditingProduct(null);
          setProductImportDraft(null);
          setIsProductModalOpen(false);
        }}
        product={editingProduct}
        isEditing={!!editingProduct}
        initialDraft={productImportDraft}
      />

      {/* Bottom Navigation Menu - Mobile Only */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-2xl md:hidden"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex h-[58px] w-full max-w-lg items-end overflow-visible px-1">
          <div className="relative flex min-w-0 flex-1 items-end justify-around">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={providerBottomNavClass('dashboard')}
            >
              <Grid size={18} className="mb-1" />
              <span className="text-[10px] font-medium truncate leading-tight">Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={providerBottomNavClass('profile')}
            >
              <User size={18} className="mb-1" />
              <span className="text-[10px] font-medium truncate leading-tight">Perfil</span>
            </button>
          </div>

          <BlueprintMascotNavTab dashboard="provider" />

          <div className="relative flex min-w-0 flex-1 items-end justify-around">
            <button
              onClick={() => handleTabChange('store')}
              className={providerBottomNavClass('store')}
            >
              <Store size={18} className="mb-1" />
              <span className="text-[10px] font-medium truncate leading-tight">Tienda</span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={providerBottomNavClass('orders')}
            >
              <ShoppingBag size={18} className="mb-1" />
              <span className="text-[10px] font-medium truncate leading-tight">Pedidos</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default ProviderDashboard;
