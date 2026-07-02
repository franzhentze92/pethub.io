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
  Search,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  User,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LostPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  color: string;
  last_seen: string;
  last_location: string;
  latitude: number;
  longitude: number;
  description: string;
  contact_phone: string;
  contact_email: string;
  reward?: number | null;
  image_url?: string | null;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  owner?: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface LostPetStats {
  totalLostPets: number;
  lostPetsThisMonth: number;
  lostStatus: number;
  foundStatus: number;
  withReward: number;
  totalReward: number;
  uniqueOwners: number;
  uniqueSpecies: number;
}

const AdminLostPetsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [filteredLostPets, setFilteredLostPets] = useState<LostPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLostPet, setSelectedLostPet] = useState<LostPet | null>(null);
  const [showLostPetDetails, setShowLostPetDetails] = useState(false);
  const [stats, setStats] = useState<LostPetStats>({
    totalLostPets: 0,
    lostPetsThisMonth: 0,
    lostStatus: 0,
    foundStatus: 0,
    withReward: 0,
    totalReward: 0,
    uniqueOwners: 0,
    uniqueSpecies: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name' | 'species' | 'owner' | 'last_seen'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'date' | 'status' | 'name' | 'species' | 'owner' | 'last_seen') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'status' | 'name' | 'species' | 'owner' | 'last_seen') => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  useEffect(() => {
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }
    loadLostPets();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...lostPets];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pet =>
        pet.name?.toLowerCase().includes(searchLower) ||
        pet.species?.toLowerCase().includes(searchLower) ||
        pet.breed?.toLowerCase().includes(searchLower) ||
        pet.color?.toLowerCase().includes(searchLower) ||
        pet.last_location?.toLowerCase().includes(searchLower) ||
        pet.description?.toLowerCase().includes(searchLower) ||
        pet.owner?.full_name?.toLowerCase().includes(searchLower) ||
        pet.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pet => pet.status === statusFilter);
    }

    // Apply species filter
    if (speciesFilter !== 'all') {
      filtered = filtered.filter(pet => pet.species?.toLowerCase() === speciesFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(pet => new Date(pet.created_at) >= startDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'species':
          comparison = (a.species || '').localeCompare(b.species || '');
          break;
        case 'owner':
          comparison = (a.owner?.full_name || '').localeCompare(b.owner?.full_name || '');
          break;
        case 'last_seen':
          comparison = new Date(a.last_seen).getTime() - new Date(b.last_seen).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredLostPets(filtered);
  }, [lostPets, searchTerm, statusFilter, speciesFilter, dateFilter, sortBy, sortOrder]);

  const loadLostPets = async () => {
    try {
      setLoading(true);

      console.log('Loading lost pets...');

      // Load all lost pets
      const { data: lostPetsData, error: lostPetsError } = await supabase
        .from('lost_pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (lostPetsError) {
        console.error('Error loading lost pets:', lostPetsError);
        console.error('Error details:', JSON.stringify(lostPetsError, null, 2));
        setLostPets([]);
        setStats({
          totalLostPets: 0,
          lostPetsThisMonth: 0,
          lostStatus: 0,
          foundStatus: 0,
          withReward: 0,
          totalReward: 0,
          uniqueOwners: 0,
          uniqueSpecies: 0
        });
        return;
      }

      console.log('Lost pets loaded (raw):', lostPetsData?.length || 0);

      if (!lostPetsData || lostPetsData.length === 0) {
        console.warn('No lost pets found in database');
        setLostPets([]);
        setStats({
          totalLostPets: 0,
          lostPetsThisMonth: 0,
          lostStatus: 0,
          foundStatus: 0,
          withReward: 0,
          totalReward: 0,
          uniqueOwners: 0,
          uniqueSpecies: 0
        });
        return;
      }

      // Get unique owner IDs
      const ownerIds = [...new Set((lostPetsData || []).map(p => p.owner_id).filter(Boolean))];
      console.log('Owner IDs to fetch:', ownerIds.length);

      // Load owner information
      let ownersData: any[] = [];
      if (ownerIds.length > 0) {
        const { data, error: ownersError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', ownerIds);

        if (ownersError) {
          console.error('Error loading owner information:', ownersError);
        } else {
          ownersData = data || [];
          console.log('Owners loaded:', ownersData.length);
        }
      }

      // Create map for quick lookup
      const ownersMap = new Map(
        ownersData.map(owner => [owner.user_id, owner])
      );

      // Map lost pets with owner info
      const lostPetsWithDetails = (lostPetsData || []).map(pet => ({
        ...pet,
        owner: ownersMap.get(pet.owner_id) || null
      }));

      console.log('Lost pets with details:', lostPetsWithDetails.length);

      setLostPets(lostPetsWithDetails);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const lostPetsThisMonth = lostPetsWithDetails.filter(p => 
        new Date(p.created_at) >= startOfMonth
      ).length;
      
      const lostStatus = lostPetsWithDetails.filter(p => p.status === 'lost' || p.status === 'missing').length;
      const foundStatus = lostPetsWithDetails.filter(p => p.status === 'found' || p.status === 'recovered').length;
      const withReward = lostPetsWithDetails.filter(p => p.reward && p.reward > 0).length;
      const totalReward = lostPetsWithDetails.reduce((sum, p) => sum + (p.reward || 0), 0);

      const uniqueOwners = new Set(lostPetsWithDetails.map(p => p.owner_id).filter(Boolean)).size;
      const uniqueSpecies = new Set(lostPetsWithDetails.map(p => p.species?.toLowerCase()).filter(Boolean)).size;

      setStats({
        totalLostPets: lostPetsWithDetails.length,
        lostPetsThisMonth,
        lostStatus,
        foundStatus,
        withReward,
        totalReward,
        uniqueOwners,
        uniqueSpecies
      });

    } catch (error) {
      console.error('Error loading lost pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (pet: LostPet) => {
    setSelectedLostPet(pet);
    setShowLostPetDetails(true);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'lost': 'Perdida',
      'missing': 'Perdida',
      'found': 'Encontrada',
      'recovered': 'Recuperada'
    };
    return statusMap[status?.toLowerCase()] || status || 'Sin estatus';
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'lost': 'bg-red-100 text-red-800 border-red-300',
      'missing': 'bg-red-100 text-red-800 border-red-300',
      'found': 'bg-green-100 text-green-800 border-green-300',
      'recovered': 'bg-green-100 text-green-800 border-green-300'
    };
    return colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'lost':
      case 'missing':
        return <AlertTriangle className="w-4 h-4" />;
      case 'found':
      case 'recovered':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Fecha Reporte', 'Estatus', 'Nombre', 'Especie', 'Raza', 'Edad', 'Color',
      'Última Vez Vista', 'Ubicación', 'Latitud', 'Longitud', 'Descripción',
      'Teléfono Contacto', 'Email Contacto', 'Recompensa', 'Dueño', 'Teléfono Dueño'
    ];
    const data = filteredLostPets.map(pet => [
      pet.id.slice(0, 8),
      format(new Date(pet.created_at), 'dd/MM/yyyy', { locale: es }),
      getStatusLabel(pet.status),
      pet.name || 'N/A',
      pet.species || 'N/A',
      pet.breed || 'N/A',
      pet.age || 'N/A',
      pet.color || 'N/A',
      format(new Date(pet.last_seen), 'dd/MM/yyyy', { locale: es }),
      pet.last_location || 'N/A',
      pet.latitude || 'N/A',
      pet.longitude || 'N/A',
      pet.description || 'N/A',
      pet.contact_phone || 'N/A',
      pet.contact_email || 'N/A',
      pet.reward || 0,
      pet.owner?.full_name || 'N/A',
      pet.owner?.phone || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mascotas_perdidas_pethub_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  // Get unique statuses and species for filters
  const uniqueStatuses = Array.from(new Set(lostPets.map(p => p.status).filter(Boolean)));
  const uniqueSpecies = Array.from(new Set(lostPets.map(p => p.species).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="lost-pets" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando mascotas perdidas…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="lost-pets" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader
            title="Mascotas Perdidas"
            subtitle="Administra todas las mascotas perdidas registradas en la plataforma"
            gradient="from-orange-600 to-red-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadLostPets}
                className="flex items-center gap-2 bg-white/20 border-white text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center gap-2 bg-white/20 border-white text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </PageHeader>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalLostPets}</div>
                <div className="text-sm opacity-90">Total de Reportes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.lostStatus}</div>
                <div className="text-sm opacity-90">Perdidas</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.foundStatus}</div>
                <div className="text-sm opacity-90">Encontradas</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.lostPetsThisMonth}</div>
                <div className="text-sm opacity-90">Este Mes</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Con Recompensa</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.withReward}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Recompensas</p>
                    <p className="text-2xl font-bold text-green-600">Q{stats.totalReward.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Dueños Únicos</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.uniqueOwners}</p>
                  </div>
                  <User className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Especies Únicas</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.uniqueSpecies}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-purple-500" />
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
                      placeholder="Buscar por nombre, especie, raza, ubicación, dueño..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Todos los Estatus</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{getStatusLabel(status)}</option>
                    ))}
                  </select>
                </div>

                {/* Species Filter */}
                <div>
                  <select
                    value={speciesFilter}
                    onChange={(e) => setSpeciesFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Todas las Especies</option>
                    {uniqueSpecies.map(species => (
                      <option key={species} value={species.toLowerCase()}>{species}</option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Todas las Fechas</option>
                    <option value="today">Hoy</option>
                    <option value="week">Última Semana</option>
                    <option value="month">Este Mes</option>
                    <option value="year">Este Año</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="md:col-span-2">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('-');
                      setSortBy(by as any);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="date-desc">Más Recientes</option>
                    <option value="date-asc">Más Antiguos</option>
                    <option value="status-asc">Estatus A-Z</option>
                    <option value="status-desc">Estatus Z-A</option>
                    <option value="name-asc">Nombre A-Z</option>
                    <option value="name-desc">Nombre Z-A</option>
                    <option value="species-asc">Especie A-Z</option>
                    <option value="species-desc">Especie Z-A</option>
                    <option value="owner-asc">Dueño A-Z</option>
                    <option value="owner-desc">Dueño Z-A</option>
                    <option value="last_seen-desc">Última Vez Vista (Reciente)</option>
                    <option value="last_seen-asc">Última Vez Vista (Antigua)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lost Pets Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mascotas Perdidas ({filteredLostPets.length} de {stats.totalLostPets})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredLostPets.length} reportes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLostPets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Mascota</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('status')} className="px-2 py-0 h-auto">
                            Estatus {getSortIcon('status')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('last_seen')} className="px-2 py-0 h-auto">
                            Última Vez Vista {getSortIcon('last_seen')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Ubicación</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('owner')} className="px-2 py-0 h-auto">
                            Dueño {getSortIcon('owner')}
                          </Button>
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Recompensa</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('date')} className="px-2 py-0 h-auto">
                            Fecha Reporte {getSortIcon('date')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredLostPets.map((pet) => (
                        <tr key={pet.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {pet.image_url ? (
                                <img
                                  src={pet.image_url}
                                  alt={pet.name}
                                  className="w-10 h-10 object-cover rounded-full border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                  <AlertTriangle className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{pet.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                  {pet.species || 'N/A'} • {pet.breed || 'N/A'} • {pet.age ? `${pet.age} años` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${getStatusColor(pet.status)}`}>
                              {getStatusIcon(pet.status)}
                              {getStatusLabel(pet.status)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {format(new Date(pet.last_seen), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="max-w-[150px] truncate">{pet.last_location || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{pet.owner?.full_name || 'N/A'}</p>
                            {pet.owner?.phone && (
                              <p className="text-xs text-gray-500">{pet.owner.phone}</p>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-right font-semibold text-yellow-600">
                            {pet.reward && pet.reward > 0 ? `Q${pet.reward.toFixed(2)}` : 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {format(new Date(pet.created_at), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="py-4 px-4">
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(pet)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || statusFilter !== 'all' || speciesFilter !== 'all' || dateFilter !== 'all'
                      ? 'No se encontraron mascotas perdidas con los filtros aplicados'
                      : 'No hay mascotas perdidas registradas'}
                  </p>
                  {(searchTerm || statusFilter !== 'all' || speciesFilter !== 'all' || dateFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => { 
                        setSearchTerm(''); 
                        setStatusFilter('all'); 
                        setSpeciesFilter('all');
                        setDateFilter('all');
                      }}
                      className="mt-4"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lost Pet Details Modal */}
      {selectedLostPet && (
        <Dialog open={showLostPetDetails} onOpenChange={setShowLostPetDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-orange-700">
                Detalles de Mascota Perdida
              </DialogTitle>
              <DialogDescription>
                Información completa sobre el reporte de mascota perdida.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                <Badge variant="outline" className={`text-base px-4 py-2 flex items-center gap-2 ${getStatusColor(selectedLostPet.status)}`}>
                  {getStatusIcon(selectedLostPet.status)}
                  {getStatusLabel(selectedLostPet.status)}
                </Badge>
              </div>

              {/* Pet Image */}
              {selectedLostPet.image_url && (
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedLostPet.image_url}
                    alt={selectedLostPet.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Pet Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de la Mascota</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Nombre</Label>
                      <p className="font-medium">{selectedLostPet.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Especie</Label>
                      <p className="font-medium">{selectedLostPet.species || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Raza</Label>
                      <p className="font-medium">{selectedLostPet.breed || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Edad</Label>
                      <p className="font-medium">{selectedLostPet.age ? `${selectedLostPet.age} años` : 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Color</Label>
                      <p className="font-medium">{selectedLostPet.color || 'N/A'}</p>
                    </div>
                    {selectedLostPet.reward && selectedLostPet.reward > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600">Recompensa</Label>
                        <p className="font-medium text-yellow-600">Q{selectedLostPet.reward.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Descripción</Label>
                    <p className="font-medium whitespace-pre-wrap">{selectedLostPet.description || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Location Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Ubicación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-600">Última Vez Vista</Label>
                    <p className="font-medium">{format(new Date(selectedLostPet.last_seen), 'dd MMM yyyy', { locale: es })}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Ubicación</Label>
                    <p className="font-medium">{selectedLostPet.last_location || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Latitud</Label>
                      <p className="font-medium">{selectedLostPet.latitude || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Longitud</Label>
                      <p className="font-medium">{selectedLostPet.longitude || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{selectedLostPet.contact_phone || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{selectedLostPet.contact_email || 'N/A'}</p>
                  </div>
                  {selectedLostPet.owner && (
                    <div className="pt-2 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Dueño Registrado</Label>
                      <p className="font-medium">{selectedLostPet.owner.full_name || 'N/A'}</p>
                      {selectedLostPet.owner.phone && (
                        <p className="text-sm text-gray-500">{selectedLostPet.owner.phone}</p>
                      )}
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
                    <span className="text-sm text-gray-600">Reporte Creado:</span>
                    <span className="text-sm">{format(new Date(selectedLostPet.created_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
                  </div>
                  {selectedLostPet.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Última Actualización:</span>
                      <span className="text-sm">{format(new Date(selectedLostPet.updated_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminLostPetsPage;

