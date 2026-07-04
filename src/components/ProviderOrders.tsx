import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  Eye,
  User,
  AlertCircle,
  Coins,
  Play,
  RotateCcw,
  CheckSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { DashboardStatCard } from './dashboard/DashboardStatCard';
import { MobileSectionCard } from './mobile/MobileUi';
import {
  plainPageAccentBtn,
  plainPageAccentOutlineBtn,
  plainPageAccentTabActive,
  plainPageAccentUi,
  type PlainPageAccent,
} from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import OrderItemPetsList from './OrderItemPetsList';
import { attachPetsToOrderItems, fetchPetsForOrderItems, type OrderItemPet } from '@/utils/orderItemPets';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import { markMarketplaceNotificationsRead } from '@/utils/marketplaceNotifications';

const filterPanelClass =
  'rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4';

const STATUS_CHIPS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'confirmed', label: 'Confirmada' },
  { id: 'processing', label: 'Proceso' },
  { id: 'shipped', label: 'Enviada' },
  { id: 'delivered', label: 'Entregada' },
  { id: 'cancelled', label: 'Cancelada' },
] as const;

interface ProviderOrder {
  id: string;
  order_number: string;
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
  client_email?: string;
  order_items: ProviderOrderItem[];
}

interface ProviderOrderItem {
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
  provider_name: string;
  has_delivery: boolean;
  has_pickup: boolean;
  delivery_fee: number;
  created_at: string;
  pets?: OrderItemPet[];
}

interface ProviderOrdersProps {
  accent?: PlainPageAccent;
}

