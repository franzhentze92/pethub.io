import React, { useState, useEffect } from 'react';
import { SectionLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Activity,
  Users,
  RefreshCw,
  Calendar,
  DollarSign,
  ShoppingBag,
  Stethoscope,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface OperationalStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalServices: number;
  avgOrderValue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  productsThisMonth: number;
  servicesThisMonth: number;
}

interface ProductSales {
  name: string;
  value: number;
  quantity: number;
}

interface ServiceSales {
  name: string;
  value: number;
  quantity: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AdminOperationalAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OperationalStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalServices: 0,
    avgOrderValue: 0,
    ordersThisMonth: 0,
    revenueThisMonth: 0,
    productsThisMonth: 0,
    servicesThisMonth: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [serviceSales, setServiceSales] = useState<ServiceSales[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState<string>('6months'); // 'week', 'month', '3months', '6months', 'year'
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'delivered', 'completed', etc.

  useEffect(() => {
    loadOperationalData();
  }, [dateRange, statusFilter]);

  const loadOperationalData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      }

      // Build query for orders
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          grand_total,
          created_at,
          status,
          order_items (
            id,
            item_type,
            item_name,
            quantity,
            total_price
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        ordersQuery = ordersQuery.eq('status', statusFilter);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        toast.error('Error al cargar órdenes');
        return;
      }

      // Calculate statistics
      const totalOrders = ordersData?.length || 0;
      const totalRevenue = (ordersData || []).reduce((sum, order) => sum + (order.grand_total || 0), 0);
      
      // Count products and services
      let totalProducts = 0;
      let totalServices = 0;
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      const serviceMap = new Map<string, { quantity: number; revenue: number }>();

      (ordersData || []).forEach((order: any) => {
        (order.order_items || []).forEach((item: any) => {
          if (item.item_type === 'product') {
            totalProducts += item.quantity || 0;
            const current = productMap.get(item.item_name) || { quantity: 0, revenue: 0 };
            productMap.set(item.item_name, {
              quantity: current.quantity + (item.quantity || 0),
              revenue: current.revenue + (item.total_price || 0)
            });
          } else if (item.item_type === 'service') {
            totalServices += item.quantity || 0;
            const current = serviceMap.get(item.item_name) || { quantity: 0, revenue: 0 };
            serviceMap.set(item.item_name, {
              quantity: current.quantity + (item.quantity || 0),
              revenue: current.revenue + (item.total_price || 0)
            });
          }
        });
      });

      // This month stats
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ordersThisMonth = (ordersData || []).filter((order: any) => 
        new Date(order.created_at) >= monthStart
      );
      const revenueThisMonth = ordersThisMonth.reduce((sum: number, order: any) => sum + (order.grand_total || 0), 0);
      
      let productsThisMonth = 0;
      let servicesThisMonth = 0;
      ordersThisMonth.forEach((order: any) => {
        (order.order_items || []).forEach((item: any) => {
          if (item.item_type === 'product') {
            productsThisMonth += item.quantity || 0;
          } else if (item.item_type === 'service') {
            servicesThisMonth += item.quantity || 0;
          }
        });
      });

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalOrders,
        totalRevenue,
        totalProducts,
        totalServices,
        avgOrderValue,
        ordersThisMonth: ordersThisMonth.length,
        revenueThisMonth,
        productsThisMonth,
        servicesThisMonth
      });

      // Prepare product sales data for pie chart
      const productSalesArray: ProductSales[] = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          value: data.revenue,
          quantity: data.quantity
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 products

      setProductSales(productSalesArray);

      // Prepare service sales data for pie chart
      const serviceSalesArray: ServiceSales[] = Array.from(serviceMap.entries())
        .map(([name, data]) => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          value: data.revenue,
          quantity: data.quantity
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 services

      setServiceSales(serviceSalesArray);

      // Prepare time series data
      const timeSeriesMap = new Map<string, { orders: number; revenue: number; products: number; services: number }>();
      
      (ordersData || []).forEach((order: any) => {
        const date = new Date(order.created_at);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const current = timeSeriesMap.get(dateKey) || { orders: 0, revenue: 0, products: 0, services: 0 };
        current.orders += 1;
        current.revenue += order.grand_total || 0;
        
        (order.order_items || []).forEach((item: any) => {
          if (item.item_type === 'product') {
            current.products += item.quantity || 0;
          } else if (item.item_type === 'service') {
            current.services += item.quantity || 0;
          }
        });
        
        timeSeriesMap.set(dateKey, current);
      });

      // Convert to array and sort by date
      const timeSeriesArray = Array.from(timeSeriesMap.entries())
        .map(([dateKey, data]) => ({
          date: new Date(dateKey).toLocaleDateString('es-GT', { month: 'short', day: 'numeric' }),
          dateKey: dateKey, // Keep original date key for sorting
          orders: data.orders,
          revenue: data.revenue,
          products: data.products,
          services: data.services
        }))
        .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());

      setTimeSeriesData(timeSeriesArray);

    } catch (error: any) {
      console.error('Error loading operational data:', error);
      toast.error('Error al cargar datos operativos', {
        description: error.message || 'No se pudieron cargar los datos'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-16">
        <PageHeader 
          title="Análisis Operativo" 
          description="Análisis de operaciones, productos y servicios vendidos"
        />
        
        <div className="p-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Rango de Fechas</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="week">Última Semana</option>
                    <option value="month">Este Mes</option>
                    <option value="3months">Últimos 3 Meses</option>
                    <option value="6months">Últimos 6 Meses</option>
                    <option value="year">Este Año</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Estado de Orden</label>
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
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={loadOperationalData}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar Datos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.ordersThisMonth} este mes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Q{stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Q{stats.revenueThisMonth.toFixed(2)} este mes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
                <ShoppingBag className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.totalProducts}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.productsThisMonth} este mes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Servicios Vendidos</CardTitle>
                <Stethoscope className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.totalServices}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.servicesThisMonth} este mes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">Q{stats.avgOrderValue.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">Por orden</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ratio Productos/Servicios</CardTitle>
                <Activity className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
                  {stats.totalProducts > 0 && stats.totalServices > 0
                    ? (stats.totalProducts / stats.totalServices).toFixed(2)
                    : '0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Productos por servicio</p>
              </CardContent>
            </Card>
          </div>

          {/* Time Series Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Órdenes y Ingresos en el Tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SectionLoader />
                ) : timeSeriesData.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">No hay datos para mostrar</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="orders" 
                        stackId="1" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.6} 
                        name="Órdenes" 
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Ingresos (Q)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos vs Servicios en el Tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SectionLoader />
                ) : timeSeriesData.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">No hay datos para mostrar</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="products" fill="#8b5cf6" name="Productos" />
                      <Bar dataKey="services" fill="#f59e0b" name="Servicios" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Productos Vendidos (por Ingresos)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SectionLoader />
                ) : productSales.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">No hay productos vendidos</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={productSales}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {productSales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `Q${value.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {productSales.slice(0, 5).map((product, index) => (
                        <div key={product.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">Q{product.value.toFixed(2)}</span>
                            <span className="text-gray-500 ml-2">({product.quantity} unidades)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Servicios Vendidos (por Ingresos)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SectionLoader />
                ) : serviceSales.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">No hay servicios vendidos</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={serviceSales}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {serviceSales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `Q${value.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {serviceSales.slice(0, 5).map((service, index) => (
                        <div key={service.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{service.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">Q{service.value.toFixed(2)}</span>
                            <span className="text-gray-500 ml-2">({service.quantity} servicios)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOperationalAnalysisPage;

