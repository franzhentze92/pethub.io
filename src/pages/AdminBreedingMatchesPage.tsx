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
  Heart,
  Search,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BreedingMatch {
  id: string;
  pet_id: string;
  potential_partner_id: string;
  owner_id: string;
  partner_owner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  pet?: {
    id: string;
    name: string;
    species: string;
    breed?: string | null;
    age?: number | null;
    image_url?: string | null;
  } | null;
  potential_partner?: {
    id: string;
    name: string;
    species: string;
    breed?: string | null;
    age?: number | null;
    image_url?: string | null;
  } | null;
  owner?: {
    full_name: string | null;
    phone: string | null;
  } | null;
  partner_owner?: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface BreedingStats {
  totalMatches: number;
  matchesThisMonth: number;
  pendingMatches: number;
  acceptedMatches: number;
  rejectedMatches: number;
  matchedMatches: number;
  uniqueOwners: number;
  uniquePets: number;
}

const AdminBreedingMatchesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<BreedingMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<BreedingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<BreedingMatch | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [stats, setStats] = useState<BreedingStats>({
    totalMatches: 0,
    matchesThisMonth: 0,
    pendingMatches: 0,
    acceptedMatches: 0,
    rejectedMatches: 0,
    matchedMatches: 0,
    uniqueOwners: 0,
    uniquePets: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'pet' | 'partner' | 'owner' | 'partner_owner'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'date' | 'status' | 'pet' | 'partner' | 'owner' | 'partner_owner') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'status' | 'pet' | 'partner' | 'owner' | 'partner_owner') => {
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
    loadBreedingMatches();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...matches];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(match =>
        match.pet?.name?.toLowerCase().includes(searchLower) ||
        match.potential_partner?.name?.toLowerCase().includes(searchLower) ||
        match.owner?.full_name?.toLowerCase().includes(searchLower) ||
        match.partner_owner?.full_name?.toLowerCase().includes(searchLower) ||
        match.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(match => match.status === statusFilter);
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
      
      filtered = filtered.filter(match => new Date(match.created_at) >= startDate);
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
        case 'pet':
          comparison = (a.pet?.name || '').localeCompare(b.pet?.name || '');
          break;
        case 'partner':
          comparison = (a.potential_partner?.name || '').localeCompare(b.potential_partner?.name || '');
          break;
        case 'owner':
          comparison = (a.owner?.full_name || '').localeCompare(b.owner?.full_name || '');
          break;
        case 'partner_owner':
          comparison = (a.partner_owner?.full_name || '').localeCompare(b.partner_owner?.full_name || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredMatches(filtered);
  }, [matches, searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

  const loadBreedingMatches = async () => {
    try {
      setLoading(true);

      console.log('Loading breeding matches...');

      // Load all breeding matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('breeding_matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (matchesError) {
        console.error('Error loading breeding matches:', matchesError);
        console.error('Error details:', JSON.stringify(matchesError, null, 2));
        setMatches([]);
        setStats({
          totalMatches: 0,
          matchesThisMonth: 0,
          pendingMatches: 0,
          acceptedMatches: 0,
          rejectedMatches: 0,
          matchedMatches: 0,
          uniqueOwners: 0,
          uniquePets: 0
        });
        return;
      }

      console.log('Breeding matches loaded (raw):', matchesData?.length || 0);

      if (!matchesData || matchesData.length === 0) {
        console.warn('No breeding matches found in database');
        setMatches([]);
        setStats({
          totalMatches: 0,
          matchesThisMonth: 0,
          pendingMatches: 0,
          acceptedMatches: 0,
          rejectedMatches: 0,
          matchedMatches: 0,
          uniqueOwners: 0,
          uniquePets: 0
        });
        return;
      }

      // Get unique IDs
      const petIds = [...new Set([
        ...(matchesData || []).map(m => m.pet_id).filter(Boolean),
        ...(matchesData || []).map(m => m.potential_partner_id).filter(Boolean)
      ])];
      const ownerIds = [...new Set([
        ...(matchesData || []).map(m => m.owner_id).filter(Boolean),
        ...(matchesData || []).map(m => m.partner_owner_id).filter(Boolean)
      ])];
      console.log('Pet IDs to fetch:', petIds.length);
      console.log('Owner IDs to fetch:', ownerIds.length);

      // Load pet information
      let petsData: any[] = [];
      if (petIds.length > 0) {
        const { data, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, breed, age, image_url')
          .in('id', petIds);

        if (petsError) {
          console.error('Error loading pet information:', petsError);
        } else {
          petsData = data || [];
          console.log('Pets loaded:', petsData.length);
        }
      }

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

      // Create maps for quick lookup
      const petsMap = new Map(
        petsData.map(pet => [pet.id, pet])
      );
      const ownersMap = new Map(
        ownersData.map(owner => [owner.user_id, owner])
      );

      // Map matches with related info
      const matchesWithDetails = (matchesData || []).map(match => ({
        ...match,
        pet: petsMap.get(match.pet_id) || null,
        potential_partner: petsMap.get(match.potential_partner_id) || null,
        owner: ownersMap.get(match.owner_id) || null,
        partner_owner: ownersMap.get(match.partner_owner_id) || null
      }));

      console.log('Matches with details:', matchesWithDetails.length);

      setMatches(matchesWithDetails);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const matchesThisMonth = matchesWithDetails.filter(m => 
        new Date(m.created_at) >= startOfMonth
      ).length;
      
      const pendingMatches = matchesWithDetails.filter(m => m.status === 'pending').length;
      const acceptedMatches = matchesWithDetails.filter(m => m.status === 'accepted').length;
      const rejectedMatches = matchesWithDetails.filter(m => m.status === 'rejected').length;
      const matchedMatches = matchesWithDetails.filter(m => m.status === 'matched').length;

      const uniqueOwners = new Set([
        ...matchesWithDetails.map(m => m.owner_id).filter(Boolean),
        ...matchesWithDetails.map(m => m.partner_owner_id).filter(Boolean)
      ]).size;
      const uniquePets = new Set([
        ...matchesWithDetails.map(m => m.pet_id).filter(Boolean),
        ...matchesWithDetails.map(m => m.potential_partner_id).filter(Boolean)
      ]).size;

      setStats({
        totalMatches: matchesWithDetails.length,
        matchesThisMonth,
        pendingMatches,
        acceptedMatches,
        rejectedMatches,
        matchedMatches,
        uniqueOwners,
        uniquePets
      });

    } catch (error) {
      console.error('Error loading breeding matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (match: BreedingMatch) => {
    setSelectedMatch(match);
    setShowMatchDetails(true);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'accepted': 'Aceptada',
      'rejected': 'Rechazada',
      'matched': 'Emparejada'
    };
    return statusMap[status?.toLowerCase()] || status || 'Sin estatus';
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'accepted': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'matched': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'matched':
        return <Heart className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Fecha', 'Estatus', 'Mascota 1', 'Especie 1', 'Raza 1', 'Edad 1',
      'Dueño 1', 'Teléfono Dueño 1', 'Mascota 2', 'Especie 2', 'Raza 2', 'Edad 2',
      'Dueño 2', 'Teléfono Dueño 2', 'Fecha Actualización'
    ];
    const data = filteredMatches.map(match => [
      match.id.slice(0, 8),
      format(new Date(match.created_at), 'dd/MM/yyyy', { locale: es }),
      getStatusLabel(match.status),
      match.pet?.name || 'N/A',
      match.pet?.species || 'N/A',
      match.pet?.breed || 'N/A',
      match.pet?.age || 'N/A',
      match.owner?.full_name || 'N/A',
      match.owner?.phone || 'N/A',
      match.potential_partner?.name || 'N/A',
      match.potential_partner?.species || 'N/A',
      match.potential_partner?.breed || 'N/A',
      match.potential_partner?.age || 'N/A',
      match.partner_owner?.full_name || 'N/A',
      match.partner_owner?.phone || 'N/A',
      format(new Date(match.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `solicitudes_parejas_pethub_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="breeding" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando solicitudes de parejas…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="breeding" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader
            title="Solicitudes de Parejas"
            subtitle="Administra todas las solicitudes de parejas de la plataforma"
            gradient="from-pink-600 to-rose-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadBreedingMatches}
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
            <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalMatches}</div>
                <div className="text-sm opacity-90">Total de Solicitudes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.pendingMatches}</div>
                <div className="text-sm opacity-90">Pendientes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.acceptedMatches}</div>
                <div className="text-sm opacity-90">Aceptadas</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.matchedMatches}</div>
                <div className="text-sm opacity-90">Emparejadas</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Este Mes</p>
                    <p className="text-2xl font-bold text-pink-600">{stats.matchesThisMonth}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Rechazadas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejectedMatches}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
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
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Mascotas Únicas</p>
                    <p className="text-2xl font-bold text-rose-600">{stats.uniquePets}</p>
                  </div>
                  <Heart className="w-8 h-8 text-rose-500" />
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
                      placeholder="Buscar por mascota, dueño..."
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="all">Todos los Estatus</option>
                    <option value="pending">Pendiente</option>
                    <option value="accepted">Aceptada</option>
                    <option value="rejected">Rechazada</option>
                    <option value="matched">Emparejada</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="date-desc">Más Recientes</option>
                    <option value="date-asc">Más Antiguos</option>
                    <option value="status-asc">Estatus A-Z</option>
                    <option value="status-desc">Estatus Z-A</option>
                    <option value="pet-asc">Mascota 1 A-Z</option>
                    <option value="pet-desc">Mascota 1 Z-A</option>
                    <option value="partner-asc">Mascota 2 A-Z</option>
                    <option value="partner-desc">Mascota 2 Z-A</option>
                    <option value="owner-asc">Dueño 1 A-Z</option>
                    <option value="owner-desc">Dueño 1 Z-A</option>
                    <option value="partner_owner-asc">Dueño 2 A-Z</option>
                    <option value="partner_owner-desc">Dueño 2 Z-A</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matches Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Solicitudes de Parejas ({filteredMatches.length} de {stats.totalMatches})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredMatches.length} solicitudes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('pet')} className="px-2 py-0 h-auto">
                            Mascota 1 {getSortIcon('pet')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('owner')} className="px-2 py-0 h-auto">
                            Dueño 1 {getSortIcon('owner')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('partner')} className="px-2 py-0 h-auto">
                            Mascota 2 {getSortIcon('partner')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('partner_owner')} className="px-2 py-0 h-auto">
                            Dueño 2 {getSortIcon('partner_owner')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('status')} className="px-2 py-0 h-auto">
                            Estatus {getSortIcon('status')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('date')} className="px-2 py-0 h-auto">
                            Fecha {getSortIcon('date')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredMatches.map((match) => (
                        <tr key={match.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {match.pet?.image_url ? (
                                <img
                                  src={match.pet.image_url}
                                  alt={match.pet.name}
                                  className="w-10 h-10 object-cover rounded-full border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                  <Heart className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{match.pet?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                  {match.pet?.species || 'N/A'}
                                  {match.pet?.breed && ` • ${match.pet.breed}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{match.owner?.full_name || 'N/A'}</p>
                            {match.owner?.phone && (
                              <p className="text-xs text-gray-500">{match.owner.phone}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {match.potential_partner?.image_url ? (
                                <img
                                  src={match.potential_partner.image_url}
                                  alt={match.potential_partner.name}
                                  className="w-10 h-10 object-cover rounded-full border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                  <Heart className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{match.potential_partner?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                  {match.potential_partner?.species || 'N/A'}
                                  {match.potential_partner?.breed && ` • ${match.potential_partner.breed}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{match.partner_owner?.full_name || 'N/A'}</p>
                            {match.partner_owner?.phone && (
                              <p className="text-xs text-gray-500">{match.partner_owner.phone}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${getStatusColor(match.status)}`}>
                              {getStatusIcon(match.status)}
                              {getStatusLabel(match.status)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {format(new Date(match.created_at), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="py-4 px-4">
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(match)}>
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
                  <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                      ? 'No se encontraron solicitudes con los filtros aplicados'
                      : 'No hay solicitudes de parejas'}
                  </p>
                  {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => { 
                        setSearchTerm(''); 
                        setStatusFilter('all'); 
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

      {/* Match Details Modal */}
      {selectedMatch && (
        <Dialog open={showMatchDetails} onOpenChange={setShowMatchDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-pink-700">
                Detalles de la Solicitud de Pareja
              </DialogTitle>
              <DialogDescription>
                Información completa sobre la solicitud de pareja.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                <Badge variant="outline" className={`text-base px-4 py-2 flex items-center gap-2 ${getStatusColor(selectedMatch.status)}`}>
                  {getStatusIcon(selectedMatch.status)}
                  {getStatusLabel(selectedMatch.status)}
                </Badge>
              </div>

              {/* Pets Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pet 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Mascota 1</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedMatch.pet?.image_url && (
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={selectedMatch.pet.image_url}
                          alt={selectedMatch.pet.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-600">Nombre</Label>
                        <p className="font-medium">{selectedMatch.pet?.name || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">Especie</Label>
                          <p className="font-medium">{selectedMatch.pet?.species || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Raza</Label>
                          <p className="font-medium">{selectedMatch.pet?.breed || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Edad</Label>
                          <p className="font-medium">{selectedMatch.pet?.age ? `${selectedMatch.pet.age} años` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Dueño</Label>
                      <p className="font-medium">{selectedMatch.owner?.full_name || 'N/A'}</p>
                      {selectedMatch.owner?.phone && (
                        <p className="text-sm text-gray-500">{selectedMatch.owner.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Pet 2 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Mascota 2</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedMatch.potential_partner?.image_url && (
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={selectedMatch.potential_partner.image_url}
                          alt={selectedMatch.potential_partner.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-600">Nombre</Label>
                        <p className="font-medium">{selectedMatch.potential_partner?.name || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">Especie</Label>
                          <p className="font-medium">{selectedMatch.potential_partner?.species || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Raza</Label>
                          <p className="font-medium">{selectedMatch.potential_partner?.breed || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Edad</Label>
                          <p className="font-medium">{selectedMatch.potential_partner?.age ? `${selectedMatch.potential_partner.age} años` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Dueño</Label>
                      <p className="font-medium">{selectedMatch.partner_owner?.full_name || 'N/A'}</p>
                      {selectedMatch.partner_owner?.phone && (
                        <p className="text-sm text-gray-500">{selectedMatch.partner_owner.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Solicitud Enviada:</span>
                    <span className="text-sm">{format(new Date(selectedMatch.created_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Última Actualización:</span>
                    <span className="text-sm">{format(new Date(selectedMatch.updated_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminBreedingMatchesPage;

