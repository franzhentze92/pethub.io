import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Stethoscope,
  Search,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
  User,
  Building2,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Activity,
  Heart
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAppointmentTypeLabel } from '@/lib/veterinaryTypes';

interface VeterinaryRecord {
  id: string;
  pet_id: string;
  owner_id: string;
  appointment_type: string;
  date: string;
  veterinarian_name: string;
  veterinary_clinic?: string | null;
  diagnosis: string;
  treatment?: string | null;
  notes?: string | null;
  prescription?: string | null;
  follow_up_date?: string | null;
  cost?: number | null;
  pdf_url?: string | null;
  invoice_url?: string | null;
  created_at: string;
  pet?: {
    name: string;
    species: string;
    breed?: string | null;
    image_url?: string | null;
  } | null;
  owner?: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface VeterinaryStats {
  totalRecords: number;
  recordsThisMonth: number;
  totalCost: number;
  avgCost: number;
  totalVeterinarians: number;
  totalClinics: number;
  recordsWithFollowUp: number;
}

const AdminVeterinaryRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<VeterinaryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<VeterinaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<VeterinaryRecord | null>(null);
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [stats, setStats] = useState<VeterinaryStats>({
    totalRecords: 0,
    recordsThisMonth: 0,
    totalCost: 0,
    avgCost: 0,
    totalVeterinarians: 0,
    totalClinics: 0,
    recordsWithFollowUp: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'veterinarian' | 'clinic' | 'pet' | 'owner'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'date' | 'cost' | 'veterinarian' | 'clinic' | 'pet' | 'owner') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'cost' | 'veterinarian' | 'clinic' | 'pet' | 'owner') => {
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
    loadVeterinaryRecords();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...records];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.veterinarian_name?.toLowerCase().includes(searchLower) ||
        record.veterinary_clinic?.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower) ||
        record.treatment?.toLowerCase().includes(searchLower) ||
        record.pet?.name?.toLowerCase().includes(searchLower) ||
        record.owner?.full_name?.toLowerCase().includes(searchLower) ||
        record.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply appointment type filter
    if (appointmentTypeFilter !== 'all') {
      filtered = filtered.filter(record => record.appointment_type === appointmentTypeFilter);
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
      
      filtered = filtered.filter(record => new Date(record.date) >= startDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'cost':
          comparison = (a.cost || 0) - (b.cost || 0);
          break;
        case 'veterinarian':
          comparison = (a.veterinarian_name || '').localeCompare(b.veterinarian_name || '');
          break;
        case 'clinic':
          comparison = (a.veterinary_clinic || '').localeCompare(b.veterinary_clinic || '');
          break;
        case 'pet':
          comparison = (a.pet?.name || '').localeCompare(b.pet?.name || '');
          break;
        case 'owner':
          comparison = (a.owner?.full_name || '').localeCompare(b.owner?.full_name || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredRecords(filtered);
  }, [records, searchTerm, appointmentTypeFilter, dateFilter, sortBy, sortOrder]);

  const loadVeterinaryRecords = async () => {
    try {
      setLoading(true);

      console.log('Loading veterinary records...');

      // First, try to load all veterinary records without joins to check RLS
      const { data: recordsData, error: recordsError } = await supabase
        .from('veterinary_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (recordsError) {
        console.error('Error loading veterinary records:', recordsError);
        console.error('Error details:', JSON.stringify(recordsError, null, 2));
        setRecords([]);
        setStats({
          totalRecords: 0,
          recordsThisMonth: 0,
          totalCost: 0,
          avgCost: 0,
          totalVeterinarians: 0,
          totalClinics: 0,
          recordsWithFollowUp: 0
        });
        return;
      }

      console.log('Veterinary records loaded (raw):', recordsData?.length || 0);
      console.log('Sample record:', recordsData?.[0]);

      if (!recordsData || recordsData.length === 0) {
        console.warn('No veterinary records found in database');
        setRecords([]);
        setStats({
          totalRecords: 0,
          recordsThisMonth: 0,
          totalCost: 0,
          avgCost: 0,
          totalVeterinarians: 0,
          totalClinics: 0,
          recordsWithFollowUp: 0
        });
        return;
      }

      // Get unique pet IDs and owner IDs
      const petIds = [...new Set((recordsData || []).map(r => r.pet_id).filter(Boolean))];
      const ownerIds = [...new Set((recordsData || []).map(r => r.owner_id).filter(Boolean))];
      console.log('Pet IDs to fetch:', petIds.length);
      console.log('Owner IDs to fetch:', ownerIds.length);

      // Load pet information
      let petsData: any[] = [];
      if (petIds.length > 0) {
        const { data, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, breed, image_url')
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

      // Map records with pet and owner info
      const recordsWithDetails = (recordsData || []).map(record => ({
        ...record,
        pet: petsMap.get(record.pet_id) || null,
        owner: ownersMap.get(record.owner_id) || null
      }));

      console.log('Records with details:', recordsWithDetails.length);

      setRecords(recordsWithDetails);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const recordsThisMonth = recordsWithDetails.filter(r => 
        new Date(r.date) >= startOfMonth
      ).length;
      
      const totalCost = recordsWithDetails.reduce((sum, r) => sum + (r.cost || 0), 0);
      const avgCost = recordsWithDetails.length > 0 
        ? totalCost / recordsWithDetails.length
        : 0;

      const uniqueVeterinarians = new Set(recordsWithDetails.map(r => r.veterinarian_name?.toLowerCase()).filter(Boolean)).size;
      const uniqueClinics = new Set(recordsWithDetails.map(r => r.veterinary_clinic?.toLowerCase()).filter(Boolean)).size;
      const recordsWithFollowUp = recordsWithDetails.filter(r => r.follow_up_date).length;

      setStats({
        totalRecords: recordsWithDetails.length,
        recordsThisMonth,
        totalCost,
        avgCost: Math.round(avgCost * 100) / 100,
        totalVeterinarians: uniqueVeterinarians,
        totalClinics: uniqueClinics,
        recordsWithFollowUp
      });

    } catch (error) {
      console.error('Error loading veterinary records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: VeterinaryRecord) => {
    setSelectedRecord(record);
    setShowRecordDetails(true);
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Fecha', 'Tipo de Cita', 'Mascota', 'Especie', 'Dueño', 'Teléfono Dueño',
      'Veterinario', 'Clínica', 'Diagnóstico', 'Tratamiento', 'Prescripción',
      'Costo', 'Fecha Seguimiento', 'Fecha Registro'
    ];
    const data = filteredRecords.map(record => [
      record.id.slice(0, 8),
      format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
      getAppointmentTypeLabel(record.appointment_type),
      record.pet?.name || 'N/A',
      record.pet?.species || 'N/A',
      record.owner?.full_name || 'N/A',
      record.owner?.phone || 'N/A',
      record.veterinarian_name || 'N/A',
      record.veterinary_clinic || 'N/A',
      record.diagnosis || 'N/A',
      record.treatment || 'N/A',
      record.prescription || 'N/A',
      record.cost || 0,
      record.follow_up_date ? format(new Date(record.follow_up_date), 'dd/MM/yyyy', { locale: es }) : 'N/A',
      format(new Date(record.created_at), 'dd/MM/yyyy HH:mm', { locale: es })
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `registros_veterinarios_pethub_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  // Get unique appointment types for filter
  const uniqueAppointmentTypes = Array.from(new Set(records.map(r => r.appointment_type).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="veterinary" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando registros veterinarios…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="veterinary" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader
            title="Registros Veterinarios"
            subtitle="Administra todos los registros veterinarios de la plataforma"
            gradient="from-red-600 to-pink-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadVeterinaryRecords}
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
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Stethoscope className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalRecords}</div>
                <div className="text-sm opacity-90">Total de Registros</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.recordsThisMonth}</div>
                <div className="text-sm opacity-90">Este Mes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{stats.totalCost.toFixed(2)}</div>
                <div className="text-sm opacity-90">Costo Total</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{stats.avgCost.toFixed(2)}</div>
                <div className="text-sm opacity-90">Promedio por Visita</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Veterinarios Únicos</p>
                    <p className="text-2xl font-bold text-red-600">{stats.totalVeterinarians}</p>
                  </div>
                  <User className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Clínicas Únicas</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalClinics}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Con Seguimiento</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.recordsWithFollowUp}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
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
                      placeholder="Buscar por veterinario, clínica, diagnóstico, mascota, dueño..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Appointment Type Filter */}
                <div>
                  <select
                    value={appointmentTypeFilter}
                    onChange={(e) => setAppointmentTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">Todos los Tipos</option>
                    {uniqueAppointmentTypes.map(type => (
                      <option key={type} value={type}>{getAppointmentTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="date-desc">Más Recientes</option>
                    <option value="date-asc">Más Antiguos</option>
                    <option value="cost-desc">Mayor Costo</option>
                    <option value="cost-asc">Menor Costo</option>
                    <option value="veterinarian-asc">Veterinario A-Z</option>
                    <option value="veterinarian-desc">Veterinario Z-A</option>
                    <option value="clinic-asc">Clínica A-Z</option>
                    <option value="clinic-desc">Clínica Z-A</option>
                    <option value="pet-asc">Mascota A-Z</option>
                    <option value="pet-desc">Mascota Z-A</option>
                    <option value="owner-asc">Dueño A-Z</option>
                    <option value="owner-desc">Dueño Z-A</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registros Veterinarios ({filteredRecords.length} de {stats.totalRecords})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredRecords.length} registros
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Mascota</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Dueño</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('date')} className="px-2 py-0 h-auto">
                            Fecha {getSortIcon('date')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Tipo</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('veterinarian')} className="px-2 py-0 h-auto">
                            Veterinario {getSortIcon('veterinarian')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('clinic')} className="px-2 py-0 h-auto">
                            Clínica {getSortIcon('clinic')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Diagnóstico</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('cost')} className="px-2 py-0 h-auto">
                            Costo {getSortIcon('cost')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {record.pet?.image_url ? (
                                <img
                                  src={record.pet.image_url}
                                  alt={record.pet.name}
                                  className="w-10 h-10 object-cover rounded-full border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200">
                                  <Heart className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{record.pet?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{record.pet?.species || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{record.owner?.full_name || 'N/A'}</p>
                            {record.owner?.phone && (
                              <p className="text-xs text-gray-500">{record.owner.phone}</p>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {format(new Date(record.date), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="text-xs">
                              {getAppointmentTypeLabel(record.appointment_type)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">{record.veterinarian_name || 'N/A'}</td>
                          <td className="py-4 px-4 text-sm text-gray-700">{record.veterinary_clinic || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">
                              {record.diagnosis || 'N/A'}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-semibold text-green-600">
                              {record.cost ? `Q${record.cost.toFixed(2)}` : 'N/A'}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(record)}>
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
                  <Stethoscope className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || appointmentTypeFilter !== 'all' || dateFilter !== 'all'
                      ? 'No se encontraron registros con los filtros aplicados'
                      : 'No hay registros veterinarios'}
                  </p>
                  {(searchTerm || appointmentTypeFilter !== 'all' || dateFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => { setSearchTerm(''); setAppointmentTypeFilter('all'); setDateFilter('all'); }}
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

      {/* Record Details Modal */}
      {selectedRecord && (
        <Dialog open={showRecordDetails} onOpenChange={setShowRecordDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-red-700">
                Detalles del Registro Veterinario
              </DialogTitle>
              <DialogDescription>
                Información completa sobre la visita veterinaria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Pet and Owner Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Mascota y Dueño</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Mascota</Label>
                      <p className="font-medium">{selectedRecord.pet?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{selectedRecord.pet?.species} {selectedRecord.pet?.breed ? `- ${selectedRecord.pet.breed}` : ''}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Dueño</Label>
                      <p className="font-medium">{selectedRecord.owner?.full_name || 'N/A'}</p>
                      {selectedRecord.owner?.phone && (
                        <p className="text-xs text-gray-500">{selectedRecord.owner.phone}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detalles de la Cita</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Fecha</Label>
                      <p className="font-medium">{format(new Date(selectedRecord.date), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Tipo de Cita</Label>
                      <Badge variant="outline">{getAppointmentTypeLabel(selectedRecord.appointment_type)}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Veterinario</Label>
                      <p className="font-medium">{selectedRecord.veterinarian_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Clínica</Label>
                      <p className="font-medium">{selectedRecord.veterinary_clinic || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Costo</Label>
                      <p className="font-medium text-green-600">
                        {selectedRecord.cost ? `Q${selectedRecord.cost.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    {selectedRecord.follow_up_date && (
                      <div>
                        <Label className="text-xs text-gray-600">Fecha de Seguimiento</Label>
                        <p className="font-medium">{format(new Date(selectedRecord.follow_up_date), 'dd MMM yyyy', { locale: es })}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información Médica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-600">Diagnóstico</Label>
                    <p className="text-sm mt-1">{selectedRecord.diagnosis || 'N/A'}</p>
                  </div>
                  {selectedRecord.treatment && (
                    <div>
                      <Label className="text-xs text-gray-600">Tratamiento</Label>
                      <p className="text-sm mt-1">{selectedRecord.treatment}</p>
                    </div>
                  )}
                  {selectedRecord.prescription && (
                    <div>
                      <Label className="text-xs text-gray-600">Prescripción</Label>
                      <p className="text-sm mt-1">{selectedRecord.prescription}</p>
                    </div>
                  )}
                  {selectedRecord.notes && (
                    <div>
                      <Label className="text-xs text-gray-600">Notas</Label>
                      <p className="text-sm mt-1">{selectedRecord.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              {(selectedRecord.pdf_url || selectedRecord.invoice_url) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Documentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedRecord.pdf_url && (
                      <div>
                        <Label className="text-xs text-gray-600">PDF</Label>
                        <a
                          href={selectedRecord.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Ver PDF
                        </a>
                      </div>
                    )}
                    {selectedRecord.invoice_url && (
                      <div>
                        <Label className="text-xs text-gray-600">Factura</Label>
                        <a
                          href={selectedRecord.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Ver Factura
                        </a>
                      </div>
                    )}
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
                    <span className="text-sm text-gray-600">Registrado:</span>
                    <span className="text-sm">{format(new Date(selectedRecord.created_at), 'dd MMM yyyy, hh:mm a', { locale: es })}</span>
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

export default AdminVeterinaryRecordsPage;

