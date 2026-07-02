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
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdoptionApplication {
  id: string;
  pet_id: string;
  applicant_id: string;
  message?: string | null;
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
    shelter_id?: string | null;
  } | null;
  applicant?: {
    full_name: string | null;
    phone: string | null;
    email?: string | null;
  } | null;
  shelter?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

interface AdoptionStats {
  totalApplications: number;
  applicationsThisMonth: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  uniqueApplicants: number;
  uniqueShelters: number;
  uniquePets: number;
}

const AdminAdoptionApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<AdoptionApplication | null>(null);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [stats, setStats] = useState<AdoptionStats>({
    totalApplications: 0,
    applicationsThisMonth: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    uniqueApplicants: 0,
    uniqueShelters: 0,
    uniquePets: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'pet' | 'applicant' | 'shelter'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'date' | 'status' | 'pet' | 'applicant' | 'shelter') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'status' | 'pet' | 'applicant' | 'shelter') => {
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
    loadAdoptionApplications();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...applications];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(application =>
        application.pet?.name?.toLowerCase().includes(searchLower) ||
        application.applicant?.full_name?.toLowerCase().includes(searchLower) ||
        application.shelter?.name?.toLowerCase().includes(searchLower) ||
        application.message?.toLowerCase().includes(searchLower) ||
        application.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(application => application.status === statusFilter);
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
      
      filtered = filtered.filter(application => new Date(application.created_at) >= startDate);
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
        case 'applicant':
          comparison = (a.applicant?.full_name || '').localeCompare(b.applicant?.full_name || '');
          break;
        case 'shelter':
          comparison = (a.shelter?.name || '').localeCompare(b.shelter?.name || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter, dateFilter, sortBy, sortOrder]);

  const loadAdoptionApplications = async () => {
    try {
      setLoading(true);

      console.log('Loading adoption applications...');

      // Load all adoption applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('adoption_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (applicationsError) {
        console.error('Error loading adoption applications:', applicationsError);
        console.error('Error details:', JSON.stringify(applicationsError, null, 2));
        setApplications([]);
        setStats({
          totalApplications: 0,
          applicationsThisMonth: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          rejectedApplications: 0,
          uniqueApplicants: 0,
          uniqueShelters: 0,
          uniquePets: 0
        });
        return;
      }

      console.log('Adoption applications loaded (raw):', applicationsData?.length || 0);

      if (!applicationsData || applicationsData.length === 0) {
        console.warn('No adoption applications found in database');
        setApplications([]);
        setStats({
          totalApplications: 0,
          applicationsThisMonth: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          rejectedApplications: 0,
          uniqueApplicants: 0,
          uniqueShelters: 0,
          uniquePets: 0
        });
        return;
      }

      // Get unique IDs
      const petIds = [...new Set((applicationsData || []).map(a => a.pet_id).filter(Boolean))];
      const applicantIds = [...new Set((applicationsData || []).map(a => a.applicant_id).filter(Boolean))];
      console.log('Pet IDs to fetch:', petIds.length);
      console.log('Applicant IDs to fetch:', applicantIds.length);

      // Load pet information (including shelter_id)
      let petsData: any[] = [];
      if (petIds.length > 0) {
        const { data, error: petsError } = await supabase
          .from('adoption_pets')
          .select('id, name, species, breed, age, image_url, shelter_id')
          .in('id', petIds);

        if (petsError) {
          console.error('Error loading pet information:', petsError);
        } else {
          petsData = data || [];
          console.log('Pets loaded:', petsData.length);
        }
      }

      // Get unique shelter IDs from pets
      const shelterIds = [...new Set((petsData || []).map(p => p.shelter_id).filter(Boolean))];
      console.log('Shelter IDs to fetch:', shelterIds.length);

      // Load applicant information
      let applicantsData: any[] = [];
      if (applicantIds.length > 0) {
        const { data, error: applicantsError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', applicantIds);

        if (applicantsError) {
          console.error('Error loading applicant information:', applicantsError);
        } else {
          applicantsData = data || [];
          console.log('Applicants loaded:', applicantsData.length);
        }
      }

      // Load shelter information
      let sheltersData: any[] = [];
      if (shelterIds.length > 0) {
        const { data, error: sheltersError } = await supabase
          .from('shelters')
          .select('id, name, email, phone')
          .in('id', shelterIds);

        if (sheltersError) {
          console.error('Error loading shelter information:', sheltersError);
        } else {
          sheltersData = data || [];
          console.log('Shelters loaded:', sheltersData.length);
        }
      }

      // Create maps for quick lookup
      const petsMap = new Map(
        petsData.map(pet => [pet.id, pet])
      );
      const applicantsMap = new Map(
        applicantsData.map(applicant => [applicant.user_id, applicant])
      );
      const sheltersMap = new Map(
        sheltersData.map(shelter => [shelter.id, shelter])
      );

      // Map applications with related info
      const applicationsWithDetails = (applicationsData || []).map(application => {
        const pet = petsMap.get(application.pet_id) || null;
        const shelterId = pet?.shelter_id;
        return {
          ...application,
          pet: pet,
          applicant: applicantsMap.get(application.applicant_id) || null,
          shelter: shelterId ? sheltersMap.get(shelterId) || null : null
        };
      });

      console.log('Applications with details:', applicationsWithDetails.length);

      setApplications(applicationsWithDetails);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const applicationsThisMonth = applicationsWithDetails.filter(a => 
        new Date(a.created_at) >= startOfMonth
      ).length;
      
      const pendingApplications = applicationsWithDetails.filter(a => a.status === 'pending').length;
      const approvedApplications = applicationsWithDetails.filter(a => a.status === 'approved').length;
      const rejectedApplications = applicationsWithDetails.filter(a => a.status === 'rejected').length;

      const uniqueApplicants = new Set(applicationsWithDetails.map(a => a.applicant_id).filter(Boolean)).size;
      const uniqueShelters = new Set(applicationsWithDetails.map(a => a.pet?.shelter_id).filter(Boolean)).size;
      const uniquePets = new Set(applicationsWithDetails.map(a => a.pet_id).filter(Boolean)).size;

      setStats({
        totalApplications: applicationsWithDetails.length,
        applicationsThisMonth,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        uniqueApplicants,
        uniqueShelters,
        uniquePets
      });

    } catch (error) {
      console.error('Error loading adoption applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (application: AdoptionApplication) => {
    setSelectedApplication(application);
    setShowApplicationDetails(true);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'approved': 'Aprobada',
      'rejected': 'Rechazada'
    };
    return statusMap[status?.toLowerCase()] || status || 'Sin estatus';
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300'
    };
    return colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Fecha', 'Estatus', 'Mascota', 'Especie', 'Raza', 'Edad',
      'Solicitante', 'Teléfono Solicitante', 'Refugio', 'Teléfono Refugio',
      'Mensaje', 'Fecha Actualización'
    ];
    const data = filteredApplications.map(application => [
      application.id.slice(0, 8),
      format(new Date(application.created_at), 'dd/MM/yyyy', { locale: es }),
      getStatusLabel(application.status),
      application.pet?.name || 'N/A',
      application.pet?.species || 'N/A',
      application.pet?.breed || 'N/A',
      application.pet?.age || 'N/A',
      application.applicant?.full_name || 'N/A',
      application.applicant?.phone || 'N/A',
      application.shelter?.name || 'N/A',
      application.shelter?.phone || 'N/A',
      application.message || 'N/A',
      format(new Date(application.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `solicitudes_adopcion_pethub_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="adoptions" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando solicitudes de adopción…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="adoptions" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader
            title="Solicitudes de Adopción"
            subtitle="Administra todas las solicitudes de adopción de la plataforma"
            gradient="from-purple-600 to-indigo-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadAdoptionApplications}
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
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalApplications}</div>
                <div className="text-sm opacity-90">Total de Solicitudes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.pendingApplications}</div>
                <div className="text-sm opacity-90">Pendientes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.approvedApplications}</div>
                <div className="text-sm opacity-90">Aprobadas</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.rejectedApplications}</div>
                <div className="text-sm opacity-90">Rechazadas</div>
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
                    <p className="text-2xl font-bold text-purple-600">{stats.applicationsThisMonth}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Solicitantes Únicos</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.uniqueApplicants}</p>
                  </div>
                  <User className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Refugios Únicos</p>
                    <p className="text-2xl font-bold text-indigo-600">{stats.uniqueShelters}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Mascotas Únicas</p>
                    <p className="text-2xl font-bold text-pink-600">{stats.uniquePets}</p>
                  </div>
                  <Heart className="w-8 h-8 text-pink-500" />
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
                      placeholder="Buscar por mascota, solicitante, refugio, mensaje..."
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos los Estatus</option>
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="date-desc">Más Recientes</option>
                    <option value="date-asc">Más Antiguos</option>
                    <option value="status-asc">Estatus A-Z</option>
                    <option value="status-desc">Estatus Z-A</option>
                    <option value="pet-asc">Mascota A-Z</option>
                    <option value="pet-desc">Mascota Z-A</option>
                    <option value="applicant-asc">Solicitante A-Z</option>
                    <option value="applicant-desc">Solicitante Z-A</option>
                    <option value="shelter-asc">Refugio A-Z</option>
                    <option value="shelter-desc">Refugio Z-A</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Solicitudes de Adopción ({filteredApplications.length} de {stats.totalApplications})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredApplications.length} solicitudes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredApplications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Mascota</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('applicant')} className="px-2 py-0 h-auto">
                            Solicitante {getSortIcon('applicant')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('shelter')} className="px-2 py-0 h-auto">
                            Refugio {getSortIcon('shelter')}
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
                      {filteredApplications.map((application) => (
                        <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {application.pet?.image_url ? (
                                <img
                                  src={application.pet.image_url}
                                  alt={application.pet.name}
                                  className="w-10 h-10 object-cover rounded-full border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                  <Heart className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{application.pet?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                  {application.pet?.species || 'N/A'}
                                  {application.pet?.breed && ` • ${application.pet.breed}`}
                                  {application.pet?.age && ` • ${application.pet.age} años`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{application.applicant?.full_name || 'N/A'}</p>
                            {application.applicant?.phone && (
                              <p className="text-xs text-gray-500">{application.applicant.phone}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{application.shelter?.name || 'N/A'}</p>
                            {application.shelter?.phone && (
                              <p className="text-xs text-gray-500">{application.shelter.phone}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${getStatusColor(application.status)}`}>
                              {getStatusIcon(application.status)}
                              {getStatusLabel(application.status)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {format(new Date(application.created_at), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="py-4 px-4">
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(application)}>
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
                      : 'No hay solicitudes de adopción'}
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

      {/* Application Details Modal */}
      {selectedApplication && (
        <Dialog open={showApplicationDetails} onOpenChange={setShowApplicationDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-purple-700">
                Detalles de la Solicitud de Adopción
              </DialogTitle>
              <DialogDescription>
                Información completa sobre la solicitud de adopción.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                <Badge variant="outline" className={`text-base px-4 py-2 flex items-center gap-2 ${getStatusColor(selectedApplication.status)}`}>
                  {getStatusIcon(selectedApplication.status)}
                  {getStatusLabel(selectedApplication.status)}
                </Badge>
              </div>

              {/* Pet Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de la Mascota</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-4">
                    {selectedApplication.pet?.image_url && (
                      <img
                        src={selectedApplication.pet.image_url}
                        alt={selectedApplication.pet.name}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">Nombre</Label>
                          <p className="font-medium">{selectedApplication.pet?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Especie</Label>
                          <p className="font-medium">{selectedApplication.pet?.species || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Raza</Label>
                          <p className="font-medium">{selectedApplication.pet?.breed || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Edad</Label>
                          <p className="font-medium">{selectedApplication.pet?.age ? `${selectedApplication.pet.age} años` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Applicant Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información del Solicitante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-600">Nombre Completo</Label>
                    <p className="font-medium">{selectedApplication.applicant?.full_name || 'N/A'}</p>
                  </div>
                  {selectedApplication.applicant?.phone && (
                    <div>
                      <Label className="text-xs text-gray-600">Teléfono</Label>
                      <p className="text-sm">{selectedApplication.applicant.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shelter Info */}
              {selectedApplication.shelter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información del Refugio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Nombre</Label>
                      <p className="font-medium">{selectedApplication.shelter.name || 'N/A'}</p>
                    </div>
                    {selectedApplication.shelter.phone && (
                      <div>
                        <Label className="text-xs text-gray-600">Teléfono</Label>
                        <p className="text-sm">{selectedApplication.shelter.phone}</p>
                      </div>
                    )}
                    {selectedApplication.shelter.email && (
                      <div>
                        <Label className="text-xs text-gray-600">Email</Label>
                        <p className="text-sm">{selectedApplication.shelter.email}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Message */}
              {selectedApplication.message && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Mensaje del Solicitante
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedApplication.message}</p>
                  </CardContent>
                </Card>
              )}

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Solicitud Enviada:</span>
                    <span className="text-sm">{format(new Date(selectedApplication.created_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Última Actualización:</span>
                    <span className="text-sm">{format(new Date(selectedApplication.updated_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
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

export default AdminAdoptionApplicationsPage;

