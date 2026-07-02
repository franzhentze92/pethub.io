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
  UtensilsCrossed,
  Search,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  Scale,
  Flame,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Heart,
  Apple
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NutritionRecord {
  id: string;
  pet_id: string;
  owner_id: string;
  date: string;
  meal_type: string;
  food_name: string;
  food_category: string;
  quantity_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  notes?: string | null;
  feeding_time?: string | null;
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

interface NutritionStats {
  totalRecords: number;
  recordsThisMonth: number;
  totalCalories: number;
  avgCalories: number;
  totalQuantity: number;
  avgQuantity: number;
  uniqueFoods: number;
  uniqueMealTypes: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

const AdminNutritionRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<NutritionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<NutritionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<NutritionRecord | null>(null);
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [stats, setStats] = useState<NutritionStats>({
    totalRecords: 0,
    recordsThisMonth: 0,
    totalCalories: 0,
    avgCalories: 0,
    totalQuantity: 0,
    avgQuantity: 0,
    uniqueFoods: 0,
    uniqueMealTypes: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'calories' | 'quantity' | 'meal_type' | 'food_name' | 'pet' | 'owner'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'date' | 'calories' | 'quantity' | 'meal_type' | 'food_name' | 'pet' | 'owner') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'calories' | 'quantity' | 'meal_type' | 'food_name' | 'pet' | 'owner') => {
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
    loadNutritionRecords();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...records];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.food_name?.toLowerCase().includes(searchLower) ||
        record.meal_type?.toLowerCase().includes(searchLower) ||
        record.food_category?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower) ||
        record.pet?.name?.toLowerCase().includes(searchLower) ||
        record.owner?.full_name?.toLowerCase().includes(searchLower) ||
        record.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply meal type filter
    if (mealTypeFilter !== 'all') {
      filtered = filtered.filter(record => record.meal_type === mealTypeFilter);
    }

    // Apply food category filter
    if (foodCategoryFilter !== 'all') {
      filtered = filtered.filter(record => record.food_category === foodCategoryFilter);
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
        case 'calories':
          comparison = (a.total_calories || 0) - (b.total_calories || 0);
          break;
        case 'quantity':
          comparison = (a.quantity_grams || 0) - (b.quantity_grams || 0);
          break;
        case 'meal_type':
          comparison = (a.meal_type || '').localeCompare(b.meal_type || '');
          break;
        case 'food_name':
          comparison = (a.food_name || '').localeCompare(b.food_name || '');
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
  }, [records, searchTerm, mealTypeFilter, foodCategoryFilter, dateFilter, sortBy, sortOrder]);

  const loadNutritionRecords = async () => {
    try {
      setLoading(true);

      console.log('Loading nutrition records...');

      // Load all nutrition records
      const { data: recordsData, error: recordsError } = await supabase
        .from('nutrition_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (recordsError) {
        console.error('Error loading nutrition records:', recordsError);
        console.error('Error details:', JSON.stringify(recordsError, null, 2));
        setRecords([]);
        setStats({
          totalRecords: 0,
          recordsThisMonth: 0,
          totalCalories: 0,
          avgCalories: 0,
          totalQuantity: 0,
          avgQuantity: 0,
          uniqueFoods: 0,
          uniqueMealTypes: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCarbs: 0
        });
        return;
      }

      console.log('Nutrition records loaded (raw):', recordsData?.length || 0);

      if (!recordsData || recordsData.length === 0) {
        console.warn('No nutrition records found in database');
        setRecords([]);
        setStats({
          totalRecords: 0,
          recordsThisMonth: 0,
          totalCalories: 0,
          avgCalories: 0,
          totalQuantity: 0,
          avgQuantity: 0,
          uniqueFoods: 0,
          uniqueMealTypes: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCarbs: 0
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
      
      const totalCalories = recordsWithDetails.reduce((sum, r) => sum + (r.total_calories || 0), 0);
      const avgCalories = recordsWithDetails.length > 0 
        ? totalCalories / recordsWithDetails.length
        : 0;

      const totalQuantity = recordsWithDetails.reduce((sum, r) => sum + (r.quantity_grams || 0), 0);
      const avgQuantity = recordsWithDetails.length > 0 
        ? totalQuantity / recordsWithDetails.length
        : 0;

      const uniqueFoods = new Set(recordsWithDetails.map(r => r.food_name?.toLowerCase()).filter(Boolean)).size;
      const uniqueMealTypes = new Set(recordsWithDetails.map(r => r.meal_type?.toLowerCase()).filter(Boolean)).size;
      
      const totalProtein = recordsWithDetails.reduce((sum, r) => sum + (r.total_protein || 0), 0);
      const totalFat = recordsWithDetails.reduce((sum, r) => sum + (r.total_fat || 0), 0);
      const totalCarbs = recordsWithDetails.reduce((sum, r) => sum + (r.total_carbs || 0), 0);

      setStats({
        totalRecords: recordsWithDetails.length,
        recordsThisMonth,
        totalCalories,
        avgCalories: Math.round(avgCalories * 10) / 10,
        totalQuantity,
        avgQuantity: Math.round(avgQuantity * 10) / 10,
        uniqueFoods,
        uniqueMealTypes,
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10
      });

    } catch (error) {
      console.error('Error loading nutrition records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: NutritionRecord) => {
    setSelectedRecord(record);
    setShowRecordDetails(true);
  };

  const getMealTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'breakfast': 'Desayuno',
      'lunch': 'Almuerzo',
      'dinner': 'Cena',
      'snack': 'Merienda'
    };
    return typeMap[type?.toLowerCase()] || type || 'Sin tipo';
  };

  const getFoodCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      'dry_food': 'Alimento Seco',
      'wet_food': 'Alimento Húmedo',
      'raw': 'Alimento Crudo',
      'homemade': 'Casero',
      'treat': 'Premio',
      'supplement': 'Suplemento',
      'other': 'Otro'
    };
    return categoryMap[category?.toLowerCase()] || category || 'Sin categoría';
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Fecha', 'Hora', 'Tipo de Comida', 'Mascota', 'Especie', 'Dueño', 'Teléfono Dueño',
      'Alimento', 'Categoría', 'Cantidad (g)', 'Calorías', 'Proteína (g)', 'Grasa (g)', 'Carbohidratos (g)', 'Fibra (g)', 'Notas', 'Fecha Registro'
    ];
    const data = filteredRecords.map(record => [
      record.id.slice(0, 8),
      format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
      record.feeding_time || 'N/A',
      getMealTypeLabel(record.meal_type),
      record.pet?.name || 'N/A',
      record.pet?.species || 'N/A',
      record.owner?.full_name || 'N/A',
      record.owner?.phone || 'N/A',
      record.food_name || 'N/A',
      getFoodCategoryLabel(record.food_category),
      record.quantity_grams || 0,
      record.total_calories || 0,
      record.total_protein || 0,
      record.total_fat || 0,
      record.total_carbs || 0,
      record.total_fiber || 0,
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
    link.setAttribute('download', `registros_nutricion_pethub_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  // Get unique meal types and food categories for filters
  const uniqueMealTypes = Array.from(new Set(records.map(r => r.meal_type).filter(Boolean)));
  const uniqueFoodCategories = Array.from(new Set(records.map(r => r.food_category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="nutrition" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando registros de nutrición…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="nutrition" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader
            title="Registros de Nutrición"
            subtitle="Administra todos los registros de nutrición de la plataforma"
            gradient="from-orange-600 to-amber-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadNutritionRecords}
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
                  <UtensilsCrossed className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalRecords}</div>
                <div className="text-sm opacity-90">Total de Registros</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.recordsThisMonth}</div>
                <div className="text-sm opacity-90">Este Mes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Flame className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{Math.round(stats.totalCalories)}</div>
                <div className="text-sm opacity-90">Calorías Totales</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Scale className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{Math.round(stats.totalQuantity / 1000)}</div>
                <div className="text-sm opacity-90">Kg Totales</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Calorías Promedio</p>
                    <p className="text-2xl font-bold text-red-600">{stats.avgCalories}</p>
                  </div>
                  <Flame className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cantidad Promedio</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.avgQuantity}g</p>
                  </div>
                  <Scale className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Alimentos Únicos</p>
                    <p className="text-2xl font-bold text-green-600">{stats.uniqueFoods}</p>
                  </div>
                  <Apple className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Proteína Total</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalProtein}g</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Grasa Total</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.totalFat}g</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-500" />
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
                      placeholder="Buscar por alimento, tipo de comida, mascota, dueño..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Meal Type Filter */}
                <div>
                  <select
                    value={mealTypeFilter}
                    onChange={(e) => setMealTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Todos los Tipos</option>
                    {uniqueMealTypes.map(type => (
                      <option key={type} value={type}>{getMealTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>

                {/* Food Category Filter */}
                <div>
                  <select
                    value={foodCategoryFilter}
                    onChange={(e) => setFoodCategoryFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Todas las Categorías</option>
                    {uniqueFoodCategories.map(category => (
                      <option key={category} value={category}>{getFoodCategoryLabel(category)}</option>
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
                    <option value="calories-desc">Más Calorías</option>
                    <option value="calories-asc">Menos Calorías</option>
                    <option value="quantity-desc">Mayor Cantidad</option>
                    <option value="quantity-asc">Menor Cantidad</option>
                    <option value="meal_type-asc">Tipo de Comida A-Z</option>
                    <option value="meal_type-desc">Tipo de Comida Z-A</option>
                    <option value="food_name-asc">Alimento A-Z</option>
                    <option value="food_name-desc">Alimento Z-A</option>
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
                <CardTitle>Registros de Nutrición ({filteredRecords.length} de {stats.totalRecords})</CardTitle>
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
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">Hora</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('meal_type')} className="px-2 py-0 h-auto">
                            Tipo {getSortIcon('meal_type')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('food_name')} className="px-2 py-0 h-auto">
                            Alimento {getSortIcon('food_name')}
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                          <Button variant="ghost" onClick={() => handleSort('quantity')} className="px-2 py-0 h-auto">
                            Cantidad {getSortIcon('quantity')}
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
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {record.feeding_time || 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="text-xs">
                              {getMealTypeLabel(record.meal_type)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{record.food_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{getFoodCategoryLabel(record.food_category)}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">{record.quantity_grams || 0}g</td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-semibold text-red-600">
                              {record.total_calories || 0} cal
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
                  <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || mealTypeFilter !== 'all' || foodCategoryFilter !== 'all' || dateFilter !== 'all'
                      ? 'No se encontraron registros con los filtros aplicados'
                      : 'No hay registros de nutrición'}
                  </p>
                  {(searchTerm || mealTypeFilter !== 'all' || foodCategoryFilter !== 'all' || dateFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => { 
                        setSearchTerm(''); 
                        setMealTypeFilter('all'); 
                        setFoodCategoryFilter('all');
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-orange-700">
                Detalles del Registro de Nutrición
              </DialogTitle>
              <DialogDescription>
                Información completa sobre la alimentación.
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

              {/* Meal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detalles de la Comida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Fecha</Label>
                      <p className="font-medium">{format(new Date(selectedRecord.date), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Hora</Label>
                      <p className="font-medium">{selectedRecord.feeding_time || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Tipo de Comida</Label>
                      <Badge variant="outline">{getMealTypeLabel(selectedRecord.meal_type)}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Categoría</Label>
                      <Badge variant="outline">{getFoodCategoryLabel(selectedRecord.food_category)}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Alimento</Label>
                      <p className="font-medium">{selectedRecord.food_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Cantidad</Label>
                      <p className="font-medium">{selectedRecord.quantity_grams || 0} gramos</p>
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

              {/* Nutritional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información Nutricional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Calorías Totales</Label>
                      <p className="font-medium text-red-600">{selectedRecord.total_calories || 0} cal</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Proteína</Label>
                      <p className="font-medium">{selectedRecord.total_protein || 0}g</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Grasa</Label>
                      <p className="font-medium">{selectedRecord.total_fat || 0}g</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Carbohidratos</Label>
                      <p className="font-medium">{selectedRecord.total_carbs || 0}g</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Fibra</Label>
                      <p className="font-medium">{selectedRecord.total_fiber || 0}g</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-xs text-gray-600 mb-2 block">Valores por 100g</Label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Calorías:</span> <span className="font-medium">{selectedRecord.calories_per_100g || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Proteína:</span> <span className="font-medium">{selectedRecord.protein_per_100g || 0}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Grasa:</span> <span className="font-medium">{selectedRecord.fat_per_100g || 0}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Carbs:</span> <span className="font-medium">{selectedRecord.carbs_per_100g || 0}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fibra:</span> <span className="font-medium">{selectedRecord.fiber_per_100g || 0}g</span>
                      </div>
                    </div>
                  </div>
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

export default AdminNutritionRecordsPage;

