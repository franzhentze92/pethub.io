import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminSidebar from './AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { 
  Users, 
  Building2, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Shield,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from './PageHeader';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalShelters: number;
  totalPets: number;
  totalOrders: number;
  totalRevenue: number;
  pendingVerifications: number;
  activeServices: number;
  activeProducts: number;
}

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProviders: 0,
    totalShelters: 0,
    totalPets: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
    activeServices: 0,
    activeProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);

  useEffect(() => {
    // Verify admin access
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }

    loadAdminData();
  }, [user, navigate]);

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'overview';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Load all user profiles with complete information
      // Note: RLS policies might restrict access - we need to ensure admin can see all users
      // Try to load all users - if RLS blocks it, we'll see an error
      let usersData: any[] = [];
      let usersError: any = null;

      // Test if is_admin_user() function works (if available)
      if (user?.email === 'admin@pethubgt.com') {
        try {
          const { data: adminTest, error: adminTestError } = await supabase
            .rpc('is_admin_user');
          
          if (adminTestError) {
            console.warn('is_admin_user() function not available or error:', adminTestError);
            console.warn('This is OK - the function might not be created yet');
          } else {
            console.log('✅ is_admin_user() result:', adminTest);
            if (!adminTest) {
              console.warn('⚠️ WARNING: is_admin_user() returned false for admin user!');
              console.warn('The RLS policy might not be working correctly.');
            }
          }
        } catch (error) {
          console.warn('Could not test is_admin_user() function:', error);
        }
      }

      // First, try the standard query
      const { data: standardUsers, error: standardError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, phone, address, avatar_url, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (standardError) {
        console.error('Error loading users (standard query):', standardError);
        console.error('Error code:', standardError.code);
        console.error('Error message:', standardError.message);
        console.error('Error details:', standardError.details);
        usersError = standardError;
      } else {
        usersData = standardUsers || [];
        console.log('Users loaded from database (standard query):', usersData.length, 'users');
        
        // Log all user IDs to verify we're getting all users
        if (usersData.length > 0) {
          console.log('User IDs retrieved:', usersData.map(u => u.user_id));
        }
      }

      // If we got fewer users than expected, try using RPC function if available
      // or check if RLS is blocking access
      if (usersData.length === 0 && !usersError) {
        console.warn('No users returned - this might be an RLS policy issue');
        console.log('Current user:', user?.email);
        console.log('Current user ID:', user?.id);
      }

      // Log the actual data received
      if (usersData.length > 0) {
        console.log('Sample user data:', usersData[0]);
      }

      // Warn if we're only getting one user but there should be more
      // This usually indicates an RLS policy issue
      if (usersData.length === 1 && user?.email === 'admin@pethubgt.com') {
        console.warn('⚠️ WARNING: Only 1 user returned for admin. This is likely an RLS policy issue.');
        console.warn('Please run the SQL script: supabase_admin_rls_user_profiles.sql');
        console.warn('This will allow the admin to view all user profiles.');
      }

      // Initialize users with stats (we'll calculate email separately if needed)
      const usersWithStats = (usersData || []).map(profile => ({
        ...profile,
        email: 'Cargando...', // Will be updated if we can get it
        petsCount: 0,
        ordersCount: 0,
        totalSpent: 0
      }));

      // Get pets count for each user
      const { data: allPets } = await supabase
        .from('pets')
        .select('owner_id');

      // Get orders count and total spent for each user
      const { data: allOrders } = await supabase
        .from('orders')
        .select('client_id, total_amount');

      // Calculate stats for each user
      const usersWithCalculatedStats = usersWithStats.map(user => {
        const userPets = (allPets || []).filter(pet => pet.owner_id === user.user_id);
        const userOrders = (allOrders || []).filter(order => order.client_id === user.user_id);
        const userTotalSpent = userOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

        return {
          ...user,
          petsCount: userPets.length,
          ordersCount: userOrders.length,
          totalSpent: userTotalSpent
        };
      });

      // Load providers
      const { data: providersData } = await supabase
        .from('providers')
        .select('id, is_verified, created_at, user_id');

      // Load shelters
      const { data: sheltersData } = await supabase
        .from('shelters')
        .select('id, created_at');

      // Load pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('id');

      // Load orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10);

      // Load provider services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('id, is_active');

      // Load provider products
      const { data: productsData } = await supabase
        .from('provider_products')
        .select('id, is_active');

      // Calculate statistics
      const users = usersData || [];
      const providers = providersData || [];
      const shelters = sheltersData || [];
      const pets = petsData || [];
      const orders = ordersData || [];
      const services = servicesData || [];
      const products = productsData || [];

      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const pendingVerifications = providers.filter(p => !p.is_verified).length;
      const activeServices = services.filter(s => s.is_active).length;
      const activeProducts = products.filter(p => p.is_active).length;

      setStats({
        totalUsers: users.length,
        totalProviders: providers.length,
        totalShelters: shelters.length,
        totalPets: pets.length,
        totalOrders: orders.length,
        totalRevenue,
        pendingVerifications,
        activeServices,
        activeProducts
      });

      // Try to get emails from auth.users using a SQL function or RPC call
      // For now, we'll use the user_id to identify users
      // Note: Email access from auth.users requires admin privileges
      // We'll show user_id instead if email is not available
      
      // Set all users with complete information
      setAllUsers(usersWithCalculatedStats);
      
      // Get recent users (last 5)
      const recentUsersList = usersWithCalculatedStats.slice(0, 5);
      setRecentUsers(recentUsersList);

      // Get recent orders
      setRecentOrders(orders);

      // Get pending providers
      const pending = providers
        .filter(p => !p.is_verified)
        .slice(0, 5);
      setPendingProviders(pending);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };


  // Chart data for user growth
  const userGrowthData = recentUsers.map((user, index) => ({
    name: `Usuario ${index + 1}`,
    value: 1
  }));

  // Chart data for orders
  const ordersData = recentOrders.map(order => ({
    date: new Date(order.created_at).toLocaleDateString('es-GT', { month: 'short', day: 'numeric' }),
    amount: order.total_amount || 0
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} stats={{ pendingVerifications: 0 }} />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando panel de administración…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        stats={{ pendingVerifications: stats.pendingVerifications }}
      />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader 
        title="Panel de Administración"
        subtitle="Gestión completa de PetHub"
        gradient="from-purple-600 to-indigo-600"
        showNotifications={false}
      >
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
          <Shield className="w-4 h-4 mr-2" />
          Administrador
        </Badge>
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5" />
              <TrendingUp className="w-4 h-4 opacity-75" />
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="text-sm opacity-90">Usuarios Totales</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5" />
              <TrendingUp className="w-4 h-4 opacity-75" />
            </div>
            <div className="text-2xl font-bold">{stats.totalProviders}</div>
            <div className="text-sm opacity-90">Proveedores</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5" />
              <TrendingUp className="w-4 h-4 opacity-75" />
            </div>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm opacity-90">Órdenes Totales</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5" />
              <TrendingUp className="w-4 h-4 opacity-75" />
            </div>
            <div className="text-2xl font-bold">Q{stats.totalRevenue.toFixed(2)}</div>
            <div className="text-sm opacity-90">Ingresos Totales</div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Refugios</p>
                <p className="text-2xl font-bold">{stats.totalShelters}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mascotas</p>
                <p className="text-2xl font-bold">{stats.totalPets}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verificaciones Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingVerifications}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servicios Activos</p>
                <p className="text-2xl font-bold">{stats.activeServices}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="orders">Órdenes</TabsTrigger>
          <TabsTrigger value="verifications">
            Verificaciones
            {stats.pendingVerifications > 0 && (
              <Badge className="ml-2 bg-orange-500">{stats.pendingVerifications}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Ingresos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Clientes</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {stats.totalUsers - stats.totalProviders - stats.totalShelters}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Proveedores</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {stats.totalProviders}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Refugios</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-600">
                      {stats.totalShelters}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usuarios ({allUsers.length})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Total: {allUsers.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Usuario</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">ID Usuario</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Rol</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Teléfono</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Mascotas</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Órdenes</th>
                          <th className="text-right p-3 text-sm font-semibold text-gray-700">Total Gastado</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Fecha Registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.full_name || 'Usuario'}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {(user.full_name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {user.full_name || 'Sin nombre'}
                                  </p>
                                  {user.address && (
                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{user.address}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-gray-700 font-mono text-xs">
                                {user.user_id.slice(0, 8)}...
                              </p>
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant="outline"
                                className={
                                  user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                  user.role === 'provider' ? 'bg-green-100 text-green-800 border-green-300' :
                                  user.role === 'shelter' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  'bg-gray-100 text-gray-800 border-gray-300'
                                }
                              >
                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Sin rol'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-gray-700">{user.phone || 'N/A'}</p>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {user.petsCount || 0}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                {user.ordersCount || 0}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <p className="text-sm font-semibold text-green-600">
                                Q{(user.totalSpent || 0).toFixed(2)}
                              </p>
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-gray-600">
                                {new Date(user.created_at).toLocaleDateString('es-GT', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg font-medium">No hay usuarios registrados</p>
                    <p className="text-gray-400 text-sm mt-2">Los usuarios aparecerán aquí cuando se registren</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Orden #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('es-GT')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">Q{order.total_amount?.toFixed(2) || '0.00'}</p>
                        <Badge 
                          variant={order.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {order.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No hay órdenes recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verificaciones Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingProviders.length > 0 ? (
                  pendingProviders.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">Proveedor #{provider.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-500">
                            Registrado: {new Date(provider.created_at).toLocaleDateString('es-GT')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        Pendiente
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <p className="text-gray-500">No hay verificaciones pendientes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

