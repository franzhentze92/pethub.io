import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Search,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  FileText,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';

interface Expense {
  id: string;
  delivery_user_id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_url?: string;
  notes?: string;
  repartidor?: string;
  created_at: string;
  updated_at: string;
  delivery_user_name?: string;
}

type SortField = 'expense_date' | 'category' | 'amount' | 'description' | 'repartidor';
type SortOrder = 'asc' | 'desc';

const expenseCategories = [
  { value: 'gasolina', label: 'Gasolina', icon: '⛽' },
  { value: 'aceite', label: 'Aceite', icon: '🛢️' },
  { value: 'repuestos', label: 'Repuestos', icon: '🔧' },
  { value: 'llantas', label: 'Llantas', icon: '🛞' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔩' },
  { value: 'lavado', label: 'Lavado', icon: '🧼' },
  { value: 'estacionamiento', label: 'Estacionamiento', icon: '🅿️' },
  { value: 'peaje', label: 'Peaje', icon: '🛣️' },
  { value: 'otros', label: 'Otros', icon: '📋' }
];

const AdminDeliveryExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [repartidorFilter, setRepartidorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('expense_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Repartidores hardcoded
  const repartidores = [
    'Repartidor 1',
    'Repartidor 2',
    'Repartidor 3'
  ];

  useEffect(() => {
    loadExpensesData();
  }, []);

  // Filter and sort expenses
  useEffect(() => {
    let filtered = [...expenses];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.delivery_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.repartidor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    // Apply repartidor filter
    if (repartidorFilter !== 'all') {
      filtered = filtered.filter(expense => expense.repartidor === repartidorFilter);
    }

    // Apply date filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(expense => expense.expense_date === today);
    } else if (dateFilter === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      filtered = filtered.filter(expense => expense.expense_date >= firstDay);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'expense_date':
          aValue = new Date(a.expense_date).getTime();
          bValue = new Date(b.expense_date).getTime();
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'repartidor':
          aValue = a.repartidor || '';
          bValue = b.repartidor || '';
          break;
        default:
          aValue = new Date(a.expense_date).getTime();
          bValue = new Date(b.expense_date).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchTerm, categoryFilter, repartidorFilter, dateFilter, sortField, sortOrder]);

  const loadExpensesData = async () => {
    try {
      setLoading(true);

      // Load all expenses (admin can see all)
      const { data: expensesData, error: expensesError } = await supabase
        .from('delivery_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expensesError) {
        console.error('Error loading expenses:', expensesError);
        toast.error('Error al cargar gastos', {
          description: expensesError.message
        });
        return;
      }

      // Get delivery user names from user_profiles
      const userIds = [...new Set((expensesData || []).map(e => e.delivery_user_id).filter(id => id))];
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

      // Create a map of user_id -> user name
      const userMap = new Map();
      (userProfiles || []).forEach((profile: any) => {
        userMap.set(profile.user_id, profile.full_name);
      });

      // Combine expenses with user names
      const expensesWithUserInfo = (expensesData || []).map((expense: any) => ({
        ...expense,
        delivery_user_name: userMap.get(expense.delivery_user_id) || 'Usuario desconocido'
      }));

      setExpenses(expensesWithUserInfo);

    } catch (error: any) {
      console.error('Error loading expenses data:', error);
      toast.error('Error al cargar gastos', {
        description: error.message || 'No se pudieron cargar los gastos'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get expense statistics
  const getExpenseStats = () => {
    const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses.filter(e => e.expense_date === today);
    const todayTotal = todayExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthExpenses = expenses.filter(e => e.expense_date >= firstDay);
    const monthTotal = monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    return { total, todayTotal, monthTotal, count: expenses.length, todayCount: todayExpenses.length, monthCount: monthExpenses.length };
  };

  const stats = getExpenseStats();

  // Get category label
  const getCategoryLabel = (category: string) => {
    const cat = expenseCategories.find(c => c.value === category);
    return cat ? `${cat.icon} ${cat.label}` : category;
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, string> = {
      gasolina: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      aceite: 'bg-gray-100 text-gray-800 border-gray-300',
      repuestos: 'bg-blue-100 text-blue-800 border-blue-300',
      llantas: 'bg-black text-white border-black',
      mantenimiento: 'bg-purple-100 text-purple-800 border-purple-300',
      lavado: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      estacionamiento: 'bg-green-100 text-green-800 border-green-300',
      peaje: 'bg-orange-100 text-orange-800 border-orange-300',
      otros: 'bg-gray-100 text-gray-800 border-gray-300'
    };

    const color = categoryColors[category] || 'bg-gray-100 text-gray-800 border-gray-300';
    return (
      <Badge variant="outline" className={color}>
        {getCategoryLabel(category)}
      </Badge>
    );
  };

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
          title="Costos de Delivery" 
          description="Gestión y visualización de todos los gastos de delivery"
        />
        
        <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total General</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Q{stats.total.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{stats.count} gastos registrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoy</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Q{stats.todayTotal.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{stats.todayCount} gastos hoy</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">Q{stats.monthTotal.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{stats.monthCount} gastos este mes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
                <TrendingDown className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  Q{stats.monthCount > 0 ? (stats.monthTotal / stats.monthCount).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Por gasto este mes</p>
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
                      placeholder="Buscar por descripción, notas, repartidor..."
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las Categorías</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Repartidor Filter */}
                <div>
                  <select
                    value={repartidorFilter}
                    onChange={(e) => setRepartidorFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los Repartidores</option>
                    {repartidores.map(repartidor => (
                      <option key={repartidor} value={repartidor}>
                        {repartidor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Filter */}
              <div className="mt-4">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full md:w-auto h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas las Fechas</option>
                  <option value="today">Hoy</option>
                  <option value="month">Este Mes</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gastos ({filteredExpenses.length} de {expenses.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadExpensesData}
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
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron gastos</p>
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
                        <SortableHeader field="expense_date">Fecha</SortableHeader>
                        <SortableHeader field="category">Categoría</SortableHeader>
                        <SortableHeader field="description">Descripción</SortableHeader>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Repartidor</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Usuario</th>
                        <SortableHeader field="amount">Monto</SortableHeader>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <p className="text-sm text-gray-900">
                              {new Date(expense.expense_date).toLocaleDateString('es-GT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </td>
                          <td className="p-3">
                            {getCategoryBadge(expense.category)}
                          </td>
                          <td className="p-3">
                            <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                            {expense.receipt_url && (
                              <a
                                href={expense.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                              >
                                <FileText className="w-3 h-3" />
                                Ver recibo
                              </a>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                              {expense.repartidor || 'Sin asignar'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{expense.delivery_user_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-red-600">
                              Q{(expense.amount || 0).toFixed(2)}
                            </p>
                          </td>
                          <td className="p-3">
                            {expense.notes ? (
                              <p className="text-sm text-gray-600 max-w-xs truncate" title={expense.notes}>
                                {expense.notes}
                              </p>
                            ) : (
                              <span className="text-xs text-gray-400">Sin notas</span>
                            )}
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
    </div>
  );
};

export default AdminDeliveryExpensesPage;

