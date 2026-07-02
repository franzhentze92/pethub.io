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
  Activity,
  Search,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  User,
  Clock,
  Flame,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Heart
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExerciseRecord {
  id: string;
  pet_id: string;
  owner_id: string;
  exercise_type: string;
  duration_minutes: number;
  intensity: string;
  date: string;
  notes?: string | null;
  calories_burned: number;
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

interface ExerciseStats {
  totalRecords: number;
  recordsThisMonth: number;
  totalDuration: number;
  avgDuration: number;
  totalCalories: number;
  avgCalories: number;
  uniqueExerciseTypes: number;
  avgIntensity: string;
}

const AdminExerciseRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ExerciseRecord | null>(null);
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [stats, setStats] = useState<ExerciseStats>({
    totalRecords: 0,
    recordsThisMonth: 0,
    totalDuration: 0,
    avgDuration: 0,
    totalCalories: 0,
    avgCalories: 0,
    uniqueExerciseTypes: 0,
    avgIntensity: 'medium'
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string>('all');
  const [intensityFilter, setIntensityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'calories' | 'exercise_type' | 'intensity' | 'pet' | 'owner'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'date' | 'duration' | 'calories' | 'exercise_type' | 'intensity' | 'pet' | 'owner') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'duration' | 'calories' | 'exercise_type' | 'intensity' | 'pet' | 'owner') => {
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
    loadExerciseRecords();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...records];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.exercise_type?.toLowerCase().includes(searchLower) ||
        record.intensity?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower) ||
        record.pet?.name?.toLowerCase().includes(searchLower) ||
        record.owner?.full_name?.toLowerCase().includes(searchLower) ||
        record.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply exercise type filter
    if (exerciseTypeFilter !== 'all') {
      filtered = filtered.filter(record => record.exercise_type === exerciseTypeFilter);
    }

    // Apply intensity filter
    if (intensityFilter !== 'all') {
      filtered = filtered.filter(record => record.intensity === intensityFilter);
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
        case 'duration':
          comparison = (a.duration_minutes || 0) - (b.duration_minutes || 0);
          break;
        case 'calories':
          comparison = (a.calories_burned || 0) - (b.calories_burned || 0);
          break;
        case 'exercise_type':
          comparison = (a.exercise_type || '').localeCompare(b.exercise_type || '');
          break;
        case 'intensity':
          comparison = (a.intensity || '').localeCompare(b.intensity || '');
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
  }, [records, searchTerm, exerciseTypeFilter, intensityFilter, dateFilter, sortBy, sortOrder]);

  const loadExerciseRecords = async () => {
    try {
      setLoading(true);

      console.log('Loading exercise records...');

      // Load all exercise records
      const { data: recordsData, error: recordsError } = await supabase
        .from('exercise_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (recordsError) {
        console.error('Error loading exercise records:', recordsError);
        console.error('Error details:', JSON.stringify(recordsError, null, 2));
        setRecords([]);
        setStats({
          totalRecords: 0,
          recordsThisMonth: 0,
          totalDuration: 0,
          avgDuration: 0,
          totalCalories: 0,
          avgCalories: 0,
          uniqueExerciseTypes: 0,
          avgIntensity: 'medium'
        });
        return;
      }

      console.log('Exercise records loaded (raw):', recordsData?.length || 0);

      if (!recordsData || recordsData.length === 0) {
        console.warn('No exercise records found in database');
        setRecords([]);
        setStats({
          totalRecords: 0,
          recordsThisMonth: 0,
          totalDuration: 0,
          avgDuration: 0,
          totalCalories: 0,
          avgCalories: 0,
          uniqueExerciseTypes: 0,
          avgIntensity: 'medium'
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
      
      const totalDuration = recordsWithDetails.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
      const avgDuration = recordsWithDetails.length > 0 
        ? totalDuration / recordsWithDetails.length
        : 0;

      const totalCalories = recordsWithDetails.reduce((sum, r) => sum + (r.calories_burned || 0), 0);
      const avgCalories = recordsWithDetails.length > 0 
        ? totalCalories / recordsWithDetails.length
        : 0;

      const uniqueExerciseTypes = new Set(recordsWithDetails.map(r => r.exercise_type?.toLowerCase()).filter(Boolean)).size;
      
      // Calculate average intensity
      const intensityCounts: Record<string, number> = { low: 0, medium: 0, high: 0 };
      recordsWithDetails.forEach(r => {
        if (r.intensity && intensityCounts.hasOwnProperty(r.intensity.toLowerCase())) {
          intensityCounts[r.intensity.toLowerCase()]++;
        }
      });
      const maxIntensity = Object.entries(intensityCounts).reduce((a, b) => 
        intensityCounts[a[0]] > intensityCounts[b[0]] ? a : b
      );
      const avgIntensity = maxIntensity[0] || 'medium';

      setStats({
        totalRecords: recordsWithDetails.length,
        recordsThisMonth,
        totalDuration,
        avgDuration: Math.round(avgDuration * 10) / 10,
        totalCalories,
        avgCalories: Math.round(avgCalories * 10) / 10,
        uniqueExerciseTypes,
        avgIntensity
      });

    } catch (error) {
      console.error('Error loading exercise records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: ExerciseRecord) => {
    setSelectedRecord(record);
    setShowRecordDetails(true);
  };

  const getExerciseTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'walk': 'Caminata',
      'run': 'Carrera',
      'play': 'Juego',
      'swimming': 'Natación',
      'agility': 'Agilidad',
      'training': 'Entrenamiento',
      'fetch': 'Buscar Pelota',
      'hiking': 'Senderismo',
      'tug': 'Tirar de la Cuerda',
      'hide': 'Buscar y Encontrar',
      'obstacle': 'Carrera de Obstáculos',
      'other': 'Otro'
    };
    return typeMap[type?.toLowerCase()] || type || 'Sin tipo';
  };

  const getIntensityLabel = (intensity: string) => {
    const intensityMap: Record<string, string> = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta'
    };
    return intensityMap[intensity?.toLowerCase()] || intensity || 'Sin intensidad';
  };

  const getIntensityColor = (intensity: string) => {
    const colorMap: Record<string, string> = {
      'low': 'bg-green-100 text-green-800 border-green-300',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'high': 'bg-red-100 text-red-800 border-red-300'
    };
    return colorMap[intensity?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Fecha', 'Tipo de Ejercicio', 'Mascota', 'Especie', 'Dueño', 'Teléfono Dueño',
      'Duración (min)', 'Intensidad', 'Calorías Quemadas', 'Notas', 'Fecha Registro'
    ];
    const data = filteredRecords.map(record => [
      record.id.slice(0, 8),
      format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
      getExerciseTypeLabel(record.exercise_type),
      record.pet?.name || 'N/A',
      record.pet?.species || 'N/A',
      record.owner?.full_name || 'N/A',
      record.owner?.phone || 'N/A',
      record.duration_minutes || 0,
      getIntensityLabel(record.intensity),
      record.calories_burned || 0,
      record.notes || 'N/A',
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
    link.setAttribute('download', `registros_ejercicio_pethub_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  // Get unique exercise types for filter
  const uniqueExerciseTypes = Array.from(new Set(records.map(r => r.exercise_type).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="exercise" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando registros de ejercicio…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="exercise" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader
            title="Registros de Ejercicio"
            subtitle="Administra todos los registros de ejercicio de la plataforma"
            gradient="from-green-600 to-emerald-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadExerciseRecords}
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
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalRecords}</div>
                <div className="text-sm opacity-90">Total de Registros</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.recordsThisMonth}</div>
                <div className="text-sm opacity-90">Este Mes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{Math.round(stats.totalDuration)}</div>
                <div className="text-sm opacity-90">Minutos Totales</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Flame className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{Math.round(stats.totalCalories)}</div>
                <div className="text-sm opacity-90">Calorías Totales</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Duración Promedio</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.avgDuration} min</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Calorías Promedio</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.avgCalories}</p>
                  </div>
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tipos de Ejercicio</p>
                    <p className="text-2xl font-bold text-green-600">{stats.uniqueExerciseTypes}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Intensidad Promedio</p>
                    <p className="text-2xl font-bold text-purple-600 capitalize">{getIntensityLabel(stats.avgIntensity)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
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
                      placeholder="Buscar por tipo de ejercicio, intensidad, mascota, dueño..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Exercise Type Filter */}
                <div>
                  <select
                    value={exerciseTypeFilter}
                    onChange={(e) => setExerciseTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">Todos los Tipos</option>
                    {uniqueExerciseTypes.map(type => (
                      <option key={type} value={type}>{getExerciseTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>

                {/* Intensity Filter */}
                <div>
                  <select
                    value={intensityFilter}
                    onChange={(e) => setIntensityFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">Todas las Intensidades</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="date-desc">Más Recientes</option>
                    <option value="date-asc">Más Antiguos</option>
                    <option value="duration-desc">Mayor Duración</option>
                    <option value="duration-asc">Menor Duración</option>
                    <option value="calories-desc">Más Calorías</option>
                    <option value="calories-asc">Menos Calorías</option>
                    <option value="exercise_type-asc">Tipo A-Z</option>
                    <option value="exercise_type-desc">Tipo Z-A</option>
                    <option value="intensity-asc">Intensidad A-Z</option>
                    <option value="intensity-desc">Intensidad Z-A</option>
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
                <CardTitle>Registros de Ejercicio ({filteredRecords.length} de {stats.totalRecords})</CardTitle>
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
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('exercise_type')} className="px-2 py-0 h-auto">
                            Tipo {getSortIcon('exercise_type')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('duration')} className="px-2 py-0 h-auto">
                            Duración {getSortIcon('duration')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('intensity')} className="px-2 py-0 h-auto">
                            Intensidad {getSortIcon('intensity')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('calories')} className="px-2 py-0 h-auto">
                            Calorías {getSortIcon('calories')}
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
                              {getExerciseTypeLabel(record.exercise_type)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">{record.duration_minutes || 0} min</td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={`text-xs ${getIntensityColor(record.intensity)}`}>
                              {getIntensityLabel(record.intensity)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-semibold text-orange-600">
                              {record.calories_burned || 0} cal
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
                  <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || exerciseTypeFilter !== 'all' || intensityFilter !== 'all' || dateFilter !== 'all'
                      ? 'No se encontraron registros con los filtros aplicados'
                      : 'No hay registros de ejercicio'}
                  </p>
                  {(searchTerm || exerciseTypeFilter !== 'all' || intensityFilter !== 'all' || dateFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => { 
                        setSearchTerm(''); 
                        setExerciseTypeFilter('all'); 
                        setIntensityFilter('all');
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

      {/* Record Details Modal */}
      {selectedRecord && (
        <Dialog open={showRecordDetails} onOpenChange={setShowRecordDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-green-700">
                Detalles del Registro de Ejercicio
              </DialogTitle>
              <DialogDescription>
                Información completa sobre la sesión de ejercicio.
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

              {/* Exercise Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detalles del Ejercicio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Fecha</Label>
                      <p className="font-medium">{format(new Date(selectedRecord.date), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Tipo de Ejercicio</Label>
                      <Badge variant="outline">{getExerciseTypeLabel(selectedRecord.exercise_type)}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Duración</Label>
                      <p className="font-medium">{selectedRecord.duration_minutes || 0} minutos</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Intensidad</Label>
                      <Badge variant="outline" className={getIntensityColor(selectedRecord.intensity)}>
                        {getIntensityLabel(selectedRecord.intensity)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Calorías Quemadas</Label>
                      <p className="font-medium text-orange-600">
                        {selectedRecord.calories_burned || 0} calorías
                      </p>
                    </div>
                  </div>
                  {selectedRecord.notes && (
                    <div>
                      <Label className="text-xs text-gray-600">Notas</Label>
                      <p className="text-sm mt-1">{selectedRecord.notes}</p>
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

export default AdminExerciseRecordsPage;

