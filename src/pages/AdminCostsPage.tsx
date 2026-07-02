import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader, { SectionLoader } from '@/components/PageLoader';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
} from 'lucide-react';

interface AdminCost {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  cost_date: string;
  month: number;
  year: number;
  notes?: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CostStats {
  total: number;
  thisMonth: number;
  thisYear: number;
  monthlyAverage: number;
  byCategory: Record<string, number>;
}

const adminCostCategories = [
  { value: 'hosting', label: 'Hosting', icon: '🖥️' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'delivery', label: 'Delivery', icon: '🚚' },
  { value: 'income', label: 'Ingresos', icon: '💰' },
  { value: 'salarios', label: 'Salarios', icon: '👥' },
  { value: 'renta', label: 'Renta', icon: '🏢' },
  { value: 'servicios_publicos', label: 'Servicios Públicos', icon: '💡' },
  { value: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { value: 'seguros', label: 'Seguros', icon: '🛡️' },
  { value: 'impuestos', label: 'Impuestos', icon: '🧾' },
  { value: 'equipamiento', label: 'Equipamiento', icon: '🛠️' },
  { value: 'capacitacion', label: 'Capacitación', icon: '📚' },
  { value: 'consultoria', label: 'Consultoría', icon: '🤝' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'almacenamiento', label: 'Almacenamiento', icon: '📦' },
  { value: 'otros', label: 'Otros', icon: '📋' },
];

const AdminCostsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<AdminCost[]>([]);
  const [filteredCosts, setFilteredCosts] = useState<AdminCost[]>([]);
  const [stats, setStats] = useState<CostStats>({
    total: 0,
    thisMonth: 0,
    thisYear: 0,
    monthlyAverage: 0,
    byCategory: {},
  });
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<AdminCost | null>(null);
  const [deletingCost, setDeletingCost] = useState<AdminCost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState<keyof AdminCost>('cost_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    currency: 'GTQ',
    cost_date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: '',
  });

  useEffect(() => {
    loadCosts();
  }, []);

