import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Package,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  User,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';

interface OrderItem {
  id: string;
  item_type: 'product' | 'service';
  item_id: string;
  item_name: string;
  item_description?: string;
  item_image_url?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  currency: string;
  provider_id: string;
  provider_name?: string;
}

interface Order {
  id: string;
  order_number: string;
  client_id: string;
  total_amount: number;
  delivery_fee: number;
  grand_total: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_instructions?: string;
  created_at: string;
  delivered_at?: string;
  updated_at?: string;
  order_items?: OrderItem[];
  client_name?: string;
  client_email?: string;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
}

const AdminOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgOrderValue: 0,
    ordersThisMonth: 0,
    revenueThisMonth: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'order_number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Verify admin access
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }

    loadOrdersData();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.delivery_name?.toLowerCase().includes(searchLower) ||
        order.delivery_phone?.toLowerCase().includes(searchLower) ||
        order.delivery_address?.toLowerCase().includes(searchLower) ||
        order.client_name?.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentStatusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'amount':
          comparison = (a.grand_total || 0) - (b.grand_total || 0);
          break;
        case 'order_number':
          comparison = (a.order_number || '').localeCompare(b.order_number || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, sortBy, sortOrder]);

  const loadOrdersData = async () => {
    try {
      setLoading(true);

      // Load all orders with order items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        return;
      }

      console.log('Orders loaded:', ordersData?.length || 0);

      // Get client names from user_profiles
      const clientIds = [...new Set((ordersData || []).map(o => o.client_id))];
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', clientIds);

      // Map client names to orders
      const ordersWithClientInfo = (ordersData || []).map(order => {
        const clientProfile = userProfiles?.find(p => p.user_id === order.client_id);
        return {
          ...order,
          client_name: clientProfile?.full_name || 'Sin nombre',
          client_email: clientProfile?.email || null,
          order_items: order.order_items || []
        };
      });

      setOrders(ordersWithClientInfo);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalRevenue = ordersWithClientInfo.reduce((sum, o) => sum + (o.grand_total || 0), 0);
      const pendingOrders = ordersWithClientInfo.filter(o => 
        o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing'
      ).length;
      const completedOrders = ordersWithClientInfo.filter(o => o.status === 'completed' || o.status === 'delivered').length;
      const cancelledOrders = ordersWithClientInfo.filter(o => o.status === 'cancelled').length;
      
      const ordersThisMonth = ordersWithClientInfo.filter(o => 
        new Date(o.created_at) >= startOfMonth
      ).length;
      
      const revenueThisMonth = ordersWithClientInfo
        .filter(o => new Date(o.created_at) >= startOfMonth)
        .reduce((sum, o) => sum + (o.grand_total || 0), 0);
      
      const avgOrderValue = ordersWithClientInfo.length > 0 
        ? totalRevenue / ordersWithClientInfo.length
        : 0;

      setStats({
        totalOrders: ordersWithClientInfo.length,
        totalRevenue,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        avgOrderValue,
        ordersThisMonth,
        revenueThisMonth
      });

    } catch (error) {
      console.error('Error loading orders data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order: Order) => {
    // Load full order details with items if not already loaded
    if (!order.order_items || order.order_items.length === 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      setSelectedOrder({
        ...order,
        order_items: orderItems || []
      });
    } else {
      setSelectedOrder(order);
    }
    setShowOrderDetails(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      processing: { label: 'Procesando', className: 'bg-purple-100 text-purple-800 border-purple-300' },
      completed: { label: 'Completada', className: 'bg-green-100 text-green-800 border-green-300' },
      delivered: { label: 'Entregada', className: 'bg-green-100 text-green-800 border-green-300' },
      cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800 border-red-300' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      completed: { label: 'Completado', className: 'bg-green-100 text-green-800 border-green-300' },
      failed: { label: 'Fallido', className: 'bg-red-100 text-red-800 border-red-300' },
      refunded: { label: 'Reembolsado', className: 'bg-orange-100 text-orange-800 border-orange-300' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleExport = () => {
    try {
      // Create CSV headers
      const headers = ['Número Orden', 'Cliente', 'Total', 'Estado', 'Pago', 'Método Pago', 'Fecha', 'Dirección'];
      
      // Create CSV rows
      const rows = filteredOrders.map(order => [
        order.order_number || order.id.slice(0, 8),
        order.delivery_name || order.client_name || 'N/A',
        (order.grand_total || 0).toFixed(2),
        order.status || 'N/A',
        order.payment_status || 'N/A',
        order.payment_method || 'N/A',
        new Date(order.created_at).toLocaleDateString('es-GT'),
        order.delivery_address || 'N/A'
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `ordenes_pethub_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      alert('Error al exportar el archivo CSV');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="orders" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando órdenes…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="orders" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader 
            title="Gestión de Órdenes"
            subtitle="Administra todas las órdenes de la plataforma"
            gradient="from-orange-600 to-red-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                onClick={loadOrdersData}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </Button>
              <Button
                onClick={handleExport}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </PageHeader>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm opacity-90">Total de Órdenes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{stats.totalRevenue.toFixed(2)}</div>
                <div className="text-sm opacity-90">Ingresos Totales</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                <div className="text-sm opacity-90">Órdenes Pendientes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{stats.avgOrderValue.toFixed(2)}</div>
                <div className="text-sm opacity-90">Promedio por Orden</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completadas</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Canceladas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Este Mes</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.ordersThisMonth}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ingresos Mes</p>
                    <p className="text-2xl font-bold text-purple-600">Q{stats.revenueThisMonth.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por número, cliente, teléfono..."
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
                    <option value="all">Todos los Estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="processing">Procesando</option>
                    <option value="completed">Completada</option>
                    <option value="delivered">Entregada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos los Pagos</option>
                    <option value="pending">Pendiente</option>
                    <option value="completed">Completado</option>
                    <option value="failed">Fallido</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
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
                    <option value="amount-desc">Mayor Monto</option>
                    <option value="amount-asc">Menor Monto</option>
                    <option value="order_number-asc">Número A-Z</option>
                    <option value="order_number-desc">Número Z-A</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Órdenes ({filteredOrders.length} de {stats.totalOrders})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredOrders.length} órdenes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Número</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Cliente</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Total</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Estado</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Pago</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Método</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Fecha</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <p className="font-medium text-gray-900 font-mono text-sm">
                              {order.order_number || order.id.slice(0, 8)}
                            </p>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.delivery_name || order.client_name || 'Sin nombre'}</p>
                              {order.delivery_phone && (
                                <p className="text-xs text-gray-500">{order.delivery_phone}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-green-600">
                              Q{(order.grand_total || 0).toFixed(2)}
                            </p>
                            {order.delivery_fee > 0 && (
                              <p className="text-xs text-gray-500">
                                +Q{order.delivery_fee.toFixed(2)} envío
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-3">
                            {getPaymentStatusBadge(order.payment_status)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <CreditCard className="w-3 h-3" />
                              <span className="capitalize">{order.payment_method || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString('es-GT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                              className="flex items-center gap-1"
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
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all'
                      ? 'No se encontraron órdenes con los filtros aplicados' 
                      : 'No hay órdenes registradas'}
                  </p>
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Orden</DialogTitle>
            <DialogDescription>
              Información completa de la orden {selectedOrder?.order_number || selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información de la Orden</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Número:</span>
                      <span className="font-mono font-medium">{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estado:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pago:</span>
                      {getPaymentStatusBadge(selectedOrder.payment_status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Método:</span>
                      <span className="capitalize">{selectedOrder.payment_method || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Fecha:</span>
                      <span>{new Date(selectedOrder.created_at).toLocaleString('es-GT')}</span>
                    </div>
                    {selectedOrder.delivered_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Entregada:</span>
                        <span>{new Date(selectedOrder.delivered_at).toLocaleString('es-GT')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{selectedOrder.delivery_name || selectedOrder.client_name || 'Sin nombre'}</span>
                    </div>
                    {selectedOrder.delivery_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{selectedOrder.delivery_phone}</span>
                      </div>
                    )}
                    {selectedOrder.client_email && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{selectedOrder.client_email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium">{selectedOrder.delivery_address}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.delivery_city}</p>
                    </div>
                  </div>
                  {selectedOrder.delivery_instructions && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Instrucciones:</p>
                      <p className="text-sm">{selectedOrder.delivery_instructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Items de la Orden</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            {item.item_image_url && (
                              <img
                                src={item.item_image_url}
                                alt={item.item_name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{item.item_name}</p>
                              {item.item_description && (
                                <p className="text-sm text-gray-500">{item.item_description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.item_type === 'product' ? 'Producto' : 'Servicio'}
                                </Badge>
                                {item.provider_name && (
                                  <span className="text-xs text-gray-500">por {item.provider_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">Q{item.total_price.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">
                              Q{item.unit_price.toFixed(2)} x {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay items en esta orden</p>
                  )}
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Resumen de Totales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Q{(selectedOrder.total_amount || 0).toFixed(2)}</span>
                  </div>
                  {selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Envío:</span>
                      <span>Q{selectedOrder.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">Q{(selectedOrder.grand_total || 0).toFixed(2)}</span>
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

export default AdminOrdersPage;