const ProviderOrders: React.FC<ProviderOrdersProps> = ({ accent = 'mango' }) => {
  const ui = plainPageAccentUi(accent);
  const btn = plainPageAccentBtn[accent];
  const outlineBtn = plainPageAccentOutlineBtn[accent];
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [orders, setOrders] = useState<ProviderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ProviderOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<keyof ProviderOrder>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch provider orders
  const fetchProviderOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('Fetching provider orders for user:', user.id);
      
      // Get orders that contain items from this provider
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (*)
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Order items query result:', { 
        count: orderItemsData?.length || 0, 
        itemsError 
      });

      if (itemsError) throw itemsError;

        // Get unique order IDs to fetch client emails
        const orderIds = [...new Set(orderItemsData?.map(item => item.order_id) || [])];
        
        // Fetch client emails separately from orders table
        const clientEmailsMap = new Map<string, string>();
        if (orderIds.length > 0) {
          try {
            const { data: ordersData, error: ordersError } = await supabase
              .from('orders')
              .select('id, client_email')
              .in('id', orderIds);
            
            if (!ordersError && ordersData) {
              ordersData.forEach(order => {
                clientEmailsMap.set(order.id, order.client_email || 'N/A');
              });
            }
          } catch (error) {
            console.log('Could not fetch client emails:', error);
          }
        }

        // Group order items by order_id and create order objects
        const ordersMap = new Map<string, ProviderOrder>();
        
        orderItemsData?.forEach((item) => {
          const order = item.orders;
          if (!order) return;

          const orderId = order.id;
          
          if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
              id: order.id,
              order_number: order.order_number,
              total_amount: order.total_amount,
              delivery_fee: order.delivery_fee,
              grand_total: order.grand_total,
              currency: order.currency,
              status: order.status,
              payment_method: order.payment_method,
              payment_status: order.payment_status,
              delivery_name: order.delivery_name,
              delivery_phone: order.delivery_phone,
              delivery_address: order.delivery_address,
              delivery_city: order.delivery_city,
              delivery_instructions: order.delivery_instructions,
              created_at: order.created_at,
              delivered_at: order.delivered_at,
              client_email: clientEmailsMap.get(order.id) || 'N/A',
              order_items: []
            });
          }

          // Add this provider's items to the order
          ordersMap.get(orderId)?.order_items.push({
            id: item.id,
            item_type: item.item_type,
            item_id: item.item_id,
            item_name: item.item_name,
            item_description: item.item_description,
            item_image_url: item.item_image_url,
            unit_price: item.unit_price,
            quantity: item.quantity,
            total_price: item.total_price,
            currency: item.currency,
            provider_name: item.provider_name,
            has_delivery: item.has_delivery,
            has_pickup: item.has_pickup,
            delivery_fee: item.delivery_fee,
            created_at: item.created_at
          });
        });

        const ordersArray = Array.from(ordersMap.values());
        const allItemIds = ordersArray.flatMap((o) => o.order_items.map((i) => i.id));
        const petsMap = await fetchPetsForOrderItems(allItemIds);
        const ordersWithPets = ordersArray.map((order) => ({
          ...order,
          order_items: attachPetsToOrderItems(order.order_items, petsMap),
        }));

        console.log('Processed orders:', ordersWithPets.length, ordersWithPets.map(o => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          created_at: o.created_at
        })));
        setOrders(ordersWithPets);
      } catch (error) {
        console.error('Error fetching provider orders:', error);
        console.error('Full error object:', error);
        
        // Log more specific error details
        if (error && typeof error === 'object' && 'code' in error) {
          console.error('Error code:', (error as any).code);
          console.error('Error message:', (error as any).message);
          console.error('Error details:', (error as any).details);
        }
        
        toast({
          title: "❌ Error",
          description: "No se pudieron cargar las órdenes",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchProviderOrders();
  }, [user, toast]);

  useEffect(() => {
    const state = location.state as { orderId?: string } | null;
    if (loading || !state?.orderId) return;

    const order = orders.find((item) => item.id === state.orderId);
    if (order) {
      setSelectedOrder(order);
      setShowOrderDetails(true);
      if (user?.id) {
        void markMarketplaceNotificationsRead(user.id, [`provider-order-new-${order.id}`]);
      }
    }
  }, [location.state, loading, orders, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('provider_orders_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items', filter: `provider_id=eq.${user.id}` },
        () => {
          fetchProviderOrders();
          dispatchNotificationsUpdated();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_appointments', filter: `provider_id=eq.${user.id}` },
        () => {
          fetchProviderOrders();
          dispatchNotificationsUpdated();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Get status badge variant with distinct colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: 'secondary' as const, icon: Clock, label: 'Pendiente', className: 'bg-landing-tropical/30 text-landing-mango-dark' };
      case 'confirmed':
        return { variant: 'default' as const, icon: CheckCircle, label: 'Confirmada', className: ui.badge };
      case 'processing':
        return { variant: 'default' as const, icon: Package, label: 'Procesando', className: 'bg-landing-mango/15 text-landing-mango-dark' };
      case 'shipped':
        return { variant: 'default' as const, icon: Truck, label: 'Enviada', className: ui.badge };
      case 'delivered':
        return { variant: 'default' as const, icon: CheckCircle, label: 'Entregada', className: 'bg-landing-mint/20 text-landing-mint-dark' };
      case 'cancelled':
        return { variant: 'destructive' as const, icon: XCircle, label: 'Cancelada', className: 'bg-red-100 text-red-700' };
      default:
        return { variant: 'secondary' as const, icon: Clock, label: status, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'completed':
        return { variant: 'default' as const, label: 'Pagado', className: 'bg-landing-mint/20 text-landing-mint-dark' };
      case 'pending':
        return { variant: 'secondary' as const, label: 'Pendiente', className: 'bg-landing-tropical/30 text-landing-mango-dark' };
      case 'failed':
        return { variant: 'destructive' as const, label: 'Falló', className: 'bg-red-100 text-red-700' };
      case 'refunded':
        return { 
          variant: 'outline' as const, 
          label: 'Reembolsado',
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
        };
      default:
        return { 
          variant: 'secondary' as const, 
          label: paymentStatus,
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
        };
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId);
      
      console.log('Updating order status:', { orderId, newStatus });
      
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      
      console.log('Update data:', updateData);
      
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      console.log('Update result:', { updatedOrder, error });

      if (error) {
        console.error('Error updating order:', error);
        console.error('Error details:', {
          code: (error as any).code,
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint
        });
        throw error;
      }

      if (!updatedOrder) {
        console.error('No updated order returned from database');
        throw new Error('No se recibió confirmación de la actualización');
      }

      console.log('Order updated successfully:', updatedOrder);
      console.log('Updated order status:', updatedOrder.status);

      // Verify the update was successful by checking the returned data
      if (updatedOrder.status !== newStatus) {
        console.error('Status mismatch! Expected:', newStatus, 'Got:', updatedOrder.status);
        throw new Error(`El estado no se actualizó correctamente. Esperado: ${newStatus}, Obtenido: ${updatedOrder.status}`);
      }

      // Reload orders from database to ensure we have the latest data
      console.log('Reloading orders from database...');
      await fetchProviderOrders();
      console.log('Orders reloaded successfully');

      // Update local state as backup
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: newStatus,
                updated_at: updateData.updated_at,
                ...(newStatus === 'delivered' && { delivered_at: updateData.delivered_at })
              }
            : order
        )
      );

      // Update selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          status: newStatus,
          updated_at: updateData.updated_at,
          ...(newStatus === 'delivered' && { delivered_at: updateData.delivered_at })
        } : null);
      }

      const statusMessages = {
        'confirmed': '✅ Orden Confirmada',
        'processing': '🔄 Orden en Procesamiento',
        'shipped': '🚚 Orden Enviada',
        'delivered': '🎯 Orden Entregada',
        'cancelled': '❌ Orden Cancelada'
      };

      const statusDescriptions = {
        'confirmed': 'La orden ha sido confirmada y está lista para procesar.',
        'processing': 'La orden está siendo preparada.',
        'shipped': 'La orden ha sido enviada al cliente.',
        'delivered': 'La orden ha sido entregada exitosamente.',
        'cancelled': 'La orden ha sido cancelada.'
      };

      toast({
        title: statusMessages[newStatus as keyof typeof statusMessages] || 'Estado Actualizado',
        description: statusDescriptions[newStatus as keyof typeof statusDescriptions] || 'El estado de la orden ha sido actualizado.',
        variant: newStatus === 'cancelled' ? 'destructive' : 'default',
        duration: 4000,
      });

      dispatchNotificationsUpdated();

    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "❌ Error al Actualizar",
        description: `No se pudo actualizar el estado de la orden: ${errorMessage}`,
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Get all possible status options
  const getAllStatusOptions = () => {
    return [
      { value: 'pending', label: 'Pendiente', icon: Clock },
      { value: 'confirmed', label: 'Confirmada', icon: CheckCircle },
      { value: 'processing', label: 'Procesando', icon: Play },
      { value: 'shipped', label: 'Enviada', icon: Truck },
      { value: 'delivered', label: 'Entregada', icon: CheckSquare },
      { value: 'cancelled', label: 'Cancelada', icon: XCircle }
    ];
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    const options = getAllStatusOptions();
    return options.find(opt => opt.value === status)?.label || status;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle view order details
  const handleViewDetails = (order: ProviderOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const formatDateShort = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const getOrderPreviewImage = (order: ProviderOrder) =>
    order.order_items.find((item) => item.item_image_url)?.item_image_url;

  const hasActiveFilters =
    statusFilter !== 'all' ||
    paymentStatusFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    searchQuery.trim() !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setDateRangeFilter('all');
    setSearchQuery('');
    setShowFilters(false);
  };

  const handleSortPreset = (preset: string) => {
    switch (preset) {
      case 'newest':
        setSortColumn('created_at');
        setSortDirection('desc');
        break;
      case 'oldest':
        setSortColumn('created_at');
        setSortDirection('asc');
        break;
      case 'amount-high':
        setSortColumn('grand_total');
        setSortDirection('desc');
        break;
      case 'amount-low':
        setSortColumn('grand_total');
        setSortDirection('asc');
        break;
    }
  };

  const sortPreset =
    sortColumn === 'created_at' && sortDirection === 'desc'
      ? 'newest'
      : sortColumn === 'created_at' && sortDirection === 'asc'
        ? 'oldest'
        : sortColumn === 'grand_total' && sortDirection === 'desc'
          ? 'amount-high'
          : sortColumn === 'grand_total' && sortDirection === 'asc'
            ? 'amount-low'
            : 'newest';

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    
    // Payment status filter
    if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter) return false;
    
    // Date range filter
    if (dateRangeFilter !== 'all') {
      const orderDate = new Date(order.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateRangeFilter) {
        case 'today':
          const todayStart = new Date(today);
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          if (orderDate < todayStart || orderDate > todayEnd) return false;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (orderDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (orderDate < monthAgo) return false;
          break;
        case 'year':
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          if (orderDate < yearAgo) return false;
          break;
      }
    }
    
    // Search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchesOrderNumber = order.order_number.toLowerCase().includes(query);
      const matchesClientName = order.delivery_name?.toLowerCase().includes(query) || false;
      const matchesClientEmail = order.client_email?.toLowerCase().includes(query) || false;
      const matchesClientPhone = order.delivery_phone?.toLowerCase().includes(query) || false;
      
      if (!matchesOrderNumber && !matchesClientName && !matchesClientEmail && !matchesClientPhone) {
        return false;
      }
    }
    
    return true;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue: any = a[sortColumn];
    let bValue: any = b[sortColumn];
    
    // Handle nested values
    if (sortColumn === 'order_number') {
      aValue = a.order_number;
      bValue = b.order_number;
    } else if (sortColumn === 'grand_total') {
      // Calculate provider total for each order
      aValue = a.order_items.reduce((sum, item) => sum + item.total_price, 0);
      bValue = b.order_items.reduce((sum, item) => sum + item.total_price, 0);
    }
    
    // Handle dates
    if (sortColumn === 'created_at' || sortColumn === 'delivered_at') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    }
    
    // Handle strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column sort
  const handleSort = (column: keyof ProviderOrder) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to descending for new columns
    }
  };

  // Get sort icon
  const getSortIcon = (column: keyof ProviderOrder) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-gray-600" />
      : <ArrowDown className="w-4 h-4 text-gray-600" />;
  };

  // Calculate KPIs
  const totalRevenue = orders
    .filter(order => order.payment_status === 'completed')
    .reduce((sum, order) => {
      const providerTotal = order.order_items.reduce((itemSum, item) => itemSum + item.total_price, 0);
      return sum + providerTotal;
    }, 0);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const confirmedOrders = orders.filter(order => order.status === 'confirmed').length;
  const processingOrders = orders.filter(order => order.status === 'processing').length;
  const shippedOrders = orders.filter(order => order.status === 'shipped').length;
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
  const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
  
  // Monthly revenue (current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = orders
    .filter(order => {
      const orderDate = new Date(order.created_at);
      return order.payment_status === 'completed' && 
             orderDate.getMonth() === currentMonth && 
             orderDate.getFullYear() === currentYear;
    })
    .reduce((sum, order) => {
      const providerTotal = order.order_items.reduce((itemSum, item) => itemSum + item.total_price, 0);
      return sum + providerTotal;
    }, 0);

  // Average order value
  const averageOrderValue = totalOrders > 0 
    ? orders.reduce((sum, order) => {
        const providerTotal = order.order_items.reduce((itemSum, item) => itemSum + item.total_price, 0);
        return sum + providerTotal;
      }, 0) / totalOrders
    : 0;

  // Paid vs Pending revenue
  const paidRevenue = orders
    .filter(order => order.payment_status === 'completed')
    .reduce((sum, order) => {
      const providerTotal = order.order_items.reduce((itemSum, item) => itemSum + item.total_price, 0);
      return sum + providerTotal;
    }, 0);

  const pendingRevenue = orders
    .filter(order => order.payment_status === 'pending')
    .reduce((sum, order) => {
      const providerTotal = order.order_items.reduce((itemSum, item) => itemSum + item.total_price, 0);
      return sum + providerTotal;
    }, 0);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/60" />
          ))}
        </div>
        <div className="h-40 rounded-2xl bg-white/60" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/60" />
          ))}
        </div>
      </div>
    );
  }

  const renderOrderCard = (order: ProviderOrder) => {
    const statusBadge = getStatusBadge(order.status);
    const paymentBadge = getPaymentStatusBadge(order.payment_status);
    const providerTotal = order.order_items.reduce((sum, item) => sum + item.total_price, 0);
    const previewImage = getOrderPreviewImage(order);
    const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

    return (
      <MobileSectionCard key={order.id} className="p-4">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
            {previewImage ? (
              <img src={previewImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center', ui.bgLight)}>
                <Package className={cn('w-7 h-7', ui.text)} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">Orden #{order.order_number}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{formatDateShort(order.created_at)}</p>
              </div>
              <Badge variant={statusBadge.variant} className={cn('shrink-0 text-[10px]', statusBadge.className)}>
                {statusBadge.label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {order.delivery_name || 'Cliente'}
              </span>
              <span className="flex items-center gap-1 font-semibold text-gray-900">
                <Coins className="w-3.5 h-3.5" />
                Q.{providerTotal.toFixed(2)}
              </span>
              <Badge variant={paymentBadge.variant} className={cn('text-[10px]', paymentBadge.className)}>
                {paymentBadge.label}
              </Badge>
            </div>

            <p className="text-[11px] text-gray-400 mt-1 truncate">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} ·{' '}
              {order.order_items.slice(0, 2).map((i) => i.item_name).join(' · ')}
              {order.order_items.length > 2 ? '…' : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(order)}
            className={cn('min-h-[40px]', outlineBtn)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Detalles
          </Button>
          <Select
            value={order.status}
            onValueChange={(newStatus) => {
              if (newStatus !== order.status) updateOrderStatus(order.id, newStatus);
            }}
            disabled={updatingStatus === order.id}
          >
            <SelectTrigger className="min-h-[40px] rounded-xl text-xs border-landing-mango/30">
              <SelectValue>
                {updatingStatus === order.id ? 'Actualizando…' : getStatusLabel(order.status)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              {getAllStatusOptions().map((option) => {
                const IconComponent = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value} disabled={option.value === order.status}>
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
      </MobileSectionCard>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          variant="plain"
          label="Ingresos"
          value={`Q.${totalRevenue.toFixed(0)}`}
          footer={`Este mes: Q.${monthlyRevenue.toFixed(0)}`}
          icon={Coins}
          gradientIndex={0}
        />
        <DashboardStatCard
          variant="plain"
          label="Órdenes"
          value={String(totalOrders)}
          footer={`Promedio Q.${averageOrderValue.toFixed(0)}`}
          icon={Package}
          gradientIndex={1}
        />
        <DashboardStatCard
          variant="plain"
          label="Pendientes"
          value={String(pendingOrders)}
          footer={totalOrders > 0 ? `${((pendingOrders / totalOrders) * 100).toFixed(0)}% del total` : undefined}
          icon={Clock}
          gradientIndex={2}
        />
        <DashboardStatCard
          variant="plain"
          label="Entregadas"
          value={String(deliveredOrders)}
          footer={paidRevenue > 0 ? `Pagado: Q.${paidRevenue.toFixed(0)}` : undefined}
          icon={CheckSquare}
          gradientIndex={3}
        />
      </div>

      <div className={filterPanelClass}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Orden, cliente, email, teléfono…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 min-h-[44px] rounded-xl border-gray-200/80 bg-white/90"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {STATUS_CHIPS.map((chip) => {
            const active = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={cn(
                  'min-h-[40px] rounded-xl px-2 py-2 text-[11px] font-medium transition-all duration-200 text-center leading-tight',
                  active
                    ? cn(plainPageAccentTabActive[accent], 'shadow-md')
                    : cn('bg-white border border-gray-200 text-gray-600 shadow-sm', ui.hoverBg),
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 min-h-[44px]',
              outlineBtn,
              showFilters && ui.bgLight,
            )}
          >
            <Filter className="w-4 h-4" />
            Más filtros
            {showFilters && <X className="w-4 h-4" />}
          </Button>

          <Select value={sortPreset} onValueChange={handleSortPreset}>
            <SelectTrigger className="w-40 min-h-[44px] rounded-xl">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="amount-high">Mayor monto</SelectItem>
              <SelectItem value="amount-low">Menor monto</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-red-600 hover:bg-red-50 min-h-[44px]">
              <RotateCcw className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}

          <span className="text-sm font-medium text-gray-600 ml-auto bg-white/60 px-3 py-2 rounded-full whitespace-nowrap">
            {sortedOrders.length} de {totalOrders} órdenes
          </span>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gray-100/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Estado de pago</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="min-h-[44px] rounded-xl">
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Pagado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Período</label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="min-h-[44px] rounded-xl">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los períodos</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {sortedOrders.length === 0 ? (
        <MobileSectionCard className="p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {orders.length === 0 ? 'No tienes órdenes aún' : 'No hay órdenes con este filtro'}
          </h3>
          <p className="text-sm text-gray-500">
            {orders.length === 0
              ? 'Cuando los clientes compren tus productos o servicios, aparecerán aquí.'
              : 'Prueba cambiar los filtros para ver más resultados.'}
          </p>
        </MobileSectionCard>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">{sortedOrders.map(renderOrderCard)}</div>

          <div className="hidden lg:block rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('order_number')}
                    >
                      <div className="flex items-center gap-2">
                        Orden
                        {getSortIcon('order_number')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-2">
                        Fecha
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('delivery_name')}
                    >
                      <div className="flex items-center gap-2">
                        Cliente
                        {getSortIcon('delivery_name')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('grand_total')}
                    >
                      <div className="flex items-center gap-2">
                        Total
                        {getSortIcon('grand_total')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Estado
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('payment_status')}
                    >
                      <div className="flex items-center gap-2">
                        Pago
                        {getSortIcon('payment_status')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedOrders.map((order) => {
                    const statusBadge = getStatusBadge(order.status);
                    const paymentBadge = getPaymentStatusBadge(order.payment_status);
                    const providerTotal = order.order_items.reduce((sum, item) => sum + item.total_price, 0);
                    const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
                    
                    // Determine order type based on items
                    const hasProducts = order.order_items.some(item => item.item_type === 'product');
                    const hasServices = order.order_items.some(item => item.item_type === 'service');
                    const orderType = hasProducts && hasServices ? 'Mixto' : hasProducts ? 'Producto' : 'Servicio';
                    const OrderTypeIcon = hasProducts && hasServices ? Package : hasProducts ? Package : Calendar;
                    const orderTypeColor = hasProducts && hasServices ? 'text-purple-600' : hasProducts ? 'text-blue-600' : 'text-emerald-600';
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(order.created_at)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString('es-GT', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{order.delivery_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{order.client_email || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">{order.delivery_phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{totalItems} {totalItems === 1 ? 'item' : 'items'}</div>
                          <div className="text-xs text-gray-500">{order.order_items.length} {order.order_items.length === 1 ? 'tipo' : 'tipos'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <OrderTypeIcon className={`w-4 h-4 ${orderTypeColor}`} />
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${orderTypeColor} border-current`}
                            >
                              {orderType}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {order.currency === 'GTQ' ? 'Q.' : '$'}{providerTotal.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusBadge.variant} className={`flex items-center gap-1 w-fit ${statusBadge.className}`}>
                            <statusBadge.icon className="w-3 h-3" />
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={paymentBadge.variant} className={`w-fit ${paymentBadge.className}`}>
                            {paymentBadge.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                              className="h-8"
                              title="Ver Detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => {
                                if (newStatus !== order.status) {
                                  updateOrderStatus(order.id, newStatus);
                                }
                              }}
                              disabled={updatingStatus === order.id}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-lg sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6" aria-describedby="order-details-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Detalles de Orden {selectedOrder.order_number}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4" id="order-details-description">
              <MobileSectionCard className="p-4 space-y-2 text-sm">
                <h4 className="font-bold text-gray-900 text-sm">Información de la orden</h4>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Estado</span>
                  <Badge variant={getStatusBadge(selectedOrder.status).variant} className={getStatusBadge(selectedOrder.status).className}>
                    {getStatusBadge(selectedOrder.status).label}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Pago</span>
                  <Badge variant={getPaymentStatusBadge(selectedOrder.payment_status).variant} className={getPaymentStatusBadge(selectedOrder.payment_status).className}>
                    {getPaymentStatusBadge(selectedOrder.payment_status).label}
                  </Badge>
                </div>
                <p><span className="text-gray-500">Fecha:</span> {formatDate(selectedOrder.created_at)}</p>
                {selectedOrder.delivered_at && (
                  <p><span className="text-gray-500">Entregado:</span> {formatDate(selectedOrder.delivered_at)}</p>
                )}
              </MobileSectionCard>

              <MobileSectionCard className="p-4 space-y-2 text-sm">
                <h4 className="font-bold text-gray-900 text-sm">Cliente</h4>
                <p><span className="text-gray-500">Nombre:</span> {selectedOrder.delivery_name}</p>
                <p><span className="text-gray-500">Email:</span> {selectedOrder.client_email}</p>
                <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.delivery_phone}</p>
                <p className="flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" /> {selectedOrder.delivery_address}, {selectedOrder.delivery_city}</p>
                {selectedOrder.delivery_instructions && (
                  <p><span className="text-gray-500">Instrucciones:</span> {selectedOrder.delivery_instructions}</p>
                )}
              </MobileSectionCard>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm px-1">Tus productos en esta orden</h4>
                {selectedOrder.order_items.map((item) => (
                  <MobileSectionCard key={item.id} className="p-3">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {item.item_image_url ? (
                          <img src={item.item_image_url} alt={item.item_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 truncate">{item.item_name}</h5>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {item.item_type === 'product' ? 'Producto' : 'Servicio'}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {item.quantity}x Q.{item.unit_price} = Q.{item.total_price}
                        </p>
                        <OrderItemPetsList pets={item.pets || []} />
                      </div>
                    </div>
                  </MobileSectionCard>
                ))}
              </div>

              <MobileSectionCard className={cn('p-4 border', ui.bgSoft, ui.border)}>
                <h4 className={cn('font-bold text-sm mb-1', ui.text)}>Tus ganancias</h4>
                <p className="text-2xl font-bold text-gray-900">
                  Q.{selectedOrder.order_items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Por {selectedOrder.order_items.length} {selectedOrder.order_items.length === 1 ? 'item' : 'items'}
                </p>
              </MobileSectionCard>

              <MobileSectionCard className="p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-3">Cambiar estado</h4>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(newStatus) => {
                      if (newStatus !== selectedOrder.status) {
                        updateOrderStatus(selectedOrder.id, newStatus);
                      }
                    }}
                    disabled={updatingStatus === selectedOrder.id}
                  >
                    <SelectTrigger className="w-[200px]">
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
                              <IconComponent className="w-4 h-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </MobileSectionCard>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProviderOrders;
