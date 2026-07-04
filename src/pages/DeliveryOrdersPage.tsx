import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  RefreshCw,
  Eye,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  User,
  ArrowUpDown,
  Play,
  CheckSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import DeliverySidebar from '@/components/DeliverySidebar';
import PageLoader from '@/components/PageLoader';
import { sendOrderStatusEmail } from '@/utils/sendOrderStatusEmail';

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
  provider_address?: string;
  provider_phone?: string;
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
  repartidor?: string;
  created_at: string;
  delivered_at?: string;
  updated_at?: string;
  order_items?: OrderItem[];
  client_name?: string;
}

type SortField = 'order_number' | 'delivery_name' | 'delivery_address' | 'grand_total' | 'status' | 'created_at';
type SortOrder = 'asc' | 'desc';

// Repartidores hardcoded
const repartidores = [
  'Repartidor 1',
  'Repartidor 2',
  'Repartidor 3'
];

interface DeliveryOrdersPageProps {
  asTab?: boolean; // If true, render without sidebar and PageHeader
}

const DeliveryOrdersPage: React.FC<DeliveryOrdersPageProps> = ({ asTab = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    // Verify delivery access - check if user has delivery email
    const checkDeliveryAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is the delivery user
      if (user.email !== 'delivery@pehtubgt.com') {
        navigate('/login');
        return;
      }

      // Set delivery role
      localStorage.setItem('user_role', 'delivery');
      
      // Update profile in database to delivery role
      supabase
        .from('user_profiles')
        .update({ role: 'delivery', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating delivery role in profile:', error);
          } else {
            console.log('Delivery role updated in profile');
          }
        });

      loadOrdersData();
    };

    checkDeliveryAccess();
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
        order.delivery_city?.toLowerCase().includes(searchLower) ||
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
      
      switch (sortField) {
        case 'order_number':
          comparison = (a.order_number || '').localeCompare(b.order_number || '');
          break;
        case 'delivery_name':
          comparison = (a.delivery_name || '').localeCompare(b.delivery_name || '');
          break;
        case 'delivery_address':
          comparison = (a.delivery_address || '').localeCompare(b.delivery_address || '');
          break;
        case 'grand_total':
          comparison = (a.grand_total || 0) - (b.grand_total || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, sortField, sortOrder]);

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
      const clientIds = [...new Set((ordersData || []).map(o => o.client_id).filter(id => id))];
      let userProfiles = null;
      if (clientIds.length > 0) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', clientIds);
        
        if (error) {
          console.error('Error loading user profiles:', error);
        } else {
          userProfiles = data;
        }
      }

      // Get provider addresses from providers table
      // Get all unique provider_ids from order_items
      const allProviderIds = new Set<string>();
      (ordersData || []).forEach(order => {
        (order.order_items || []).forEach((item: any) => {
          if (item.provider_id) {
            allProviderIds.add(item.provider_id);
          }
        });
      });

      // Fetch provider addresses
      const providerIdsArray = Array.from(allProviderIds).filter(id => id);
      let providersData = null;
      if (providerIdsArray.length > 0) {
        const { data, error } = await supabase
          .from('providers')
          .select('user_id, address, phone, business_name')
          .in('user_id', providerIdsArray);
        
        if (error) {
          console.error('Error loading providers:', error);
        } else {
          providersData = data;
        }
      }

      // Create a map of provider_id -> provider info
      const providerMap = new Map<string, { address?: string; phone?: string; business_name?: string }>();
      providersData?.forEach(provider => {
        providerMap.set(provider.user_id, {
          address: provider.address,
          phone: provider.phone,
          business_name: provider.business_name
        });
      });

      // Map client names and provider addresses to orders
      const ordersWithClientInfo = (ordersData || []).map(order => {
        const clientProfile = userProfiles?.find(p => p.user_id === order.client_id);
        
        // Add provider info to order items
        const orderItemsWithProviderInfo = (order.order_items || []).map((item: any) => {
          const providerInfo = providerMap.get(item.provider_id);
          return {
            ...item,
            provider_address: providerInfo?.address || null,
            provider_phone: providerInfo?.phone || null,
            provider_name: item.provider_name || providerInfo?.business_name || 'Sin nombre'
          };
        });

        return {
          ...order,
          client_name: clientProfile?.full_name || 'Sin nombre',
          order_items: orderItemsWithProviderInfo
        };
      });

      setOrders(ordersWithClientInfo);

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

  // Update order repartidor
  const updateOrderRepartidor = async (orderId: string, repartidor: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          repartidor: repartidor || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, repartidor: repartidor || null }
            : order
        )
      );

      // Update selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          repartidor: repartidor || null
        });
      }

      toast.success('Repartidor asignado', {
        description: `El repartidor ha sido asignado correctamente`
      });
    } catch (error: any) {
      console.error('Error updating repartidor:', error);
      toast.error('Error al asignar repartidor', {
        description: error.message || 'No se pudo asignar el repartidor'
      });
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId);

      const previousStatus = orders.find((o) => o.id === orderId)?.status;
      
      console.log('Delivery: Updating order status:', { orderId, newStatus });
      
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order:', error);
        throw error;
      }

      if (!updatedOrder) {
        throw new Error('No se recibió confirmación de la actualización');
      }

      // Reload orders from database
      await loadOrdersData();

      // Update selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus,
          updated_at: updateData.updated_at,
          ...(newStatus === 'delivered' && { delivered_at: updateData.delivered_at })
        });
      }

      const statusMessages: Record<string, string> = {
        'confirmed': '✅ Orden Confirmada',
        'processing': '🔄 Orden en Procesamiento',
        'in_transit': '🚚 Orden en Tránsito',
        'delivered': '🎯 Orden Entregada',
        'cancelled': '❌ Orden Cancelada'
      };

      const statusDescriptions: Record<string, string> = {
        'confirmed': 'La orden ha sido confirmada y está lista para entrega.',
        'processing': 'La orden está siendo preparada para entrega.',
        'in_transit': 'La orden está en camino al cliente.',
        'delivered': 'La orden ha sido entregada exitosamente.',
        'cancelled': 'La orden ha sido cancelada.'
      };

      toast.success(
        statusMessages[newStatus] || 'Estado Actualizado',
        {
          description: statusDescriptions[newStatus] || 'El estado de la orden ha sido actualizado.',
          duration: 3000,
        }
      );

      void sendOrderStatusEmail(
        (name, options) => supabase.functions.invoke(name, options),
        orderId,
        newStatus,
        previousStatus,
      );
    } catch (error: any) {
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al Actualizar', {
        description: `No se pudo actualizar el estado de la orden: ${errorMessage}`,
        duration: 6000,
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Get all possible status options for delivery
  const getAllStatusOptions = () => {
    return [
      { value: 'confirmed', label: 'Confirmada', icon: CheckCircle },
      { value: 'processing', label: 'Procesando', icon: Play },
      { value: 'in_transit', label: 'En Tránsito', icon: Truck },
      { value: 'delivered', label: 'Entregada', icon: CheckSquare },
      { value: 'cancelled', label: 'Cancelada', icon: XCircle }
    ];
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    const options = getAllStatusOptions();
    return options.find(opt => opt.value === status)?.label || status;
  };

  // Get order type (product, service, or mixed)
  const getOrderType = (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) {
      return { type: 'unknown', label: 'Desconocido', badge: 'bg-gray-100 text-gray-800 border-gray-300' };
    }

    const hasProducts = order.order_items.some(item => item.item_type === 'product');
    const hasServices = order.order_items.some(item => item.item_type === 'service');

    if (hasProducts && hasServices) {
      return { type: 'mixed', label: 'Mixto', badge: 'bg-purple-100 text-purple-800 border-purple-300' };
    } else if (hasProducts) {
      return { type: 'product', label: 'Producto', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
    } else if (hasServices) {
      return { type: 'service', label: 'Servicio', badge: 'bg-green-100 text-green-800 border-green-300' };
    }

    return { type: 'unknown', label: 'Desconocido', badge: 'bg-gray-100 text-gray-800 border-gray-300' };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      processing: { label: 'Procesando', className: 'bg-purple-100 text-purple-800 border-purple-300' },
      'in_transit': { label: 'En Tránsito', className: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
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
      return <PageLoader variant="inline" message="Cargando órdenes…" />;
    }
    return (
      <div className="flex min-h-screen bg-gray-50">
        <DeliverySidebar activeTab="orders" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando órdenes…" />
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {!asTab && (
        <PageHeader 
          title="Órdenes de Entrega"
          subtitle="Gestiona y visualiza todas las órdenes para entrega"
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
          </div>
        </PageHeader>
      )}

      {asTab && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Órdenes de Entrega</h2>
            <p className="text-sm text-gray-600">Gestiona y visualiza todas las órdenes para entrega</p>
          </div>
          <Button
            onClick={loadOrdersData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
      )}

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
                      placeholder="Buscar por número, cliente, teléfono, dirección..."
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="processing">Procesando</option>
                    <option value="in_transit">En Tránsito</option>
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
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los Pagos</option>
                    <option value="pending">Pendiente</option>
                    <option value="completed">Completado</option>
                    <option value="failed">Fallido</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Órdenes ({filteredOrders.length} de {orders.length})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredOrders.length} órdenes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOrders.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 md:px-0">
                    <table className="w-full min-w-[640px] md:min-w-0">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <SortableHeader field="created_at" className="min-w-[120px]">Fecha</SortableHeader>
                          <SortableHeader field="order_number" className="min-w-[100px]">Número</SortableHeader>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Tipo</th>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Cliente</th>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Dirección</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[140px]">Repartidor</th>
                          <th className="hidden md:table-cell text-left p-3 text-sm font-semibold text-gray-700">Total</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[160px]">Estado</th>
                          <th className="hidden md:table-cell text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <p className="text-sm text-gray-600 whitespace-nowrap">
                                {new Date(order.created_at).toLocaleDateString('es-GT', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-gray-900 font-mono text-sm whitespace-nowrap">
                                {order.order_number || order.id.slice(0, 8)}
                              </p>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              {(() => {
                                const orderType = getOrderType(order);
                                return (
                                  <Badge variant="outline" className={orderType.badge}>
                                    {orderType.label}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <div>
                                <p className="font-medium text-gray-900">{order.delivery_name || order.client_name || 'Sin nombre'}</p>
                                {order.delivery_phone && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {order.delivery_phone}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-gray-900">{order.delivery_address}</p>
                                  <p className="text-xs text-gray-500">{order.delivery_city}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <Select
                                value={order.repartidor || 'none'}
                                onValueChange={(value) => {
                                  updateOrderRepartidor(order.id, value === 'none' ? '' : value);
                                }}
                              >
                                <SelectTrigger className="w-full md:w-[140px] h-8 text-xs">
                                  <SelectValue placeholder="Sin asignar">
                                    {order.repartidor || 'Sin asignar'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-[10000]">
                                  <SelectItem value="none">
                                    Sin asignar
                                  </SelectItem>
                                  {repartidores.map((repartidor) => (
                                    <SelectItem key={repartidor} value={repartidor}>
                                      {repartidor}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="hidden md:table-cell p-3">
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
                              <div className="space-y-2">
                                <div>
                                  {getStatusBadge(order.status)}
                                  {order.delivered_at && order.status === 'delivered' && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                      <CheckSquare className="w-3 h-3" />
                                      {new Date(order.delivered_at).toLocaleString('es-GT', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  )}
                                </div>
                                <Select
                                  value={order.status}
                                  onValueChange={(newStatus) => {
                                    if (newStatus !== order.status) {
                                      updateOrderStatus(order.id, newStatus);
                                    }
                                  }}
                                  disabled={updatingStatus === order.id}
                                >
                                  <SelectTrigger className="w-full md:w-[160px] h-8 text-xs">
                                    <SelectValue>
                                      {updatingStatus === order.id ? 'Actualizando...' : getStatusLabel(order.status)}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    {getAllStatusOptions().map((option) => {
                                      const IconComponent = option.icon;
                                      return (
                                        <SelectItem 
                                          key={option.value} 
                                          value={option.value}
                                          disabled={option.value === order.status}
                                        >
                                          <div className="flex items-center gap-2">
                                            <IconComponent className="w-3 h-3" />
                                            <span>{option.label}</span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(order)}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  Ver
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
  );

  const orderDetailsDialog = (
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedOrder.status)}
                        <Select
                          value={selectedOrder.status}
                          onValueChange={(newStatus) => {
                            if (newStatus !== selectedOrder.status) {
                              updateOrderStatus(selectedOrder.id, newStatus);
                            }
                          }}
                          disabled={updatingStatus === selectedOrder.id}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue>
                              {updatingStatus === selectedOrder.id ? 'Actualizando...' : getStatusLabel(selectedOrder.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[10000]">
                            {getAllStatusOptions().map((option) => {
                              const IconComponent = option.icon;
                              return (
                                <SelectItem 
                                  key={option.value} 
                                  value={option.value}
                                  disabled={option.value === selectedOrder.status}
                                >
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="w-3 h-3" />
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pago:</span>
                      {getPaymentStatusBadge(selectedOrder.payment_status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Método:</span>
                      <span className="capitalize">{selectedOrder.payment_method || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Repartidor:</span>
                      <Select
                        value={selectedOrder.repartidor || 'none'}
                        onValueChange={(value) => {
                          updateOrderRepartidor(selectedOrder.id, value === 'none' ? '' : value);
                        }}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Sin asignar">
                            {selectedOrder.repartidor || 'Sin asignar'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="none">
                            Sin asignar
                          </SelectItem>
                          {repartidores.map((repartidor) => (
                            <SelectItem key={repartidor} value={repartidor}>
                              {repartidor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  </CardContent>
                </Card>
              </div>

              {/* Pickup and Delivery Addresses */}
              <div className="grid grid-cols-2 gap-4">
                {/* Pickup Address (Provider) */}
                <Card className="border-2 border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      Punto de Recogida
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                      <>
                        {(() => {
                          // Get unique providers from order items
                          const uniqueProviders = new Map<string, { name: string; address?: string; phone?: string }>();
                          selectedOrder.order_items.forEach(item => {
                            if (item.provider_id && !uniqueProviders.has(item.provider_id)) {
                              uniqueProviders.set(item.provider_id, {
                                name: item.provider_name || 'Proveedor',
                                address: item.provider_address,
                                phone: item.provider_phone
                              });
                            }
                          });
                          
                          return Array.from(uniqueProviders.values()).map((provider, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-900">{provider.name}</span>
                              </div>
                              {provider.address ? (
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600 mt-1" />
                                  <div>
                                    <p className="font-medium text-blue-900">{provider.address}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">Dirección no disponible</p>
                              )}
                              {provider.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-900">{provider.phone}</span>
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No hay información de proveedor disponible</p>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery Address (Client) */}
                <Card className="border-2 border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      Punto de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-900">
                        {selectedOrder.delivery_name || selectedOrder.client_name || 'Sin nombre'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-1" />
                      <div>
                        <p className="font-medium text-green-900">{selectedOrder.delivery_address}</p>
                        <p className="text-sm text-green-700">{selectedOrder.delivery_city}</p>
                      </div>
                    </div>
                    {selectedOrder.delivery_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-900">{selectedOrder.delivery_phone}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_instructions && (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1">Instrucciones:</p>
                        <p className="text-sm text-green-800">{selectedOrder.delivery_instructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

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
  );

  if (asTab) {
    return (
      <>
        {content}
        {orderDetailsDialog}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DeliverySidebar activeTab="orders" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {content}
        </div>
      </div>
      {orderDetailsDialog}
    </div>
  );
};

export default DeliveryOrdersPage;

