import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Calendar,
  CreditCard,
  Eye,
  ShoppingCart,
  Star,
  Search,
  Filter,
  X,
  CalendarDays,
  ShoppingBag,
  RotateCcw,
  FileText,
  RefreshCw,
  Scissors,
  Truck,
  MapPin,
  Phone,
  Store,
} from 'lucide-react';
import ReviewModal from './ReviewModal';
import InvoiceViewer from './InvoiceViewer';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnSolid } from '@/lib/landingTheme';
import { resolveFulfillmentMethod, fulfillmentLabel } from '@/lib/orderFulfillment';
import { cn } from '@/lib/utils';
import OrderItemPetsList from './OrderItemPetsList';
import {
  attachPetsToOrderItems,
  fetchPetsForAppointment,
  fetchPetsForOrderItems,
  type OrderItemPet,
} from '@/utils/orderItemPets';
import { formatAppointmentTimeLabel } from '@/utils/appointmentDisplay';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import {
  getNotificationIdsForAppointment,
  getNotificationIdsForOrder,
  loadClientOrdersPageUnreadIds,
  markClientOrderNotificationsRead,
} from '@/utils/clientOrdersNotifications';

const filterPanelClass =
  'rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4';

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
  provider_name: string;
  provider_phone?: string;
  provider_address?: string;
  has_delivery: boolean;
  has_pickup: boolean;
  delivery_fee: number;
  pets?: OrderItemPet[];
}

interface ReservationData {
  appointment_date?: string;
  time_slot_id?: string;
  time_slot?: { slot_start_time?: string; slot_end_time?: string } | null;
  notes?: string;
  client_email?: string;
}

interface Order {
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
  fulfillment_method?: string | null;
  created_at: string;
  delivered_at?: string;
  order_items: OrderItem[];
  reservation_data?: ReservationData;
}

type CatalogReviewRow = {
  order_id: string | null;
  product_id: string | null;
  service_id: string | null;
  item_type: string;
};

function getUniqueCatalogItems(items: OrderItem[]) {
  const map = new Map<string, { item_type: 'product' | 'service'; item_id: string }>();
  items.forEach((item) => {
    if (item.item_type !== 'product' && item.item_type !== 'service') return;
    const key = `${item.item_type}_${item.item_id}`;
    if (!map.has(key)) {
      map.set(key, { item_type: item.item_type, item_id: item.item_id });
    }
  });
  return Array.from(map.values());
}

function catalogItemHasReview(
  item: { item_type: 'product' | 'service'; item_id: string },
  reviews: CatalogReviewRow[],
) {
  return reviews.some((review) =>
    item.item_type === 'product'
      ? review.product_id === item.item_id
      : review.service_id === item.item_id,
  );
}

async function buildProviderRefMap(providerRefs: string[]) {
  const refToTableId = new Map<string, string>();
  const uniqueRefs = [...new Set(providerRefs.filter(Boolean))];
  if (uniqueRefs.length === 0) return refToTableId;

  const [{ data: byId }, { data: byUserId }] = await Promise.all([
    supabase.from('providers').select('id, user_id').in('id', uniqueRefs),
    supabase.from('providers').select('id, user_id').in('user_id', uniqueRefs),
  ]);

  [...(byId || []), ...(byUserId || [])].forEach((provider) => {
    refToTableId.set(provider.id, provider.id);
    refToTableId.set(provider.user_id, provider.id);
  });

  return refToTableId;
}

interface Reservation {
  id: string;
  service_id: string;
  provider_id: string;
  client_id?: string;
  order_id?: string | null;
  order_item_id?: string | null;
  status: string;
  total_price?: number;
  currency?: string;
  appointment_date: string;
  appointment_time?: string;
  slot_end_time?: string | null;
  created_at?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  notes?: string;
  time_slot_id?: string;
  service_name: string;
  provider_name: string;
  pets?: OrderItemPet[];
  provider_services?: {
    description?: string;
    service_image_url?: string;
    providers?: { address?: string; phone?: string; business_name?: string };
  };
  provider_service_time_slots?: { slot_start_time?: string; slot_end_time?: string } | null;
}

type SortOption = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

const PEDIDO_STATUS_CHIPS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'in_progress', label: 'En proceso' },
  { id: 'delivered', label: 'Entregado' },
  { id: 'cancelled', label: 'Cancelado' },
] as const;

const RESERVA_STATUS_CHIPS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'confirmed', label: 'Confirmada' },
  { id: 'completed', label: 'Completada' },
  { id: 'cancelled', label: 'Cancelada' },
] as const;

