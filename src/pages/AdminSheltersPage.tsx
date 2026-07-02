import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Building2,
  Search,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  MapPin,
  Phone,
  Mail,
  Users,
  Heart,
  Eye,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';

interface Shelter {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  owner_id: string | null;
  mission_statement: string | null;
  years_experience: number | null;
  total_rescued_pets: number | null;
  total_successful_adoptions: number | null;
  total_volunteers: number | null;
  created_at: string;
  updated_at: string;
  primary_image_url?: string;
  owner_name?: string;
}

type SortField = 'name' | 'location' | 'created_at' | 'total_rescued_pets' | 'total_successful_adoptions';
type SortOrder = 'asc' | 'desc';

const AdminSheltersPage: React.FC = () => {
  const { user } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [filteredShelters, setFilteredShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [showShelterDetails, setShowShelterDetails] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadSheltersData();
  }, []);

  // Filter and sort shelters
  useEffect(() => {
    let filtered = [...shelters];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(shelter =>
        shelter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shelter.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shelter.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shelter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shelter.phone?.includes(searchTerm) ||
        shelter.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(shelter => 
        shelter.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        case 'total_rescued_pets':
          aValue = a.total_rescued_pets || 0;
          bValue = b.total_rescued_pets || 0;
          break;
        case 'total_successful_adoptions':
          aValue = a.total_successful_adoptions || 0;
          bValue = b.total_successful_adoptions || 0;
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

    setFilteredShelters(filtered);
  }, [shelters, searchTerm, locationFilter, sortField, sortOrder]);

  const loadSheltersData = async () => {
    try {
      setLoading(true);

      // Load all shelters with images
      const { data: sheltersData, error: sheltersError } = await supabase
        .from('shelters')
        .select(`
          *,
          shelter_images!left (
            id,
            image_url,
            is_primary,
            display_order
          )
        `)
        .order('created_at', { ascending: false });

      if (sheltersError) {
        console.error('Error loading shelters:', sheltersError);
        toast.error('Error al cargar albergues', {
          description: sheltersError.message
        });
        return;
      }

      // Process the data to get the primary image or first image
      const processedShelters = (sheltersData || []).map((shelter: any) => {
        const images = shelter.shelter_images || [];
        const primaryImage = images.find((img: any) => img.is_primary) || images[0];
        
        return {
          ...shelter,
          primary_image_url: primaryImage?.image_url || shelter.image_url
        };
      });

      // Get owner names from user_profiles
      const ownerIds = [...new Set(processedShelters.map((s: any) => s.owner_id).filter((id: any) => id))];
      let userProfiles = null;
      if (ownerIds.length > 0) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', ownerIds);
        
        if (error) {
          console.error('Error loading user profiles:', error);
        } else {
          userProfiles = data;
        }
      }

      // Create a map of owner_id -> owner name
      const ownerMap = new Map();
      (userProfiles || []).forEach((profile: any) => {
        ownerMap.set(profile.user_id, profile.full_name);
      });

      // Combine shelters with owner names
      const sheltersWithOwnerInfo = processedShelters.map((shelter: any) => ({
        ...shelter,
        owner_name: ownerMap.get(shelter.owner_id) || 'Sin propietario'
      }));

      setShelters(sheltersWithOwnerInfo);

    } catch (error: any) {
      console.error('Error loading shelters data:', error);
      toast.error('Error al cargar albergues', {
        description: error.message || 'No se pudieron cargar los albergues'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setShowShelterDetails(true);
  };

  // Get unique locations for filter
  const uniqueLocations = [...new Set(shelters.map(s => s.location).filter(Boolean))].sort();

  // Get shelter statistics
  const getShelterStats = () => {
    const total = shelters.length;
    const totalRescued = shelters.reduce((sum, s) => sum + (s.total_rescued_pets || 0), 0);
    const totalAdoptions = shelters.reduce((sum, s) => sum + (s.total_successful_adoptions || 0), 0);
    const totalVolunteers = shelters.reduce((sum, s) => sum + (s.total_volunteers || 0), 0);

    return { total, totalRescued, totalAdoptions, totalVolunteers };
  };

  const stats = getShelterStats();

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
          title="Albergues" 
          description="Gestión y visualización de todos los albergues registrados"
        />
        
        <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Albergues</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">Albergues registrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mascotas Rescatadas</CardTitle>
                <Heart className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.totalRescued}</div>
                <p className="text-xs text-gray-500 mt-1">Total de rescates</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Adopciones Exitosas</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalAdoptions}</div>
                <p className="text-xs text-gray-500 mt-1">Adopciones completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voluntarios</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalVolunteers}</div>
                <p className="text-xs text-gray-500 mt-1">Total de voluntarios</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre, descripción, ubicación, email, teléfono..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las Ubicaciones</option>
                    {uniqueLocations.map(location => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shelters Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Albergues ({filteredShelters.length} de {shelters.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSheltersData}
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
              ) : filteredShelters.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron albergues</p>
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
                        <SortableHeader field="name">Nombre</SortableHeader>
                        <SortableHeader field="location">Ubicación</SortableHeader>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Contacto</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Propietario</th>
                        <SortableHeader field="total_rescued_pets">Rescatadas</SortableHeader>
                        <SortableHeader field="total_successful_adoptions">Adopciones</SortableHeader>
                        <SortableHeader field="created_at">Fecha Registro</SortableHeader>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShelters.map((shelter) => (
                        <tr key={shelter.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {shelter.primary_image_url || shelter.image_url ? (
                                <img
                                  src={shelter.primary_image_url || shelter.image_url || ''}
                                  alt={shelter.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Building2 className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-gray-900">{shelter.name}</p>
                            {shelter.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">
                                {shelter.description}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            {shelter.location ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="text-sm text-gray-700">{shelter.location}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Sin ubicación</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {shelter.phone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span className="text-gray-700">{shelter.phone}</span>
                                </div>
                              )}
                              {shelter.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3 text-gray-400" />
                                  <span className="text-gray-700 truncate max-w-xs">{shelter.email}</span>
                                </div>
                              )}
                              {!shelter.phone && !shelter.email && (
                                <span className="text-xs text-gray-400">Sin contacto</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-sm text-gray-700">{shelter.owner_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              {shelter.total_rescued_pets || 0}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              {shelter.total_successful_adoptions || 0}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {new Date(shelter.created_at).toLocaleDateString('es-GT', {
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
                              onClick={() => handleViewDetails(shelter)}
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

      {/* Shelter Details Modal */}
      <Dialog open={showShelterDetails} onOpenChange={setShowShelterDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Albergue</DialogTitle>
            <DialogDescription>
              Información completa de {selectedShelter?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedShelter && (
            <div className="space-y-6">
              {/* Header with Image */}
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {selectedShelter.primary_image_url || selectedShelter.image_url ? (
                    <img
                      src={selectedShelter.primary_image_url || selectedShelter.image_url || ''}
                      alt={selectedShelter.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedShelter.name}</h3>
                  {selectedShelter.location && (
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedShelter.location}</span>
                    </div>
                  )}
                  {selectedShelter.description && (
                    <p className="text-gray-600 mt-2">{selectedShelter.description}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedShelter.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedShelter.phone}</span>
                    </div>
                  )}
                  {selectedShelter.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedShelter.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Propietario: {selectedShelter.owner_name}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Años de Experiencia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedShelter.years_experience || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Mascotas Rescatadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{selectedShelter.total_rescued_pets || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Adopciones Exitosas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{selectedShelter.total_successful_adoptions || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-500">Voluntarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{selectedShelter.total_volunteers || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Mission Statement */}
              {selectedShelter.mission_statement && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Declaración de Misión</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{selectedShelter.mission_statement}</p>
                  </CardContent>
                </Card>
              )}

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Registro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fecha de Registro:</span>
                    <span className="text-sm">{new Date(selectedShelter.created_at).toLocaleString('es-GT')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Última Actualización:</span>
                    <span className="text-sm">{new Date(selectedShelter.updated_at).toLocaleString('es-GT')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSheltersPage;

