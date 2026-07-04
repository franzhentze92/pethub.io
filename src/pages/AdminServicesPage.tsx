import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Star,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  Download,
  RefreshCw,
  Eye,
  Building2,
  Tag,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { toast } from 'sonner';

interface Service {
  id: string;
  provider_id: string;
  service_name: string;
  service_category: string;
  description: string;
  detailed_description?: string;
  price: number;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  price_extra_large?: number | null;
  currency: string;
  duration_minutes: number;
  preparation_instructions?: string;
  cancellation_policy?: string;
  max_advance_booking_days: number;
  min_advance_booking_hours: number;
  is_active: boolean;
  service_image_url?: string;
  created_at: string;
  updated_at: string;
  provider?: {
    business_name: string;
    business_type: string;
    address?: string;
    phone?: string;
    profile_picture_url?: string;
  };
}

interface ServiceStats {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  totalCategories: number;
  servicesThisMonth: number;
  avgPrice: number;
  avgDuration: number;
}

const AdminServicesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [stats, setStats] = useState<ServiceStats>({
    totalServices: 0,
    activeServices: 0,
    inactiveServices: 0,
    totalCategories: 0,
    servicesThisMonth: 0,
    avgPrice: 0,
    avgDuration: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'price' | 'duration' | 'category' | 'provider'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Verify admin access
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }

    loadServicesData();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...services];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(service => 
        service.service_name?.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.provider?.business_name?.toLowerCase().includes(searchLower) ||
        service.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.service_category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(service => service.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(service => !service.is_active);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.service_name || '').localeCompare(b.service_name || '');
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'duration':
          comparison = (a.duration_minutes || 0) - (b.duration_minutes || 0);
          break;
        case 'category':
          comparison = (a.service_category || '').localeCompare(b.service_category || '');
          break;
        case 'provider':
          comparison = (a.provider?.business_name || '').localeCompare(b.provider?.business_name || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredServices(filtered);
  }, [services, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  const loadServicesData = async () => {
    try {
      setLoading(true);

      // Load all services with provider information
      const { data: servicesData, error: servicesError } = await supabase
        .from('provider_services')
        .select(`
          *,
          providers (
            business_name,
            business_type,
            address,
            phone,
            profile_picture_url
          )
        `)
        .order('created_at', { ascending: false });

      if (servicesError) {
        console.error('Error loading services:', servicesError);
        return;
      }

      console.log('Services loaded:', servicesData?.length || 0);

      const servicesWithProvider = (servicesData || []).map(service => ({
        ...service,
        provider: service.providers || null
      }));

      setServices(servicesWithProvider);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const activeServices = servicesWithProvider.filter(s => s.is_active).length;
      const inactiveServices = servicesWithProvider.filter(s => !s.is_active).length;
      
      const uniqueCategories = new Set(servicesWithProvider.map(s => s.service_category)).size;
      
      const servicesThisMonth = servicesWithProvider.filter(s => 
        new Date(s.created_at) >= startOfMonth
      ).length;
      
      const totalPrice = servicesWithProvider.reduce((sum, s) => sum + (s.price || 0), 0);
      const avgPrice = servicesWithProvider.length > 0 
        ? totalPrice / servicesWithProvider.length
        : 0;

      const totalDuration = servicesWithProvider.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const avgDuration = servicesWithProvider.length > 0
        ? totalDuration / servicesWithProvider.length
        : 0;

      setStats({
        totalServices: servicesWithProvider.length,
        activeServices,
        inactiveServices,
        totalCategories: uniqueCategories,
        servicesThisMonth,
        avgPrice,
        avgDuration: Math.round(avgDuration)
      });

    } catch (error) {
      console.error('Error loading services data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (service: Service) => {
    setSelectedService(service);
    setShowServiceDetails(true);
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'veterinaria': 'Veterinaria',
      'grooming': 'Grooming',
      'entrenamiento': 'Entrenamiento',
      'alojamiento': 'Alojamiento',
      'transporte': 'Transporte',
      'fisioterapia': 'Fisioterapia',
      'nutricion': 'Nutrición',
      'otro': 'Otro'
    };
    return categories[category] || category;
  };

  const getPriceDisplay = (service: Service) => {
    // Check if service has size-based prices
    const sizePrices = [
      service.price_small,
      service.price_medium,
      service.price_large,
      service.price_extra_large
    ].filter((p): p is number => p !== null && p !== undefined);
    
    const currencySymbol = service.currency === 'GTQ' ? 'Q' : '$';
    
    if (sizePrices.length > 0) {
      const minPrice = Math.min(...sizePrices);
      const maxPrice = Math.max(...sizePrices);
      
      if (minPrice === maxPrice) {
        return `${currencySymbol}${minPrice.toFixed(2)}`;
      } else {
        return `${currencySymbol}${minPrice.toFixed(2)} - ${currencySymbol}${maxPrice.toFixed(2)}`;
      }
    } else {
      return `${currencySymbol}${(service.price || 0).toFixed(2)}`;
    }
  };

  const handleSort = (column: 'name' | 'date' | 'price' | 'duration' | 'category' | 'provider') => {
    if (sortBy === column) {
      // Toggle order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'name' | 'date' | 'price' | 'duration' | 'category' | 'provider') => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  const handleExport = () => {
    try {
      // Create CSV headers
      const headers = ['ID', 'Nombre', 'Categoría', 'Proveedor', 'Precio', 'Duración (min)', 'Estado', 'Fecha Creación'];
      
      // Create CSV rows
      const rows = filteredServices.map(service => [
        service.id.slice(0, 8),
        service.service_name || 'Sin nombre',
        getCategoryLabel(service.service_category) || 'Sin categoría',
        service.provider?.business_name || 'Sin proveedor',
        getPriceDisplay(service),
        service.duration_minutes || 0,
        service.is_active ? 'Activo' : 'Inactivo',
        new Date(service.created_at).toLocaleDateString('es-GT')
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `servicios_pethub_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      toast.error('Error al exportar el archivo CSV');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="services" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando servicios…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="services" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader 
            title="Gestión de Servicios"
            subtitle="Administra todos los servicios de la plataforma"
            gradient="from-indigo-600 to-purple-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                onClick={loadServicesData}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </Button>
              <Button
                onClick={handleExport}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </PageHeader>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <div className="text-sm opacity-90">Total de Servicios</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.activeServices}</div>
                <div className="text-sm opacity-90">Servicios Activos</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.avgDuration} min</div>
                <div className="text-sm opacity-90">Duración Promedio</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{stats.avgPrice.toFixed(2)}</div>
                <div className="text-sm opacity-90">Precio Promedio</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Inactivos</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.inactiveServices}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Categorías</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalCategories}</p>
                  </div>
                  <Tag className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Este Mes</p>
                    <p className="text-2xl font-bold text-green-600">{stats.servicesThisMonth}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros y Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre, descripción, proveedor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todas las Categorías</option>
                    <option value="veterinaria">Veterinaria</option>
                    <option value="grooming">Grooming</option>
                    <option value="entrenamiento">Entrenamiento</option>
                    <option value="alojamiento">Alojamiento</option>
                    <option value="transporte">Transporte</option>
                    <option value="fisioterapia">Fisioterapia</option>
                    <option value="nutricion">Nutrición</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="md:col-span-4">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('-');
                      setSortBy(by as any);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="date-desc">Más Recientes</option>
                    <option value="date-asc">Más Antiguos</option>
                    <option value="name-asc">Nombre A-Z</option>
                    <option value="name-desc">Nombre Z-A</option>
                    <option value="price-desc">Mayor Precio</option>
                    <option value="price-asc">Menor Precio</option>
                    <option value="duration-desc">Mayor Duración</option>
                    <option value="duration-asc">Menor Duración</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Servicios ({filteredServices.length} de {stats.totalServices})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredServices.length} servicios
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredServices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Imagen</th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Servicio
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center gap-2">
                            Categoría
                            {getSortIcon('category')}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('provider')}
                        >
                          <div className="flex items-center gap-2">
                            Proveedor
                            {getSortIcon('provider')}
                          </div>
                        </th>
                        <th 
                          className="text-right p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Precio
                            {getSortIcon('price')}
                          </div>
                        </th>
                        <th 
                          className="text-center p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('duration')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Duración
                            {getSortIcon('duration')}
                          </div>
                        </th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Estado</th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-2">
                            Fecha
                            {getSortIcon('date')}
                          </div>
                        </th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="border-b hover:bg-gray-50 transition-colors">
                          {/* Image */}
                          <td className="p-3">
                            <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                              {service.service_image_url ? (
                                <img
                                  src={service.service_image_url}
                                  alt={service.service_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              {!service.is_active && (
                                <div className="absolute top-1 right-1">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Service Name */}
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{service.service_name}</p>
                              {service.description && (
                                <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(service.service_category)}
                            </Badge>
                          </td>

                          {/* Provider */}
                          <td className="p-3">
                            {service.provider ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {service.provider.business_name}
                                  </p>
                                  {service.provider.business_type && (
                                    <p className="text-xs text-gray-500 capitalize">
                                      {service.provider.business_type}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Price */}
                          <td className="p-3 text-right">
                            <p className="font-bold text-green-600">
                              {getPriceDisplay(service)}
                            </p>
                            <p className="text-xs text-gray-500">{service.currency}</p>
                          </td>

                          {/* Duration */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{service.duration_minutes} min</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center">
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>

                          {/* Date */}
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {new Date(service.created_at).toLocaleDateString('es-GT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(service.created_at).toLocaleTimeString('es-GT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(service)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'No se encontraron servicios con los filtros aplicados' 
                      : 'No hay servicios registrados'}
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchTerm('')}
                      className="mt-4"
                    >
                      Limpiar búsqueda
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service Details Modal */}
      <Dialog open={showServiceDetails} onOpenChange={setShowServiceDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Servicio</DialogTitle>
            <DialogDescription>
              Información completa del servicio {selectedService?.service_name}
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6">
              {/* Service Image */}
              {selectedService.service_image_url && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Imagen del Servicio</Label>
                  <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedService.service_image_url}
                      alt={selectedService.service_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Nombre</Label>
                      <p className="font-medium">{selectedService.service_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Categoría</Label>
                      <Badge variant="outline" className="mt-1">
                        {getCategoryLabel(selectedService.service_category)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Estado</Label>
                      <div className="mt-1">
                        <Badge variant={selectedService.is_active ? "default" : "secondary"}>
                          {selectedService.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Duración</Label>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedService.duration_minutes} minutos
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Proveedor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedService.provider ? (
                      <>
                        <div>
                          <Label className="text-xs text-gray-600">Negocio</Label>
                          <p className="font-medium">{selectedService.provider.business_name}</p>
                        </div>
                        {selectedService.provider.business_type && (
                          <div>
                            <Label className="text-xs text-gray-600">Tipo</Label>
                            <p className="text-sm capitalize">{selectedService.provider.business_type}</p>
                          </div>
                        )}
                        {selectedService.provider.phone && (
                          <div>
                            <Label className="text-xs text-gray-600">Teléfono</Label>
                            <p className="text-sm">{selectedService.provider.phone}</p>
                          </div>
                        )}
                        {selectedService.provider.address && (
                          <div>
                            <Label className="text-xs text-gray-600">Dirección</Label>
                            <p className="text-sm">{selectedService.provider.address}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Información del proveedor no disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {(selectedService.description || selectedService.detailed_description) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Descripción</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedService.description && (
                      <div>
                        <Label className="text-xs text-gray-600">Descripción Corta</Label>
                        <p className="text-sm mt-1">{selectedService.description}</p>
                      </div>
                    )}
                    {selectedService.detailed_description && (
                      <div>
                        <Label className="text-xs text-gray-600">Descripción Detallada</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{selectedService.detailed_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Precios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600">Precio General</Label>
                    <p className="font-bold text-lg text-green-600">
                      {selectedService.currency === 'GTQ' ? 'Q' : '$'}{(selectedService.price || 0).toFixed(2)}
                    </p>
                  </div>

                  {/* Size-based prices */}
                  {(selectedService.price_small || selectedService.price_medium || selectedService.price_large || selectedService.price_extra_large) && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Precios por Tamaño de Perro</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {selectedService.price_small && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Pequeño</p>
                            <p className="font-semibold">{selectedService.currency === 'GTQ' ? 'Q' : '$'}{selectedService.price_small.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedService.price_medium && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Mediano</p>
                            <p className="font-semibold">{selectedService.currency === 'GTQ' ? 'Q' : '$'}{selectedService.price_medium.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedService.price_large && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Grande</p>
                            <p className="font-semibold">{selectedService.currency === 'GTQ' ? 'Q' : '$'}{selectedService.price_large.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedService.price_extra_large && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Extra Grande</p>
                            <p className="font-semibold">{selectedService.currency === 'GTQ' ? 'Q' : '$'}{selectedService.price_extra_large.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t">
                    <div>
                      <Label className="text-xs text-gray-600">Moneda</Label>
                      <p className="text-sm font-medium">{selectedService.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Reserva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Reserva Máxima (días)</Label>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {selectedService.max_advance_booking_days} días
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Reserva Mínima (horas)</Label>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {selectedService.min_advance_booking_hours} horas
                      </p>
                    </div>
                  </div>
                  {selectedService.preparation_instructions && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Instrucciones de Preparación</Label>
                      <p className="text-sm whitespace-pre-wrap bg-yellow-50 p-3 rounded border border-yellow-200">
                        {selectedService.preparation_instructions}
                      </p>
                    </div>
                  )}
                  {selectedService.cancellation_policy && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Política de Cancelación</Label>
                      <p className="text-sm whitespace-pre-wrap bg-orange-50 p-3 rounded border border-orange-200">
                        {selectedService.cancellation_policy}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Creado:</span>
                    <span className="text-sm">{new Date(selectedService.created_at).toLocaleString('es-GT')}</span>
                  </div>
                  {selectedService.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actualizado:</span>
                      <span className="text-sm">{new Date(selectedService.updated_at).toLocaleString('es-GT')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServicesPage;