const IN_PROGRESS_STATUSES = ['confirmed', 'processing', 'shipped'];

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDateShort = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatPrice = (price: number | undefined | null, currency: string = 'GTQ') => {
  if (price === undefined || price === null || Number.isNaN(price)) {
    return `${currency === 'GTQ' ? 'Q.' : '$'}0.00`;
  }
  return `${currency === 'GTQ' ? 'Q.' : '$'}${price.toFixed(2)}`;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: 'Pendiente', className: 'bg-landing-tropical/30 text-landing-mango-dark' };
    case 'confirmed':
      return { text: 'Confirmado', className: 'bg-landing-aqua/20 text-landing-aqua-dark' };
    case 'completed':
      return { text: 'Completado', className: 'bg-landing-mint/20 text-landing-mint-dark' };
    case 'processing':
      return { text: 'Procesando', className: 'bg-landing-mango/15 text-landing-mango-dark' };
    case 'shipped':
      return { text: 'Enviado', className: 'bg-landing-aqua/15 text-landing-aqua-dark' };
    case 'delivered':
      return { text: 'Entregado', className: 'bg-landing-mint/20 text-landing-mint-dark' };
    case 'cancelled':
      return { text: 'Cancelado', className: 'bg-red-100 text-red-700' };
    default:
      return { text: status, className: 'bg-gray-100 text-gray-700' };
  }
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return { text: 'Pagado', className: 'bg-landing-mint/20 text-landing-mint-dark' };
    case 'pending':
      return { text: 'Pago pendiente', className: 'bg-landing-tropical/30 text-landing-mango-dark' };
    case 'failed':
      return { text: 'Fallido', className: 'bg-red-100 text-red-700' };
    case 'refunded':
      return { text: 'Reembolsado', className: 'bg-landing-aqua/20 text-landing-aqua-dark' };
    default:
      return { text: status, className: 'bg-gray-100 text-gray-700' };
  }
};

const matchesPedidoStatus = (status: string, filter: string) => {
  if (filter === 'all') return true;
  if (filter === 'in_progress') return IN_PROGRESS_STATUSES.includes(status);
  return status === filter;
};

const matchesDateFilter = (dateString: string, dateFilter: string) => {
  if (dateFilter === 'all') return true;
  const now = new Date();
  const itemDate = new Date(dateString);
  switch (dateFilter) {
    case 'today':
      return itemDate.toDateString() === now.toDateString();
    case 'week':
      return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return itemDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return true;
  }
};

const getOrderPreviewImage = (order: Order) =>
  order.order_items?.find((item) => item.item_image_url)?.item_image_url || null;

const reservationToOrder = (reservation: Reservation): Order => {
  const timeSlot = reservation.provider_service_time_slots;
  return {
    id: reservation.id,
    order_number: `RES-${reservation.id.slice(-8).toUpperCase()}`,
    total_amount: reservation.total_price || 0,
    delivery_fee: 0,
    grand_total: reservation.total_price || 0,
    currency: reservation.currency || 'GTQ',
    status: reservation.status || 'pending',
    payment_method: 'service',
    payment_status: 'completed',
    delivery_name: reservation.client_name || '',
    delivery_phone: reservation.client_phone || '',
    delivery_address: reservation.provider_services?.providers?.address || '',
    delivery_city: '',
    delivery_instructions: reservation.notes || '',
    created_at: reservation.created_at || reservation.appointment_date,
    reservation_data: {
      appointment_date: reservation.appointment_date,
      time_slot_id: reservation.time_slot_id,
      time_slot: timeSlot,
      notes: reservation.notes,
      client_email: reservation.client_email,
    },
    order_items: [
      {
        id: reservation.id,
        item_type: 'service',
        item_id: reservation.service_id,
        item_name: reservation.service_name,
        provider_id: reservation.provider_id,
        provider_name: reservation.provider_name,
        unit_price: reservation.total_price || 0,
        quantity: 1,
        total_price: reservation.total_price || 0,
        currency: reservation.currency || 'GTQ',
        item_description: reservation.provider_services?.description || 'Servicio reservado',
        item_image_url: reservation.provider_services?.service_image_url || undefined,
        provider_phone: reservation.provider_services?.providers?.phone || '',
        provider_address: reservation.provider_services?.providers?.address || '',
        has_delivery: false,
        has_pickup: false,
        delivery_fee: 0,
        pets: reservation.pets || [],
      },
    ],
  };
};

