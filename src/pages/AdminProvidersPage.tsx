import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Store,
  Search,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  MapPin,
  Phone,
  Mail,
  Star,
  Eye,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  phone: string;
  address: string;
  description: string;
  profile_picture_url: string;
  logo_url?: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  city_id?: number;
  google_place_id?: string;
  formatted_address?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  has_delivery?: boolean;
  has_pickup?: boolean;
  delivery_fee?: number;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

type SortField = 'business_name' | 'business_type' | 'rating' | 'created_at';
type SortOrder = 'asc' | 'desc';

const AdminProvidersPage: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadProvidersData();
  }, []);

  // Filter and sort providers
  useEffect(() => {
    let filtered = [...providers];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(provider =>
        provider.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.phone?.includes(searchTerm) ||
        provider.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(provider => provider.business_type === typeFilter);
    }

    // Apply verified filter
    if (verifiedFilter !== 'all') {
      filtered = filtered.filter(provider => 
        verifiedFilter === 'verified' ? provider.is_verified : !provider.is_verified
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'business_name':
          aValue = a.business_name || '';
          bValue = b.business_name || '';
          break;
        case 'business_type':
          aValue = a.business_type || '';
          bValue = b.business_type || '';
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredProviders(filtered);
  }, [providers, searchTerm, typeFilter, verifiedFilter, sortField, sortOrder]);

  const loadProvidersData = async () => {
    try {
      setLoading(true);

      // Load all providers
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (providersError) {
        console.error('Error loading providers:', providersError);
        toast.error('Error al cargar proveedores', {
          description: providersError.message
        });
        return;
      }

      // Get owner names from user_profiles
      const userIds = [...new Set((providersData || []).map(p => p.user_id).filter(id => id))];
      let userProfiles = null;
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (error) {
          console.error('Error loading user profiles:', error);
        } else {
          userProfiles = data;
        }
      }

      // Create a map of user_id -> owner name
      const ownerMap = new Map();
      (userProfiles || []).forEach((profile: any) => {
        ownerMap.set(profile.user_id, profile.full_name);
      });

      // Get all provider reviews to calculate real ratings and review counts
      const providerIds = (providersData || []).map(p => p.id).filter(id => id);
      let reviewsData = null;
      if (providerIds.length > 0) {
        const { data: reviews, error: reviewsError } = await supabase
          .from('provider_reviews')
          .select('provider_id, rating')
          .in('provider_id', providerIds);

        if (reviewsError) {
          console.error('Error loading provider reviews:', reviewsError);
        } else {
          reviewsData = reviews;
        }
      }

      // Calculate rating and total_reviews for each provider
      const reviewsMap = new Map<string, { ratings: number[]; count: number }>();
      (reviewsData || []).forEach((review: any) => {
        const providerId = review.provider_id;
        if (!reviewsMap.has(providerId)) {
          reviewsMap.set(providerId, { ratings: [], count: 0 });
        }
        const providerReviews = reviewsMap.get(providerId)!;
        providerReviews.ratings.push(review.rating);
        providerReviews.count++;
      });

      // Combine providers with owner names and real review data
      const providersWithOwnerInfo = (providersData || []).map((provider: any) => {
        const providerReviews = reviewsMap.get(provider.id);
        const reviewCount = providerReviews?.count || 0;
        const averageRating = providerReviews && providerReviews.ratings.length > 0
          ? providerReviews.ratings.reduce((sum, rating) => sum + rating, 0) / providerReviews.ratings.length
          : 0;

        return {
          ...provider,
          owner_name: ownerMap.get(provider.user_id) || 'Sin propietario',
          rating: averageRating, // Use calculated rating from reviews
          total_reviews: reviewCount // Use calculated review count
        };
      });

      setProviders(providersWithOwnerInfo);

    } catch (error: any) {
      console.error('Error loading providers data:', error);
      toast.error('Error al cargar proveedores', {
        description: error.message || 'No se pudieron cargar los proveedores'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowProviderDetails(true);
  };

  // Get unique business types for filter
  const uniqueTypes = [...new Set(providers.map(p => p.business_type).filter(Boolean))].sort();

  // Get provider statistics
  const getProviderStats = () => {
    const total = providers.length;
    const verified = providers.filter(p => p.is_verified).length;
    const unverified = providers.filter(p => !p.is_verified).length;
    const avgRating = providers.length > 0
      ? providers.reduce((sum, p) => sum + (p.rating || 0), 0) / providers.length
      : 0;

    return { total, verified, unverified, avgRating };
  };

  const stats = getProviderStats();

  // Sortable header component
  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => {
    const isActive = sortField === field;
    return (
      <th 
        className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => {
          if (isActive) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortOrder('asc');
          }
        }}
      >
        <div className="flex items-center gap-2">
          {children}
          <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-16">
        <PageHeader 
          title="Proveedores" 
          description="Gestión y visualización de todos los proveedores registrados"
        />
        
        <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">Proveedores registrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verificados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                <p className="text-xs text-gray-500 mt-1">Proveedores verificados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Verificar</CardTitle>
                <XCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.unverified}</div>
                <p className="text-xs text-gray-500 mt-1">Pendientes de verificación</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
                <Star className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</div>
                <p className="text-xs text-gray-500 mt-1">De 5 estrellas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre, descripción, dirección, teléfono..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los Tipos</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verified Filter */}
                <div>
                  <select
                    value={verifiedFilter}
                    onChange={(e) => setVerifiedFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="verified">Verificados</option>
                    <option value="unverified">Sin Verificar</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Providers Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Proveedores ({filteredProviders.length} de {providers.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadProvidersData}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SectionLoader />
              ) : filteredProviders.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron proveedores</p>
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
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Imagen</th>
                        <SortableHeader field="business_name">Nombre</SortableHeader>
                        <SortableHeader field="business_type">Tipo</SortableHeader>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Ubicación</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Contacto</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Propietario</th>
                        <SortableHeader field="rating">Calificación</SortableHeader>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Estado</th>
                        <SortableHeader field="created_at">Fecha Registro</SortableHeader>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProviders.map((provider) => (
                        <tr key={provider.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {provider.profile_picture_url ? (
                                <img
                                  src={provider.profile_picture_url}
                                  alt={provider.business_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Store className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-gray-900">{provider.business_name}</p>
                            {provider.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">
                                {provider.description}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              {provider.business_type}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {provider.address ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="text-sm text-gray-700 max-w-xs truncate">{provider.address}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Sin ubicación</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {provider.phone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span className="text-gray-700">{provider.phone}</span>
                                </div>
                              )}
                              {!provider.phone && (
                                <span className="text-xs text-gray-400">Sin teléfono</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-sm text-gray-700">{provider.owner_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                              <span className="text-xs text-gray-500">({provider.total_reviews})</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {provider.is_verified ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verificado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                <XCircle className="w-3 h-3 mr-1" />
                                Sin Verificar
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {new Date(provider.created_at).toLocaleDateString('es-GT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(provider)}
                              className="flex items-center gap-2"
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Provider Details Modal */}
      <Dialog open={showProviderDetails} onOpenChange={setShowProviderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Proveedor</DialogTitle>
            <DialogDescription>
              Información completa de {selectedProvider?.business_name}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-6">
              {/* Header with Image */}
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {selectedProvider.profile_picture_url ? (
                    <img
                      src={selectedProvider.profile_picture_url}
                      alt={selectedProvider.business_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedProvider.business_name}</h3>
                    {selectedProvider.is_verified ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        Sin Verificar
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 mb-2">
                    {selectedProvider.business_type}
                  </Badge>
                  {selectedProvider.address && (
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedProvider.address}</span>
                    </div>
                  )}
                  {selectedProvider.description && (
                    <p className="text-gray-600 mt-2">{selectedProvider.description}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedProvider.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedProvider.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Propietario: {selectedProvider.owner_name}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Calificación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <div className="text-2xl font-bold">{selectedProvider.rating.toFixed(1)}</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedProvider.total_reviews} reseñas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Entrega</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedProvider.has_delivery ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    {selectedProvider.has_delivery && selectedProvider.delivery_fee && (
                      <p className="text-xs text-gray-500 mt-1">Q{selectedProvider.delivery_fee.toFixed(2)}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Recoger</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedProvider.has_pickup ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Fecha Registro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {new Date(selectedProvider.created_at).toLocaleDateString('es-GT', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProvidersPage;

