import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Footprints,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  User,
  MapPin,
  DollarSign,
  PawPrint,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface WalkRequest {
  id: string;
  client_id: string;
  walker_id: string;
  pet_id: string;
  status: string;
  message?: string | null;
  requested_date: string;
  requested_time?: string | null;
  duration_minutes: number;
  price: number;
  order_id?: string | null;
  created_at: string;
  updated_at: string;
  pet?: { name: string; breed?: string | null } | null;
  client?: { full_name: string | null; phone: string | null } | null;
  walker?: { full_name: string | null; phone: string | null } | null;
}

interface WalkerProfile {
  id: string;
  user_id: string;
  bio?: string | null;
  hourly_rate: number;
  location_label: string;
  is_active: boolean;
  max_dogs: number;
  experience_years: number;
  coverage_radius_km?: number;
  created_at: string;
  profile?: { full_name: string | null; phone: string | null } | null;
}

interface WalkStats {
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  paidRequests: number;
  activeWalkers: number;
  totalRevenue: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  paid: 'Pagada',
  completed: 'Completada',
};

const AdminDogWalksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'requests' | 'walkers'>('requests');
  const [requests, setRequests] = useState<WalkRequest[]>([]);
  const [walkers, setWalkers] = useState<WalkerProfile[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<WalkRequest[]>([]);
  const [filteredWalkers, setFilteredWalkers] = useState<WalkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WalkRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<WalkStats>({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    paidRequests: 0,
    activeWalkers: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }
    void loadData();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...requests];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.pet?.name?.toLowerCase().includes(q) ||
          r.client?.full_name?.toLowerCase().includes(q) ||
          r.walker?.full_name?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter]);

  useEffect(() => {
    let filtered = [...walkers];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.profile?.full_name?.toLowerCase().includes(q) ||
          w.location_label.toLowerCase().includes(q) ||
          w.bio?.toLowerCase().includes(q),
      );
    }
    setFilteredWalkers(filtered);
  }, [walkers, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: requestData, error: requestError } = await supabase
        .from('dog_walk_requests')
        .select(`
          *,
          pet:pets(name, breed)
        `)
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;

      const userIds = new Set<string>();
      for (const r of requestData ?? []) {
        userIds.add(r.client_id);
        userIds.add(r.walker_id);
      }

      let profiles: Record<string, { full_name: string | null; phone: string | null }> = {};
      if (userIds.size > 0) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', [...userIds]);
        profiles = (profileData ?? []).reduce(
          (acc, p) => {
            acc[p.user_id] = p;
            return acc;
          },
          {} as Record<string, { full_name: string | null; phone: string | null }>,
        );
      }

      const enrichedRequests: WalkRequest[] = (requestData ?? []).map((r) => ({
        ...r,
        client: profiles[r.client_id] ?? null,
        walker: profiles[r.walker_id] ?? null,
      }));
      setRequests(enrichedRequests);

      const { data: walkerData, error: walkerError } = await supabase
        .from('dog_walker_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (walkerError) throw walkerError;

      const walkerUserIds = (walkerData ?? []).map((w) => w.user_id);
      let walkerProfiles: Record<string, { full_name: string | null; phone: string | null }> = {};
      if (walkerUserIds.length > 0) {
        const { data: wp } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', walkerUserIds);
        walkerProfiles = (wp ?? []).reduce(
          (acc, p) => {
            acc[p.user_id] = p;
            return acc;
          },
          {} as Record<string, { full_name: string | null; phone: string | null }>,
        );
      }

      setWalkers(
        (walkerData ?? []).map((w) => ({
          ...w,
          profile: walkerProfiles[w.user_id] ?? null,
        })),
      );

      setStats({
        totalRequests: enrichedRequests.length,
        pendingRequests: enrichedRequests.filter((r) => r.status === 'pending').length,
        acceptedRequests: enrichedRequests.filter((r) => r.status === 'accepted').length,
        paidRequests: enrichedRequests.filter((r) => r.status === 'paid' || r.status === 'completed').length,
        activeWalkers: (walkerData ?? []).filter((w) => w.is_active).length,
        totalRevenue: enrichedRequests
          .filter((r) => r.status === 'paid' || r.status === 'completed')
          .reduce((sum, r) => sum + Number(r.price), 0),
      });
    } catch (error) {
      console.error('Error loading dog walks admin data:', error);
      toast.error('Error al cargar datos de paseos');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('dog_walk_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Estado actualizado');
      setShowDetails(false);
      void loadData();
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const toggleWalkerActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('dog_walker_profiles')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(isActive ? 'Paseador desactivado' : 'Paseador activado');
      void loadData();
    } catch {
      toast.error('No se pudo actualizar el paseador');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-600',
      paid: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge className={colors[status] ?? 'bg-gray-100 text-gray-700'}>
        {STATUS_LABELS[status] ?? status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <PageLoader variant="inline" message="Cargando paseos…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <PageHeader
            title="Paseos"
            subtitle="Gestiona solicitudes de paseo y perfiles de paseadores"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total solicitudes', value: stats.totalRequests, icon: Footprints },
              { label: 'Pendientes', value: stats.pendingRequests, icon: Clock },
              { label: 'Aceptadas', value: stats.acceptedRequests, icon: CheckCircle },
              { label: 'Pagadas', value: stats.paidRequests, icon: DollarSign },
              { label: 'Paseadores activos', value: stats.activeWalkers, icon: User },
              { label: 'Ingresos (Q.)', value: stats.totalRevenue.toFixed(0), icon: TrendingUp },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <item.icon className="w-8 h-8 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-xl font-bold">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'requests' ? 'default' : 'outline'}
              onClick={() => setActiveTab('requests')}
            >
              Solicitudes
            </Button>
            <Button
              variant={activeTab === 'walkers' ? 'default' : 'outline'}
              onClick={() => setActiveTab('walkers')}
            >
              Paseadores
            </Button>
            <Button variant="outline" size="icon" onClick={() => void loadData()} aria-label="Recargar">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <CardTitle className="text-lg">
                  {activeTab === 'requests' ? 'Solicitudes de paseo' : 'Perfiles de paseadores'}
                </CardTitle>
                <div className="flex gap-2">
                  {activeTab === 'requests' && (
                    <select
                      className="border rounded-md px-3 py-2 text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Todos los estados</option>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'requests' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-4">Mascota</th>
                        <th className="pb-2 pr-4">Cliente</th>
                        <th className="pb-2 pr-4">Paseador</th>
                        <th className="pb-2 pr-4">Fecha</th>
                        <th className="pb-2 pr-4">Precio</th>
                        <th className="pb-2 pr-4">Estado</th>
                        <th className="pb-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
                            No hay solicitudes
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((r) => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-3 pr-4 font-medium">{r.pet?.name ?? '—'}</td>
                            <td className="py-3 pr-4">{r.client?.full_name ?? '—'}</td>
                            <td className="py-3 pr-4">{r.walker?.full_name ?? '—'}</td>
                            <td className="py-3 pr-4">{r.requested_date}</td>
                            <td className="py-3 pr-4">Q.{Number(r.price).toFixed(2)}</td>
                            <td className="py-3 pr-4">{statusBadge(r.status)}</td>
                            <td className="py-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRequest(r);
                                  setShowDetails(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-4">Nombre</th>
                        <th className="pb-2 pr-4">Zona</th>
                        <th className="pb-2 pr-4">Tarifa/h</th>
                        <th className="pb-2 pr-4">Radio</th>
                        <th className="pb-2 pr-4">Exp.</th>
                        <th className="pb-2 pr-4">Estado</th>
                        <th className="pb-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWalkers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
                            No hay paseadores registrados
                          </td>
                        </tr>
                      ) : (
                        filteredWalkers.map((w) => (
                          <tr key={w.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-3 pr-4 font-medium">{w.profile?.full_name ?? '—'}</td>
                            <td className="py-3 pr-4">{w.location_label}</td>
                            <td className="py-3 pr-4">Q.{w.hourly_rate}</td>
                            <td className="py-3 pr-4">{w.coverage_radius_km ?? 3} km</td>
                            <td className="py-3 pr-4">{w.experience_years} años</td>
                            <td className="py-3 pr-4">
                              <Badge className={w.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                                {w.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void toggleWalkerActive(w.id, w.is_active)}
                              >
                                {w.is_active ? 'Desactivar' : 'Activar'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de solicitud</DialogTitle>
            <DialogDescription>Información completa del paseo</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-500">Mascota</Label>
                  <p className="font-medium flex items-center gap-1">
                    <PawPrint className="w-4 h-4" />
                    {selectedRequest.pet?.name ?? '—'}
                  </p>
                </div>
                <div>{statusBadge(selectedRequest.status)}</div>
                <div>
                  <Label className="text-gray-500">Cliente</Label>
                  <p>{selectedRequest.client?.full_name ?? '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Paseador</Label>
                  <p>{selectedRequest.walker?.full_name ?? '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Fecha</Label>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedRequest.requested_date}
                    {selectedRequest.requested_time ? ` ${selectedRequest.requested_time.slice(0, 5)}` : ''}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Precio</Label>
                  <p>Q.{Number(selectedRequest.price).toFixed(2)} · {selectedRequest.duration_minutes} min</p>
                </div>
              </div>
              {selectedRequest.message && (
                <div>
                  <Label className="text-gray-500">Mensaje</Label>
                  <p className="bg-gray-50 rounded-lg p-3 mt-1">{selectedRequest.message}</p>
                </div>
              )}
              <p className="text-xs text-gray-400">
                Creado: {format(new Date(selectedRequest.created_at), 'PPp', { locale: es })}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['completed', 'cancelled'].includes(selectedRequest.status) ? null : (
                  <>
                    {selectedRequest.status !== 'paid' && (
                      <Button size="sm" onClick={() => void updateRequestStatus(selectedRequest.id, 'paid')}>
                        Marcar pagada
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateRequestStatus(selectedRequest.id, 'completed')}
                    >
                      Completada
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => void updateRequestStatus(selectedRequest.id, 'cancelled')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDogWalksPage;