const ClientOrders: React.FC = () => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('pedidos');
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  const productOrders = useMemo(
    () => orders.filter((order) => order.order_items?.some((item) => item.item_type === 'product')),
    [orders]
  );

  const fetchOrders = useCallback(async (silent = false) => {
    if (!user) return;

    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const [ordersResult, reservationsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items (*)')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('service_appointments')
          .select(`
            *,
            provider_services (
              id,
              service_name,
              description,
              service_image_url,
              price,
              currency,
              duration_minutes,
              provider_id,
              providers (
                id,
                business_name,
                user_id,
                address,
                phone
              )
            ),
            provider_service_time_slots:provider_service_time_slots!service_appointments_time_slot_id_fkey (
              slot_start_time,
              slot_end_time
            )
          `)
          .eq('client_id', user.id)
          .order('appointment_date', { ascending: false }),
      ]);

      if (ordersResult.error) {
        console.error('Error fetching orders:', ordersResult.error);
        setOrders([]);
      } else {
        const rawOrders = (ordersResult.data || []).map((order) => ({
          ...order,
          order_items: order.order_items || [],
        }));
        const orderItemIds = rawOrders.flatMap((o) => o.order_items.map((i: { id: string }) => i.id));
        const petsMap = await fetchPetsForOrderItems(orderItemIds);
        setOrders(
          rawOrders.map((order) => ({
            ...order,
            order_items: attachPetsToOrderItems(order.order_items, petsMap),
          })),
        );
      }

      if (reservationsResult.error) {
        console.error('Error fetching reservations:', reservationsResult.error);
        setReservations([]);
      } else {
        const rawReservations = reservationsResult.data || [];
        const reservationsWithPets = await Promise.all(
          rawReservations.map(async (reservation) => {
            const timeSlot = reservation.provider_service_time_slots;
            const appointmentTime = formatAppointmentTimeLabel({
              appointmentTime: reservation.appointment_time,
              slotEndTime: reservation.slot_end_time,
              timeSlot,
            });

            const pets = await fetchPetsForAppointment({
              orderItemId: reservation.order_item_id,
              orderId: reservation.order_id,
              clientId: reservation.client_id || user.id,
              serviceId: reservation.service_id,
              createdAt: reservation.created_at,
              totalPrice: reservation.total_price ?? null,
            });

            return {
              ...reservation,
              service_name: reservation.provider_services?.service_name || 'Servicio desconocido',
              provider_name: reservation.provider_services?.providers?.business_name || 'Proveedor desconocido',
              appointment_time: appointmentTime,
              pets,
            };
          }),
        );
        setReservations(reservationsWithPets);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setOrders([]);
      setReservations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const refreshUnreadIds = useCallback(async () => {
    if (!user?.id) return;
    const ids = await loadClientOrdersPageUnreadIds(user.id);
    setUnreadIds(ids);
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    refreshUnreadIds();
  }, [refreshUnreadIds]);

  useEffect(() => {
    const onUpdate = () => {
      void refreshUnreadIds();
    };
    window.addEventListener('notifications-updated', onUpdate);
    return () => window.removeEventListener('notifications-updated', onUpdate);
  }, [refreshUnreadIds]);

  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab) {
      setActiveTab(state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('client_orders_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `client_id=eq.${user.id}` },
        () => {
          fetchOrders(true);
          dispatchNotificationsUpdated();
          void refreshUnreadIds();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_appointments', filter: `client_id=eq.${user.id}` },
        () => {
          fetchOrders(true);
          dispatchNotificationsUpdated();
          void refreshUnreadIds();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchOrders, refreshUnreadIds]);

  const checkOrdersForReviews = useCallback(async () => {
    if (!user?.id || (orders.length === 0 && reservations.length === 0)) return;

    const reviewableOrders = orders.filter(
      (order) =>
        (order.status === 'delivered' || order.status === 'confirmed') &&
        order.payment_status === 'completed',
    );
    const completedReservations = reservations.filter((r) => r.status === 'completed');
    const targetIds = [
      ...reviewableOrders.map((o) => o.id),
      ...completedReservations.map((r) => r.id),
    ];

    if (targetIds.length === 0) return;

    const providerRefs = [
      ...reviewableOrders.flatMap((o) => o.order_items.map((i) => i.provider_id)),
      ...completedReservations.map((r) => r.provider_id),
    ];

    const [{ data: catalogReviews }, { data: providerReviews }, refToTableId] = await Promise.all([
      supabase
        .from('catalog_item_reviews')
        .select('order_id, product_id, service_id, item_type')
        .eq('client_id', user.id)
        .in('order_id', targetIds),
      supabase.from('provider_reviews').select('provider_id').eq('client_id', user.id),
      buildProviderRefMap(providerRefs),
    ]);

    const reviewsByOrderId = new Map<string, CatalogReviewRow[]>();
    (catalogReviews || []).forEach((review) => {
      if (!review.order_id) return;
      const existing = reviewsByOrderId.get(review.order_id) || [];
      existing.push(review);
      reviewsByOrderId.set(review.order_id, existing);
    });

    const reviewedProviderIds = new Set((providerReviews || []).map((review) => review.provider_id));
    const reviewed = new Set<string>();

    for (const order of reviewableOrders) {
      const catalogItems = getUniqueCatalogItems(order.order_items);
      if (catalogItems.length === 0) continue;

      const orderReviews = reviewsByOrderId.get(order.id) || [];
      const itemsReviewed = catalogItems.every((item) => catalogItemHasReview(item, orderReviews));
      if (!itemsReviewed) continue;

      const providerTableIds = [
        ...new Set(
          order.order_items
            .map((item) => refToTableId.get(item.provider_id))
            .filter(Boolean) as string[],
        ),
      ];

      if (providerTableIds.length === 0 || providerTableIds.every((id) => reviewedProviderIds.has(id))) {
        reviewed.add(order.id);
      }
    }

    for (const reservation of completedReservations) {
      const orderReviews = reviewsByOrderId.get(reservation.id) || [];
      const serviceReviewed = orderReviews.some((review) => review.service_id === reservation.service_id);
      if (!serviceReviewed) continue;

      const providerTableId = refToTableId.get(reservation.provider_id);
      if (!providerTableId || reviewedProviderIds.has(providerTableId)) {
        reviewed.add(reservation.id);
      }
    }

    setReviewedOrders(reviewed);
  }, [user?.id, orders, reservations]);

  useEffect(() => {
    if (!loading && user) {
      checkOrdersForReviews();
    }
  }, [loading, user, checkOrdersForReviews]);

  const filteredPedidos = useMemo(() => {
    let filtered = productOrders.filter((order) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        order.order_number.toLowerCase().includes(term) ||
        order.order_items.some(
          (item) =>
            item.item_name.toLowerCase().includes(term) ||
            item.provider_name.toLowerCase().includes(term)
        );
      return matchesSearch && matchesPedidoStatus(order.status, statusFilter) && matchesDateFilter(order.created_at, dateFilter);
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-high':
          return (b.grand_total || 0) - (a.grand_total || 0);
        case 'amount-low':
          return (a.grand_total || 0) - (b.grand_total || 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [productOrders, searchTerm, statusFilter, dateFilter, sortBy]);

  const filteredReservas = useMemo(() => {
    let filtered = reservations.filter((reservation) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        reservation.service_name.toLowerCase().includes(term) ||
        reservation.provider_name.toLowerCase().includes(term) ||
        reservation.id.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
      return matchesSearch && matchesStatus && matchesDateFilter(reservation.appointment_date, dateFilter);
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
        case 'amount-high':
          return (b.total_price || 0) - (a.total_price || 0);
        case 'amount-low':
          return (a.total_price || 0) - (b.total_price || 0);
        case 'newest':
        default:
          return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime();
      }
    });

    return filtered;
  }, [reservations, searchTerm, statusFilter, dateFilter, sortBy]);

  const filteredData = activeTab === 'pedidos' ? filteredPedidos : filteredReservas;
  const totalCount = activeTab === 'pedidos' ? productOrders.length : reservations.length;

  const statusChips = activeTab === 'pedidos' ? PEDIDO_STATUS_CHIPS : RESERVA_STATUS_CHIPS;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setSortBy('newest');
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchTerm !== '' || statusFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'newest';

  const markOrderNotificationsSeen = useCallback(
    async (orderId: string, status: string) => {
      if (!user?.id) return;
      const ids = getNotificationIdsForOrder(orderId, status).filter((id) => unreadIds.has(id));
      if (!ids.length) return;
      await markClientOrderNotificationsRead(user.id, ids);
      setUnreadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      dispatchNotificationsUpdated();
    },
    [user?.id, unreadIds],
  );

  const markReservationNotificationsSeen = useCallback(
    async (appointmentId: string, status: string) => {
      if (!user?.id) return;
      const ids = getNotificationIdsForAppointment(appointmentId, status).filter((id) =>
        unreadIds.has(id),
      );
      if (!ids.length) return;
      await markClientOrderNotificationsRead(user.id, ids);
      setUnreadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      dispatchNotificationsUpdated();
    },
    [user?.id, unreadIds],
  );

  const orderHasUnread = useCallback(
    (orderId: string, status: string) =>
      getNotificationIdsForOrder(orderId, status).some((id) => unreadIds.has(id)),
    [unreadIds],
  );

  const reservationHasUnread = useCallback(
    (appointmentId: string, status: string) =>
      getNotificationIdsForAppointment(appointmentId, status).some((id) => unreadIds.has(id)),
    [unreadIds],
  );

  const pedidosUnreadCount = useMemo(
    () => productOrders.filter((order) => orderHasUnread(order.id, order.status)).length,
    [productOrders, orderHasUnread],
  );

  const reservasUnreadCount = useMemo(
    () => reservations.filter((r) => reservationHasUnread(r.id, r.status)).length,
    [reservations, reservationHasUnread],
  );

  const orderTabs: MobileTabItem[] = useMemo(
    () => [
      {
        id: 'pedidos',
        label: 'Mis Pedidos',
        shortLabel: pedidosUnreadCount
          ? `Pedidos (${productOrders.length}) · ${pedidosUnreadCount} nueva${pedidosUnreadCount !== 1 ? 's' : ''}`
          : `Pedidos (${productOrders.length})`,
        icon: ShoppingBag,
        gradientIndex: 0,
      },
      {
        id: 'reservas',
        label: 'Mis Reservas',
        shortLabel: reservasUnreadCount
          ? `Reservas (${reservations.length}) · ${reservasUnreadCount} nueva${reservasUnreadCount !== 1 ? 's' : ''}`
          : `Reservas (${reservations.length})`,
        icon: CalendarDays,
        gradientIndex: 2,
      },
    ],
    [productOrders.length, reservations.length, pedidosUnreadCount, reservasUnreadCount],
  );

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    if (order.reservation_data) {
      void markReservationNotificationsSeen(order.id, order.status);
    } else {
      void markOrderNotificationsSeen(order.id, order.status);
    }
  };

  const handleViewReservation = (reservation: Reservation) => {
    handleViewDetails(reservationToOrder(reservation));
  };

  useEffect(() => {
    const state = location.state as { orderId?: string; appointmentId?: string; tab?: string } | null;
    if (loading) return;

    if (state?.orderId) {
      const order = orders.find((item) => item.id === state.orderId);
      if (order) {
        setSelectedOrder(order);
        setShowOrderDetails(true);
        void markOrderNotificationsSeen(order.id, order.status);
      }
    } else if (state?.appointmentId) {
      const reservation = reservations.find((item) => item.id === state.appointmentId);
      if (reservation) {
        setSelectedOrder(reservationToOrder(reservation));
        setShowOrderDetails(true);
        void markReservationNotificationsSeen(reservation.id, reservation.status);
      }
    }

    if (state?.orderId || state?.appointmentId) {
      navigate('/client-orders', {
        replace: true,
        state: state.tab ? { tab: state.tab } : undefined,
      });
    }
  }, [location.state, loading, orders, reservations, navigate, markOrderNotificationsSeen, markReservationNotificationsSeen]);

  const handleReviewOrder = (orderId: string) => {
    setReviewOrderId(orderId);
    setShowReviewModal(true);
  };

  const handleViewInvoice = (orderId: string) => {
    setInvoiceOrderId(orderId);
    setShowInvoice(true);
  };

  const handleReviewSubmitted = async () => {
    if (reviewOrderId) {
      setReviewedOrders((prev) => new Set([...prev, reviewOrderId]));
    }
    setShowReviewModal(false);
    setReviewOrderId(null);
    await fetchOrders(true);
    await checkOrdersForReviews();
  };

  const handleOrderAgain = (order: Order) => {
    let added = 0;
    order.order_items.forEach((item) => {
      if (item.item_type === 'product') {
        addItem({
          id: item.item_id,
          type: 'product',
          name: item.item_name,
          price: item.unit_price,
          currency: item.currency,
          image_url: item.item_image_url || '',
          provider_id: item.provider_id,
          provider_name: item.provider_name,
          description: item.item_description,
          delivery_fee: item.delivery_fee,
          has_delivery: item.has_delivery,
          has_pickup: item.has_pickup,
        });
        added += 1;
      }
    });

    if (added > 0) {
      toast({
        title: 'Productos agregados al carrito',
        description: `${added} producto${added !== 1 ? 's' : ''} listo${added !== 1 ? 's' : ''} para comprar de nuevo.`,
      });
      navigate('/marketplace/products');
    }
  };

  const canReviewOrder = (id: string, status: string, paymentStatus?: string) => {
    if (activeTab === 'pedidos') {
      return (status === 'delivered' || status === 'confirmed') && paymentStatus === 'completed' && !reviewedOrders.has(id);
    }
    return status === 'completed' && !reviewedOrders.has(id);
  };

  const isReviewed = (id: string) => reviewedOrders.has(id);

  const renderStatusChips = () => (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {statusChips.map((chip) => {
        const active = statusFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setStatusFilter(chip.id)}
            className={cn(
              'min-h-[40px] rounded-xl px-2 py-2 text-[11px] font-medium transition-all duration-200 text-center leading-tight',
              active
                ? 'bg-landing-aqua text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-landing-aqua/40 hover:text-landing-aqua-dark',
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );

  const renderFiltersPanel = (searchPlaceholder: string, itemLabel: string) => (
    <div className={filterPanelClass}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 min-h-[44px] rounded-xl border-gray-200/80 bg-white/90"
        />
      </div>

      {renderStatusChips()}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10',
            showFilters && 'bg-landing-aqua/10'
          )}
        >
          <Filter className="w-4 h-4" />
          Más filtros
          {showFilters && <X className="w-4 h-4" />}
        </Button>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchOrders(true)}
          className="min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark"
        >
          <RefreshCw className={cn('w-4 h-4 mr-1', refreshing && 'animate-spin')} />
          Actualizar
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="text-red-600 hover:bg-red-50 min-h-[44px]">
            <RotateCcw className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}

        <span className="text-sm font-medium text-gray-600 ml-auto bg-white/60 px-3 py-2 rounded-full whitespace-nowrap">
          {filteredData.length} de {totalCount} {itemLabel}
        </span>
      </div>

      {showFilters && (
        <div className="pt-4 border-t border-gray-100/80">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Período</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="min-h-[44px] rounded-xl">
              <SelectValue placeholder="Seleccionar período" />
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
      )}
    </div>
  );

  const renderPedidoCard = (order: Order) => {
    const previewImage = getOrderPreviewImage(order);
    const productCount = order.order_items?.filter((i) => i.item_type === 'product').length || 0;
    const status = getStatusBadge(order.status);
    const payment = getPaymentStatusBadge(order.payment_status);
    const hasUnread = orderHasUnread(order.id, order.status);

    return (
      <MobileSectionCard variant="plain"
        key={order.id}
        className={cn('p-4', hasUnread && 'ring-2 ring-amber-300/80 ring-offset-1')}
      >
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
            {previewImage ? (
              <img src={previewImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-landing-aqua/15">
                <Package className="w-7 h-7 text-landing-aqua-dark" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">Orden #{order.order_number}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{formatDateShort(order.created_at)}</p>
                {hasUnread && (
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                    Nueva actualización
                  </span>
                )}
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', status.className)}>
                {status.text}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {productCount} producto{productCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 font-semibold text-gray-900">
                <CreditCard className="w-3.5 h-3.5" />
                {formatPrice(order.grand_total, order.currency)}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', payment.className)}>
                {payment.text}
              </span>
            </div>

            {order.order_items?.[0] && (
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                {order.order_items.slice(0, 2).map((i) => i.item_name).join(' · ')}
                {(order.order_items.length || 0) > 2 ? '…' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(order)}
            className="min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark"
          >
            <Eye className="w-4 h-4 mr-1" />
            Detalles
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewInvoice(order.id)}
            className="min-h-[40px] border-landing-mango/30 text-landing-mango-dark hover:bg-landing-mango/10"
          >
            <FileText className="w-4 h-4 mr-1" />
            Factura
          </Button>
          {canReviewOrder(order.id, order.status, order.payment_status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReviewOrder(order.id)}
              className="min-h-[40px] col-span-2 border-landing-aqua/30 text-landing-aqua-dark"
            >
              <Star className="w-4 h-4 mr-1" />
              Calificar compra
            </Button>
          )}
          {isReviewed(order.id) && (
            <div className="col-span-2 flex items-center justify-center gap-2 py-2 bg-landing-mint/15 text-landing-mint-dark rounded-xl text-xs font-medium">
              <Star className="w-4 h-4" />
              Ya calificaste esta compra
            </div>
          )}
          {order.status === 'delivered' && (
            <Button size="sm" onClick={() => handleOrderAgain(order)} className={cn('min-h-[40px] col-span-2', landingBtnSolid)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Pedir de nuevo
            </Button>
          )}
        </div>
      </MobileSectionCard>
    );
  };

  const renderReservaCard = (reservation: Reservation) => {
    const status = getStatusBadge(reservation.status);
    const serviceImage = reservation.provider_services?.service_image_url;
    const hasUnread = reservationHasUnread(reservation.id, reservation.status);

    return (
      <MobileSectionCard variant="plain"
        key={reservation.id}
        className={cn('p-4', hasUnread && 'ring-2 ring-amber-300/80 ring-offset-1')}
      >
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
            {serviceImage ? (
              <img src={serviceImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-landing-mango/15">
                <Scissors className="w-7 h-7 text-landing-mango-dark" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{reservation.service_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{reservation.provider_name}</p>
                {hasUnread && (
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                    Nueva actualización
                  </span>
                )}
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', status.className)}>
                {status.text}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateShort(reservation.appointment_date)}
              </span>
              {reservation.appointment_time && (
                <span className="font-medium text-landing-aqua-dark">{reservation.appointment_time}</span>
              )}
              <span className="flex items-center gap-1 font-semibold text-gray-900">
                {formatPrice(reservation.total_price || 0, reservation.currency || 'GTQ')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewReservation(reservation)}
            className="min-h-[40px] col-span-2 border-landing-aqua/30 text-landing-aqua-dark"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver detalles
          </Button>
          {canReviewOrder(reservation.id, reservation.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReviewOrder(reservation.id)}
              className="min-h-[40px] col-span-2 border-landing-aqua/30 text-landing-aqua-dark"
            >
              <Star className="w-4 h-4 mr-1" />
              Calificar servicio
            </Button>
          )}
          {isReviewed(reservation.id) && (
            <div className="col-span-2 flex items-center justify-center gap-2 py-2 bg-landing-mint/15 text-landing-mint-dark rounded-xl text-xs font-medium">
              <Star className="w-4 h-4" />
              Ya calificaste este servicio
            </div>
          )}
        </div>
      </MobileSectionCard>
    );
  };

  const renderEmptyState = (type: 'pedidos' | 'reservas') => {
    const isPedidos = type === 'pedidos';
    const isEmpty = isPedidos ? productOrders.length === 0 : reservations.length === 0;
    const Icon = isPedidos ? ShoppingCart : CalendarDays;

    return (
      <MobileSectionCard variant="plain" className="p-8 text-center">
        <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {isEmpty
            ? isPedidos
              ? 'No tienes pedidos aún'
              : 'No tienes reservas aún'
            : 'Sin resultados'}
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          {isEmpty
            ? isPedidos
              ? 'Cuando compres en el marketplace, tus pedidos aparecerán aquí.'
              : 'Cuando reserves grooming, veterinaria u otro servicio, lo verás aquí.'
            : 'Prueba otro filtro o término de búsqueda.'}
        </p>
        <Button
          onClick={() => navigate(isPedidos ? '/marketplace/products' : '/marketplace/services')}
          className={landingBtnSolid}
        >
          {isPedidos ? 'Explorar productos' : 'Reservar servicio'}
        </Button>
      </MobileSectionCard>
    );
  };

  if (loading) {
    return (
      <DashboardShell variant="plain">
        <div className="space-y-4 animate-pulse">
          <div className="h-28 rounded-2xl bg-white/60" />
          <div className="h-12 rounded-full bg-white/60" />
          <div className="h-40 rounded-2xl bg-white/60" />
          <div className="h-32 rounded-2xl bg-white/60" />
          <div className="h-32 rounded-2xl bg-white/60" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell variant="plain">
      <div className="space-y-1 mt-1">
        <h1 className="text-2xl font-bold text-gray-900">Mis Órdenes</h1>
        <p className="text-sm text-gray-500">Tus compras y reservas</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/marketplace/products')}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm min-h-[36px] bg-white text-landing-aqua-dark border border-landing-aqua/30 hover:bg-landing-aqua/10"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          Productos
        </button>
        <button
          type="button"
          onClick={() => navigate('/marketplace/services')}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm min-h-[36px] bg-white text-landing-aqua-dark border border-landing-aqua/30 hover:bg-landing-aqua/10"
        >
          <Scissors className="w-4 h-4 shrink-0" />
          Servicios
        </button>
      </div>

      {unreadIds.size > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-sm text-amber-900">
          Tienes {unreadIds.size} actualización{unreadIds.size !== 1 ? 'es' : ''} sin revisar en tus
          pedidos y reservas.
        </div>
      )}

      <div className="space-y-4" data-blueprint-guided="explore-orders">
        <MobileTabStrip tabs={orderTabs} activeTab={activeTab} onChange={handleTabChange} variant="solid" accent="aqua" />

        {renderFiltersPanel(
          activeTab === 'pedidos'
            ? 'Buscar por orden, producto o proveedor...'
            : 'Buscar por servicio o proveedor...',
          activeTab === 'pedidos' ? 'pedidos' : 'reservas'
        )}

        {filteredData.length === 0 ? (
          renderEmptyState(activeTab === 'pedidos' ? 'pedidos' : 'reservas')
        ) : (
          <div className="space-y-3">
            {activeTab === 'pedidos'
              ? filteredPedidos.map(renderPedidoCard)
              : filteredReservas.map(renderReservaCard)}
          </div>
        )}
      </div>

      {selectedOrder && (
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="px-4 pt-5 pb-3 border-b border-gray-100 bg-landing-aqua/10">
              <DialogTitle className="flex items-center gap-2 text-lg pr-6">
                {selectedOrder.reservation_data ? (
                  <Scissors className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                ) : (
                  <Package className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                )}
                {selectedOrder.reservation_data ? 'Detalle de reserva' : `Orden #${selectedOrder.order_number}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detalle completo de la orden o reserva seleccionada.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusBadge(selectedOrder.status).className}>
                  {getStatusBadge(selectedOrder.status).text}
                </Badge>
                {!selectedOrder.reservation_data && (
                  <Badge className={getPaymentStatusBadge(selectedOrder.payment_status).className}>
                    {getPaymentStatusBadge(selectedOrder.payment_status).text}
                  </Badge>
                )}
              </div>

              <MobileSectionCard variant="plain" className="p-4 space-y-2 text-sm">
                <h4 className="font-bold text-gray-900 text-sm">Resumen</h4>
                <p><span className="text-gray-500">Fecha:</span> {formatDate(selectedOrder.created_at)}</p>
                {selectedOrder.reservation_data?.appointment_date && (
                  <p><span className="text-gray-500">Cita:</span> {formatDate(selectedOrder.reservation_data.appointment_date)}</p>
                )}
                {selectedOrder.reservation_data?.time_slot?.slot_start_time && (
                  <p>
                    <span className="text-gray-500">Horario:</span>{' '}
                    {selectedOrder.reservation_data.time_slot.slot_start_time.substring(0, 5)} -{' '}
                    {selectedOrder.reservation_data.time_slot.slot_end_time?.substring(0, 5)}
                  </p>
                )}
                <p className="font-semibold text-gray-900">
                  Total: {formatPrice(selectedOrder.grand_total, selectedOrder.currency)}
                </p>
                {selectedOrder.reservation_data && selectedOrder.order_items[0]?.pets?.length ? (
                  <OrderItemPetsList pets={selectedOrder.order_items[0].pets} detailed />
                ) : null}
              </MobileSectionCard>

              <MobileSectionCard variant="plain" className="p-4 space-y-2 text-sm">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  {selectedOrder.reservation_data ? (
                    <>
                      <Phone className="w-4 h-4 text-landing-aqua-dark" />
                      Contacto
                    </>
                  ) : resolveFulfillmentMethod({
                    fulfillment_method: selectedOrder.fulfillment_method,
                    delivery_fee: selectedOrder.delivery_fee,
                    delivery_address: selectedOrder.delivery_address,
                  }) === 'pickup' ? (
                    <>
                      <Store className="w-4 h-4 text-landing-aqua-dark" />
                      {fulfillmentLabel('pickup')}
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 text-landing-aqua-dark" />
                      {fulfillmentLabel('delivery')}
                    </>
                  )}
                </h4>
                {selectedOrder.delivery_name && <p>{selectedOrder.delivery_name}</p>}
                {selectedOrder.delivery_phone && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 shrink-0" />
                    {selectedOrder.delivery_phone}
                  </p>
                )}
                {selectedOrder.delivery_address && (
                  <p className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    {[selectedOrder.delivery_address, selectedOrder.delivery_city].filter(Boolean).join(', ')}
                  </p>
                )}
                {(selectedOrder.delivery_instructions || selectedOrder.reservation_data?.notes) && (
                  <p className="text-gray-600 pt-1 border-t border-gray-100">
                    {selectedOrder.delivery_instructions || selectedOrder.reservation_data?.notes}
                  </p>
                )}
              </MobileSectionCard>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm px-1">
                  {selectedOrder.reservation_data ? 'Servicio' : 'Productos'}
                </h4>
                {selectedOrder.order_items.map((item) => (
                  <MobileSectionCard variant="plain" key={item.id} className="p-3">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {item.item_image_url ? (
                          <img src={item.item_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {item.item_type === 'service' ? (
                              <Scissors className="w-6 h-6 text-gray-400" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-gray-500 truncate">{item.provider_name}</p>
                        <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                        <OrderItemPetsList pets={item.pets || []} detailed={!!selectedOrder.reservation_data} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{formatPrice(item.total_price, item.currency)}</p>
                      </div>
                    </div>
                  </MobileSectionCard>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
              {!selectedOrder.reservation_data && selectedOrder.status === 'delivered' && (
                <Button onClick={() => handleOrderAgain(selectedOrder)} className={cn('w-full min-h-[44px]', landingBtnSolid)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Pedir de nuevo
                </Button>
              )}
              {!selectedOrder.reservation_data && (
                <Button
                  variant="outline"
                  onClick={() => handleViewInvoice(selectedOrder.id)}
                  className="w-full min-h-[44px] border-landing-mango/30 text-landing-mango-dark"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver factura
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowOrderDetails(false)} className="w-full min-h-[44px]">
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {reviewOrderId && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setReviewOrderId(null);
          }}
          orderId={reviewOrderId}
          orderItems={
            orders.find((o) => o.id === reviewOrderId)?.order_items ||
            (() => {
              const reservation = reservations.find((r) => r.id === reviewOrderId);
              if (!reservation) return [];
              return [
                {
                  id: reservation.id,
                  item_type: 'service' as const,
                  item_id: reservation.service_id,
                  item_name: reservation.service_name,
                  provider_id: reservation.provider_id,
                  provider_name: reservation.provider_name,
                },
              ];
            })()
          }
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {invoiceOrderId && (
        <InvoiceViewer
          isOpen={showInvoice}
          onClose={() => {
            setShowInvoice(false);
            setInvoiceOrderId(null);
          }}
          orderId={invoiceOrderId}
        />
      )}
    </DashboardShell>
  );
};

export default ClientOrders;
