import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import DeliverySidebar from '@/components/DeliverySidebar';
import PageLoader from '@/components/PageLoader';

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
}

type SortField = 'expense_date' | 'category' | 'amount' | 'description';
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

interface DeliveryExpensesPageProps {
  asTab?: boolean; // If true, render without sidebar and PageHeader
}

const DeliveryExpensesPage: React.FC<DeliveryExpensesPageProps> = ({ asTab = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  
  // Repartidores hardcoded
  const repartidores = [
    'Repartidor 1',
    'Repartidor 2',
    'Repartidor 3'
  ];

  // Form state
  const [formData, setFormData] = useState({
    category: 'gasolina',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    repartidor: 'Repartidor 1'
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('expense_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    // Verify delivery access
    const checkDeliveryAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (user.email !== 'delivery@pehtubgt.com') {
        navigate('/login');
        return;
      }

      localStorage.setItem('user_role', 'delivery');
      
      supabase
        .from('user_profiles')
        .update({ role: 'delivery', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating delivery role in profile:', error);
          }
        });

      loadExpenses();
    };

    checkDeliveryAccess();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...expenses];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.category?.toLowerCase().includes(searchLower) ||
        expense.notes?.toLowerCase().includes(searchLower) ||
        expense.repartidor?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        expenseDate.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            return expenseDate.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return expenseDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return expenseDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return expenseDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'expense_date':
          comparison = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortField, sortOrder]);

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const { data: expensesData, error } = await supabase
        .from('delivery_expenses')
        .select('*')
        .eq('delivery_user_id', user?.id)
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error loading expenses:', error);
        toast.error('Error al cargar gastos', {
          description: error.message
        });
        return;
      }

      setExpenses(expensesData || []);
    } catch (error: any) {
      console.error('Error loading expenses:', error);
      toast.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Error', {
        description: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    try {
      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('delivery_expenses')
          .update({
            category: formData.category,
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            notes: formData.notes.trim() || null,
            repartidor: formData.repartidor || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingExpense.id);

        if (error) throw error;

        toast.success('Gasto actualizado', {
          description: 'El gasto ha sido actualizado exitosamente'
        });
      } else {
        // Create new expense
        const { error } = await supabase
          .from('delivery_expenses')
          .insert({
            delivery_user_id: user?.id,
            category: formData.category,
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            currency: 'GTQ',
            expense_date: formData.expense_date,
            notes: formData.notes.trim() || null,
            repartidor: formData.repartidor || null
          });

        if (error) throw error;

        toast.success('Gasto registrado', {
          description: 'El gasto ha sido registrado exitosamente'
        });
      }

      // Reset form and reload
      setFormData({
        category: 'gasolina',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
        repartidor: 'Repartidor 1'
      });
      setEditingExpense(null);
      setShowExpenseDialog(false);
      loadExpenses();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      toast.error('Error al guardar gasto', {
        description: error.message || 'No se pudo guardar el gasto'
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      notes: expense.notes || '',
      repartidor: expense.repartidor || 'Repartidor 1'
    });
    setShowExpenseDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;

    try {
      const { error } = await supabase
        .from('delivery_expenses')
        .delete()
        .eq('id', deletingExpense.id);

      if (error) throw error;

      toast.success('Gasto eliminado', {
        description: 'El gasto ha sido eliminado exitosamente'
      });

      setDeletingExpense(null);
      loadExpenses();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error('Error al eliminar gasto', {
        description: error.message || 'No se pudo eliminar el gasto'
      });
    }
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    setFormData({
      category: 'gasolina',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
      repartidor: 'Repartidor 1'
    });
    setShowExpenseDialog(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getCategoryLabel = (category: string) => {
    return expenseCategories.find(cat => cat.value === category)?.label || category;
  };

  const getCategoryIcon = (category: string) => {
    return expenseCategories.find(cat => cat.value === category)?.icon || '📋';
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, { className: string }> = {
      gasolina: { className: 'bg-blue-100 text-blue-800 border-blue-300' },
      aceite: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      repuestos: { className: 'bg-purple-100 text-purple-800 border-purple-300' },
      llantas: { className: 'bg-gray-100 text-gray-800 border-gray-300' },
      mantenimiento: { className: 'bg-green-100 text-green-800 border-green-300' },
      lavado: { className: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
      estacionamiento: { className: 'bg-orange-100 text-orange-800 border-orange-300' },
      peaje: { className: 'bg-red-100 text-red-800 border-red-300' },
      otros: { className: 'bg-pink-100 text-pink-800 border-pink-300' }
    };

    const config = categoryConfig[category] || { className: 'bg-gray-100 text-gray-800 border-gray-300' };
    
    return (
      <Badge variant="outline" className={config.className}>
        <span className="mr-1">{getCategoryIcon(category)}</span>
        {getCategoryLabel(category)}
      </Badge>
    );
  };

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const todayExpenses = expenses
    .filter(e => new Date(e.expense_date).toDateString() === new Date().toDateString())
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const monthExpenses = expenses
    .filter(e => {
      const expenseDate = new Date(e.expense_date);
      const today = new Date();
      return expenseDate.getMonth() === today.getMonth() && 
             expenseDate.getFullYear() === today.getFullYear();
    })
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode; className?: string }> = ({ field, children, className = '' }) => (
    <th 
      className={`text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="w-3 h-3 text-gray-400" />
        {sortField === field && (
          <span className="text-xs text-blue-600">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  if (loading) {
    if (asTab) {
      return <PageLoader variant="inline" message="Cargando gastos…" />;
    }
    return (
      <div className="flex min-h-screen bg-gray-50">
        <DeliverySidebar activeTab="expenses" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando gastos…" />
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {!asTab && (
        <PageHeader 
          title="Gastos de Delivery"
          subtitle="Registra y gestiona todos tus gastos de entrega"
          gradient="from-green-600 to-emerald-600"
          showNotifications={false}
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Gasto
            </Button>
            <Button
              onClick={loadExpenses}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
          </div>
        </PageHeader>
      )}

      {asTab && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gastos de Delivery</h2>
            <p className="text-sm text-gray-600">Registra y gestiona todos tus gastos de entrega</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddNew}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Gasto
            </Button>
            <Button
              onClick={loadExpenses}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
          </div>
        </div>
      )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{totalExpenses.toFixed(2)}</div>
                <div className="text-sm opacity-90">Total Gastos (Filtrados)</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <TrendingDown className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{todayExpenses.toFixed(2)}</div>
                <div className="text-sm opacity-90">Gastos de Hoy</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{monthExpenses.toFixed(2)}</div>
                <div className="text-sm opacity-90">Gastos del Mes</div>
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
                      placeholder="Buscar por descripción, categoría..."
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">Todas las Categorías</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">Todos los Períodos</option>
                    <option value="today">Hoy</option>
                    <option value="week">Última Semana</option>
                    <option value="month">Último Mes</option>
                    <option value="year">Último Año</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gastos ({filteredExpenses.length} de {expenses.length})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Total: Q{totalExpenses.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 md:px-0">
                    <table className="w-full min-w-[500px] md:min-w-0">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <SortableHeader field="expense_date" className="min-w-[120px]">Fecha</SortableHeader>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Categoría</th>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Descripción</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[140px]">Repartidor</th>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Monto</th>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Notas</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700 min-w-[100px]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <p className="text-sm text-gray-600 whitespace-nowrap">
                                {new Date(expense.expense_date).toLocaleDateString('es-GT', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              {getCategoryBadge(expense.category)}
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <p className="font-medium text-gray-900">{expense.description}</p>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 whitespace-nowrap">
                                {expense.repartidor || 'Sin asignar'}
                              </Badge>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <p className="font-semibold text-red-600">
                                Q{expense.amount.toFixed(2)}
                              </p>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              {expense.notes ? (
                                <p className="text-sm text-gray-500 truncate max-w-xs" title={expense.notes}>
                                  {expense.notes}
                                </p>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(expense)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span className="hidden md:inline">Editar</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingExpense(expense)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="hidden md:inline">Eliminar</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || categoryFilter !== 'all' || dateFilter !== 'all'
                      ? 'No se encontraron gastos con los filtros aplicados' 
                      : 'No hay gastos registrados'}
                  </p>
                  {!searchTerm && categoryFilter === 'all' && dateFilter === 'all' && (
                    <Button
                      onClick={handleAddNew}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Primer Gasto
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
  );

  const dialogs = (
    <>
      {/* Add/Edit Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Modifica la información del gasto' : 'Registra un nuevo gasto de entrega'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  {expenseCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Monto (Q) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Repartidor */}
            <div className="space-y-2">
              <Label htmlFor="repartidor">Repartidor *</Label>
              <select
                id="repartidor"
                value={formData.repartidor}
                onChange={(e) => setFormData({ ...formData, repartidor: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {repartidores.map(repartidor => (
                  <option key={repartidor} value={repartidor}>
                    {repartidor}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: Gasolina para entregas del día"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional sobre este gasto..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowExpenseDialog(false);
                  setEditingExpense(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingExpense ? 'Actualizar Gasto' : 'Registrar Gasto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {deletingExpense && (
            <div className="space-y-2 py-4">
              <p className="font-medium">{deletingExpense.description}</p>
              <p className="text-sm text-gray-600">
                Categoría: {getCategoryLabel(deletingExpense.category)}
              </p>
              <p className="text-sm text-gray-600">
                Monto: Q{deletingExpense.amount.toFixed(2)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeletingExpense(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (asTab) {
    return (
      <>
        {content}
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DeliverySidebar activeTab="expenses" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {content}
        </div>
      </div>
      {dialogs}
    </div>
  );
};

export default DeliveryExpensesPage;