  useEffect(() => {
    filterAndSortCosts();
  }, [costs, searchTerm, categoryFilter, monthFilter, yearFilter, sortField, sortDirection]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_costs')
        .select('*')
        .order('cost_date', { ascending: false });

      if (error) throw error;

      setCosts(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Error loading costs:', error);
      toast.error('Error al cargar costos', {
        description: error.message || 'No se pudieron cargar los costos'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (costsData: AdminCost[]) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const total = costsData.reduce((sum, cost) => {
      return sum + (cost.category === 'income' ? -cost.amount : cost.amount);
    }, 0);

    const thisMonth = costsData
      .filter(cost => cost.month === currentMonth && cost.year === currentYear)
      .reduce((sum, cost) => {
        return sum + (cost.category === 'income' ? -cost.amount : cost.amount);
      }, 0);

    const thisYear = costsData
      .filter(cost => cost.year === currentYear)
      .reduce((sum, cost) => {
        return sum + (cost.category === 'income' ? -cost.amount : cost.amount);
      }, 0);

    const monthlyData = costsData.filter(cost => cost.year === currentYear);
    const monthlyAverage = monthlyData.length > 0
      ? monthlyData.reduce((sum, cost) => {
          return sum + (cost.category === 'income' ? -cost.amount : cost.amount);
        }, 0) / 12
      : 0;

    const byCategory: Record<string, number> = {};
    costsData.forEach(cost => {
      if (!byCategory[cost.category]) {
        byCategory[cost.category] = 0;
      }
      byCategory[cost.category] += cost.amount;
    });

    setStats({
      total,
      thisMonth,
      thisYear,
      monthlyAverage,
      byCategory,
    });
  };

  const filterAndSortCosts = () => {
    let filtered = [...costs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cost =>
        cost.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cost.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(cost => cost.category === categoryFilter);
    }

    // Month filter
    if (monthFilter !== 'all') {
      filtered = filtered.filter(cost => cost.month === parseInt(monthFilter));
    }

    // Year filter
    if (yearFilter !== 'all') {
      filtered = filtered.filter(cost => cost.year === parseInt(yearFilter));
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCosts(filtered);
  };

  const handleAddCost = () => {
    setEditingCost(null);
    setFormData({
      category: '',
      description: '',
      amount: '',
      currency: 'GTQ',
      cost_date: new Date().toISOString().split('T')[0],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      notes: '',
    });
    setShowCostDialog(true);
  };

  const handleEditCost = (cost: AdminCost) => {
    setEditingCost(cost);
    setFormData({
      category: cost.category,
      description: cost.description,
      amount: cost.amount.toString(),
      currency: cost.currency,
      cost_date: cost.cost_date,
      month: cost.month,
      year: cost.year,
      notes: cost.notes || '',
    });
    setShowCostDialog(true);
  };

  const handleDeleteCost = (cost: AdminCost) => {
    setDeletingCost(cost);
  };

  const confirmDelete = async () => {
    if (!deletingCost) return;

    try {
      const { error } = await supabase
        .from('admin_costs')
        .delete()
        .eq('id', deletingCost.id);

      if (error) throw error;

      toast.success('Costo eliminado', {
        description: 'El costo ha sido eliminado correctamente'
      });

      await loadCosts();
      setDeletingCost(null);
    } catch (error: any) {
      console.error('Error deleting cost:', error);
      toast.error('Error al eliminar costo', {
        description: error.message || 'No se pudo eliminar el costo'
      });
    }
  };

  const handleSaveCost = async () => {
    if (!formData.category || !formData.description || !formData.amount) {
      toast.error('Campos requeridos', {
        description: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    try {
      const costDate = new Date(formData.cost_date);
      const month = costDate.getMonth() + 1;
      const year = costDate.getFullYear();

      if (editingCost) {
        // Update existing cost
        const { error } = await supabase
          .from('admin_costs')
          .update({
            category: formData.category,
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            cost_date: formData.cost_date,
            month,
            year,
            notes: formData.notes.trim() || null,
          })
          .eq('id', editingCost.id);

        if (error) throw error;

        toast.success('Costo actualizado', {
          description: 'El costo ha sido actualizado correctamente'
        });
      } else {
        // Create new cost
        const { error } = await supabase
          .from('admin_costs')
          .insert({
            category: formData.category,
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            cost_date: formData.cost_date,
            month,
            year,
            notes: formData.notes.trim() || null,
            created_by: user?.id || null,
          });

        if (error) throw error;

        toast.success('Costo agregado', {
          description: 'El costo ha sido agregado correctamente'
        });
      }

      await loadCosts();
      setShowCostDialog(false);
      setEditingCost(null);
    } catch (error: any) {
      console.error('Error saving cost:', error);
      toast.error('Error al guardar costo', {
        description: error.message || 'No se pudo guardar el costo'
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    return adminCostCategories.find(c => c.value === category)?.label || category;
  };

  const getCategoryIcon = (category: string) => {
    return adminCostCategories.find(c => c.value === category)?.icon || '📋';
  };

  const handleSort = (field: keyof AdminCost) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader: React.FC<{ field: keyof AdminCost; children: React.ReactNode }> = ({ field, children }) => (
    <th
      className="p-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  // Generate year options (current year and 5 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (loading && costs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar />
        <div className="flex-1 ml-16">
          <PageLoader variant="inline" message="Cargando costos…" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-16">
        <div className="p-6">
          <PageHeader
            title="Costos Administrativos"
            subtitle="Gestiona los costos mensuales del negocio (hosting, marketing, delivery, ingresos, etc.)"
          />
        </div>
        <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total >= 0 ? (
                    <span className="text-green-600">Q {stats.total.toFixed(2)}</span>
                  ) : (
                    <span className="text-red-600">Q {stats.total.toFixed(2)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {costs.length} costos registrados
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.thisMonth >= 0 ? (
                    <span className="text-green-600">Q {stats.thisMonth.toFixed(2)}</span>
                  ) : (
                    <span className="text-red-600">Q {stats.thisMonth.toFixed(2)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {costs.filter(c => {
                    const now = new Date();
                    return c.month === now.getMonth() + 1 && c.year === now.getFullYear();
                  }).length} costos este mes
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Este Año</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.thisYear >= 0 ? (
                    <span className="text-green-600">Q {stats.thisYear.toFixed(2)}</span>
                  ) : (
                    <span className="text-red-600">Q {stats.thisYear.toFixed(2)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Promedio mensual: Q {stats.monthlyAverage.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Categorías activas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Filtros y Búsqueda</CardTitle>
                <Button onClick={handleAddCost} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar Costo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por descripción, categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {adminCostCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2000, month - 1).toLocaleDateString('es-GT', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Costs Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lista de Costos</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadCosts}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SectionLoader />
              ) : filteredCosts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron costos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableHeader field="cost_date">Fecha</SortableHeader>
                        <SortableHeader field="category">Categoría</SortableHeader>
                        <SortableHeader field="description">Descripción</SortableHeader>
                        <SortableHeader field="amount">Monto</SortableHeader>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCosts.map((cost) => (
                        <tr key={cost.id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {new Date(cost.cost_date).toLocaleDateString('es-GT', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <span>{getCategoryIcon(cost.category)}</span>
                              {getCategoryLabel(cost.category)}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{cost.description}</td>
                          <td className="p-3 text-sm font-semibold">
                            <span className={cost.category === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {cost.category === 'income' ? '+' : '-'}
                              {cost.currency} {cost.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCost(cost)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCost(cost)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

        {/* Add/Edit Cost Dialog */}
        <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCost ? 'Editar Costo' : 'Agregar Nuevo Costo'}
              </DialogTitle>
              <DialogDescription>
                {editingCost
                  ? 'Modifica la información del costo administrativo'
                  : 'Registra un nuevo costo administrativo mensual'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminCostCategories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          <span className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_date">Fecha *</Label>
                  <Input
                    id="cost_date"
                    type="date"
                    value={formData.cost_date}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setFormData({
                        ...formData,
                        cost_date: e.target.value,
                        month: date.getMonth() + 1,
                        year: date.getFullYear(),
                      });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Pago de hosting del mes de enero"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTQ">GTQ - Quetzal</SelectItem>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional sobre este costo..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCostDialog(false);
                    setEditingCost(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveCost}>
                  {editingCost ? 'Actualizar' : 'Agregar'} Costo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingCost} onOpenChange={() => setDeletingCost(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar este costo? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDeletingCost(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminCostsPage;

