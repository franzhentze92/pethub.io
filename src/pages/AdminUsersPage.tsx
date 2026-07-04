import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Building2,
  Shield,
  Mail,
  Phone,
  Calendar,
  Activity,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { toast } from 'sonner';

interface User {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: 'client' | 'provider' | 'shelter' | 'admin' | 'delivery' | null;
  created_at: string;
  updated_at: string;
  petsCount: number;
  ordersCount: number;
  totalSpent: number;
}

interface UserStats {
  totalUsers: number;
  totalClients: number;
  totalProviders: number;
  totalShelters: number;
  totalAdmins: number;
  newUsersThisMonth: number;
  activeUsers: number;
  totalRevenue: number;
  avgOrdersPerUser: number;
}

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalClients: 0,
    totalProviders: 0,
    totalShelters: 0,
    totalAdmins: 0,
    newUsersThisMonth: 0,
    activeUsers: 0,
    totalRevenue: 0,
    avgOrdersPerUser: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'orders' | 'spent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Verify admin access
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }

    loadUsersData();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        (u.full_name?.toLowerCase().includes(searchLower)) ||
        (u.phone?.toLowerCase().includes(searchLower)) ||
        (u.user_id.toLowerCase().includes(searchLower)) ||
        (u.address?.toLowerCase().includes(searchLower))
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '');
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'orders':
          comparison = (a.ordersCount || 0) - (b.ordersCount || 0);
          break;
        case 'spent':
          comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, sortBy, sortOrder]);

  const loadUsersData = async () => {
    try {
      setLoading(true);

      // Load all user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, phone, address, avatar_url, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }

      console.log('Users loaded:', usersData?.length || 0);

      // Get pets count for each user
      const { data: allPets } = await supabase
        .from('pets')
        .select('owner_id');

      // Get orders count and total spent for each user
      const { data: allOrders } = await supabase
        .from('orders')
        .select('client_id, total_amount');

      // Calculate stats for each user
      const usersWithStats = (usersData || []).map(profile => {
        const userPets = (allPets || []).filter(pet => pet.owner_id === profile.user_id);
        const userOrders = (allOrders || []).filter(order => order.client_id === profile.user_id);
        const userTotalSpent = userOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

        return {
          ...profile,
          petsCount: userPets.length,
          ordersCount: userOrders.length,
          totalSpent: userTotalSpent
        };
      });

      setUsers(usersWithStats);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalClients = usersWithStats.filter(u => u.role === 'client' || !u.role).length;
      const totalProviders = usersWithStats.filter(u => u.role === 'provider').length;
      const totalShelters = usersWithStats.filter(u => u.role === 'shelter').length;
      const totalAdmins = usersWithStats.filter(u => u.role === 'admin').length;
      
      const newUsersThisMonth = usersWithStats.filter(u => 
        new Date(u.created_at) >= startOfMonth
      ).length;
      
      const activeUsers = usersWithStats.filter(u => 
        (u.ordersCount || 0) > 0 || (u.petsCount || 0) > 0
      ).length;
      
      const totalRevenue = usersWithStats.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
      const totalOrders = usersWithStats.reduce((sum, u) => sum + (u.ordersCount || 0), 0);
      const avgOrdersPerUser = usersWithStats.length > 0 
        ? (totalOrders / usersWithStats.length).toFixed(1)
        : '0';

      setStats({
        totalUsers: usersWithStats.length,
        totalClients,
        totalProviders,
        totalShelters,
        totalAdmins,
        newUsersThisMonth,
        activeUsers,
        totalRevenue,
        avgOrdersPerUser: parseFloat(avgOrdersPerUser)
      });

    } catch (error) {
      console.error('Error loading users data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      // Create CSV headers
      const headers = ['ID', 'Nombre', 'Rol', 'Teléfono', 'Dirección', 'Mascotas', 'Órdenes', 'Total Gastado', 'Fecha Registro'];
      
      // Create CSV rows
      const rows = filteredUsers.map(user => [
        user.user_id,
        user.full_name || 'Sin nombre',
        user.role || 'Sin rol',
        user.phone || 'N/A',
        user.address || 'N/A',
        user.petsCount || 0,
        user.ordersCount || 0,
        (user.totalSpent || 0).toFixed(2),
        new Date(user.created_at).toLocaleDateString('es-GT')
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
      link.setAttribute('download', `usuarios_pethub_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      toast.error('Error al exportar el archivo CSV');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar activeTab="users" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando usuarios…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="users" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader 
            title="Gestión de Usuarios"
            subtitle="Administra todos los usuarios de la plataforma"
            gradient="from-blue-600 to-indigo-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                onClick={loadUsersData}
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
                  <Users className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm opacity-90">Total de Usuarios</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <UserPlus className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.newUsersThisMonth}</div>
                <div className="text-sm opacity-90">Nuevos este Mes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <div className="text-sm opacity-90">Usuarios Activos</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.avgOrdersPerUser}</div>
                <div className="text-sm opacity-90">Órdenes Promedio</div>
              </CardContent>
            </Card>
          </div>

          {/* Role Distribution Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Clientes</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalClients}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Proveedores</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalProviders}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Refugios</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.totalShelters}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Administradores</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalAdmins}</p>
                  </div>
                  <Shield className="w-8 h-8 text-purple-500" />
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
                      placeholder="Buscar por nombre, teléfono, ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos los Roles</option>
                    <option value="client">Clientes</option>
                    <option value="provider">Proveedores</option>
                    <option value="shelter">Refugios</option>
                    <option value="admin">Administradores</option>
                    <option value="delivery">Delivery</option>
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
                    <option value="name-asc">Nombre A-Z</option>
                    <option value="name-desc">Nombre Z-A</option>
                    <option value="orders-desc">Más Órdenes</option>
                    <option value="orders-asc">Menos Órdenes</option>
                    <option value="spent-desc">Más Gastado</option>
                    <option value="spent-asc">Menos Gastado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usuarios ({filteredUsers.length} de {stats.totalUsers})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredUsers.length} usuarios
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Usuario</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">ID Usuario</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Rol</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Contacto</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Mascotas</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Órdenes</th>
                        <th className="text-right p-3 text-sm font-semibold text-gray-700">Total Gastado</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
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
                                user.role === 'delivery' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }
                            >
                              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Sin rol'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {user.phone && (
                                <div className="flex items-center gap-1 text-sm text-gray-700">
                                  <Phone className="w-3 h-3" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                              {!user.phone && (
                                <span className="text-sm text-gray-400">N/A</span>
                              )}
                            </div>
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
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || roleFilter !== 'all' 
                      ? 'No se encontraron usuarios con los filtros aplicados' 
                      : 'No hay usuarios registrados'}
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
    </div>
  );
};

export default AdminUsersPage;

