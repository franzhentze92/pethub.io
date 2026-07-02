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
  Heart,
  Search,
  TrendingUp,
  Download,
  RefreshCw,
  Eye,
  User,
  Tag,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Calendar,
  Scale,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  weight?: number | null;
  microchip?: string | null;
  available_for_breeding: boolean;
  image_url?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: {
    full_name: string | null;
    phone: string | null;
  };
}

interface PetStats {
  totalPets: number;
  petsThisMonth: number;
  totalSpecies: number;
  avgAge: number;
  avgWeight: number;
  breedingAvailable: number;
  withMicrochip: number;
}

const AdminPetsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [stats, setStats] = useState<PetStats>({
    totalPets: 0,
    petsThisMonth: 0,
    totalSpecies: 0,
    avgAge: 0,
    avgWeight: 0,
    breedingAvailable: 0,
    withMicrochip: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [breedingFilter, setBreedingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'age' | 'weight' | 'species' | 'owner'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Verify admin access
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }

    loadPetsData();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...pets];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pet => 
        pet.name?.toLowerCase().includes(searchLower) ||
        pet.breed?.toLowerCase().includes(searchLower) ||
        pet.microchip?.toLowerCase().includes(searchLower) ||
        pet.owner?.full_name?.toLowerCase().includes(searchLower) ||
        pet.owner?.phone?.toLowerCase().includes(searchLower) ||
        pet.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply species filter
    if (speciesFilter !== 'all') {
      filtered = filtered.filter(pet => pet.species?.toLowerCase() === speciesFilter.toLowerCase());
    }

    // Apply breeding filter
    if (breedingFilter !== 'all') {
      if (breedingFilter === 'available') {
        filtered = filtered.filter(pet => pet.available_for_breeding);
      } else if (breedingFilter === 'not_available') {
        filtered = filtered.filter(pet => !pet.available_for_breeding);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'age':
          comparison = (a.age || 0) - (b.age || 0);
          break;
        case 'weight':
          comparison = (a.weight || 0) - (b.weight || 0);
          break;
        case 'species':
          comparison = (a.species || '').localeCompare(b.species || '');
          break;
        case 'owner':
          comparison = (a.owner?.full_name || '').localeCompare(b.owner?.full_name || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredPets(filtered);
  }, [pets, searchTerm, speciesFilter, breedingFilter, sortBy, sortOrder]);

  const loadPetsData = async () => {
    try {
      setLoading(true);

      // Load all pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (petsError) {
        console.error('Error loading pets:', petsError);
        return;
      }

      console.log('Pets loaded:', petsData?.length || 0);

      // Get unique owner IDs
      const ownerIds = [...new Set((petsData || []).map(p => p.owner_id).filter(Boolean))];
      console.log('Owner IDs to fetch:', ownerIds);
      console.log('Number of unique owners:', ownerIds.length);
      
      // Load owner information only if we have owner IDs
      let ownersData: any[] = [];
      if (ownerIds.length > 0) {
        const { data, error: ownersError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', ownerIds);

        if (ownersError) {
          console.error('Error loading owner information:', ownersError);
          console.error('Error details:', JSON.stringify(ownersError, null, 2));
        } else {
          ownersData = data || [];
          console.log('Owners loaded:', ownersData.length);
          console.log('Owners data sample:', ownersData.slice(0, 3));
        }
      } else {
        console.warn('No owner IDs found in pets data');
      }

      // Create a map of owner_id to owner info
      const ownersMap = new Map(
        ownersData.map(owner => [owner.user_id, owner])
      );

      console.log('Owners map size:', ownersMap.size);
      if (ownersMap.size > 0) {
        console.log('Sample owner mapping:', Array.from(ownersMap.entries()).slice(0, 3));
      }

      // Map pets with owner info
      const petsWithOwner = (petsData || []).map(pet => {
        const owner = ownersMap.get(pet.owner_id);
        if (!owner && pet.owner_id) {
          console.warn(`No owner found for pet ${pet.name} with owner_id: ${pet.owner_id}`);
        }
        return {
          ...pet,
          owner: owner || null
        };
      });

      setPets(petsWithOwner);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const petsThisMonth = petsWithOwner.filter(p => 
        new Date(p.created_at) >= startOfMonth
      ).length;
      
      const uniqueSpecies = new Set(petsWithOwner.map(p => p.species?.toLowerCase())).size;
      
      const totalAge = petsWithOwner.reduce((sum, p) => sum + (p.age || 0), 0);
      const avgAge = petsWithOwner.length > 0 
        ? totalAge / petsWithOwner.length
        : 0;

      const totalWeight = petsWithOwner.reduce((sum, p) => sum + (p.weight || 0), 0);
      const avgWeight = petsWithOwner.length > 0
        ? totalWeight / petsWithOwner.length
        : 0;

      const breedingAvailable = petsWithOwner.filter(p => p.available_for_breeding).length;
      const withMicrochip = petsWithOwner.filter(p => p.microchip && p.microchip.trim() !== '').length;

      setStats({
        totalPets: petsWithOwner.length,
        petsThisMonth,
        totalSpecies: uniqueSpecies,
        avgAge: Math.round(avgAge * 10) / 10,
        avgWeight: Math.round(avgWeight * 10) / 10,
        breedingAvailable,
        withMicrochip
      });

    } catch (error) {
      console.error('Error loading pets data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (pet: Pet) => {
    setSelectedPet(pet);
    setShowPetDetails(true);
  };

  const getSpeciesLabel = (species: string) => {
    const speciesMap: Record<string, string> = {
      'dog': 'Perro',
      'cat': 'Gato',
      'bird': 'Ave',
      'fish': 'Pez',
      'rabbit': 'Conejo',
      'hamster': 'Hámster',
      'guinea_pig': 'Cobayo',
      'turtle': 'Tortuga',
      'other': 'Otro'
    };
    return speciesMap[species?.toLowerCase()] || species || 'Sin especie';
  };

  const getSpeciesEmoji = (species: string) => {
    const emojiMap: Record<string, string> = {
      'dog': '🐕',
      'cat': '🐱',
      'bird': '🐦',
      'fish': '🐠',
      'rabbit': '🐰',
      'hamster': '🐹',
      'guinea_pig': '🐹',
      'turtle': '🐢',
      'other': '🐾'
    };
    return emojiMap[species?.toLowerCase()] || '🐾';
  };

  const handleSort = (column: 'name' | 'date' | 'age' | 'weight' | 'species' | 'owner') => {
    if (sortBy === column) {
      // Toggle order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'name' | 'date' | 'age' | 'weight' | 'species' | 'owner') => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  const handleExport = () => {
    try {
      // Create CSV headers
      const headers = ['ID', 'Nombre', 'Especie', 'Raza', 'Edad', 'Peso (kg)', 'Microchip', 'Disponible para Cría', 'Dueño', 'Teléfono Dueño', 'Fecha Creación'];
      
      // Create CSV rows
      const rows = filteredPets.map(pet => [
        pet.id.slice(0, 8),
        pet.name || 'Sin nombre',
        getSpeciesLabel(pet.species) || 'Sin especie',
        pet.breed || 'N/A',
        pet.age || 'N/A',
        pet.weight || 'N/A',
        pet.microchip || 'N/A',
        pet.available_for_breeding ? 'Sí' : 'No',
        pet.owner?.full_name || 'N/A',
        pet.owner?.phone || 'N/A',
        new Date(pet.created_at).toLocaleDateString('es-GT')
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
      link.setAttribute('download', `mascotas_pethub_${new Date().toISOString().split('T')[0]}.csv`);
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
        <AdminSidebar activeTab="pets" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando mascotas…" />
        </div>
      </div>
    );
  }

  // Get unique species for filter
  const uniqueSpecies = Array.from(new Set(pets.map(p => p.species?.toLowerCase()).filter(Boolean)));

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="pets" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader 
            title="Gestión de Mascotas"
            subtitle="Administra todas las mascotas registradas en la plataforma"
            gradient="from-pink-600 to-rose-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                onClick={loadPetsData}
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
            <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalPets}</div>
                <div className="text-sm opacity-90">Total de Mascotas</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Tag className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.totalSpecies}</div>
                <div className="text-sm opacity-90">Especies Diferentes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.petsThisMonth}</div>
                <div className="text-sm opacity-90">Registradas este Mes</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.withMicrochip}</div>
                <div className="text-sm opacity-90">Con Microchip</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Edad Promedio</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.avgAge} años</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Peso Promedio</p>
                    <p className="text-2xl font-bold text-green-600">{stats.avgWeight} kg</p>
                  </div>
                  <Scale className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Disponibles para Cría</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.breedingAvailable}</p>
                  </div>
                  <Heart className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sin Microchip</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.totalPets - stats.withMicrochip}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-orange-500" />
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
                      placeholder="Buscar por nombre, raza, microchip, dueño..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Species Filter */}
                <div>
                  <select
                    value={speciesFilter}
                    onChange={(e) => setSpeciesFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todas las Especies</option>
                    {uniqueSpecies.map(species => (
                      <option key={species} value={species}>
                        {getSpeciesLabel(species)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Breeding Filter */}
                <div>
                  <select
                    value={breedingFilter}
                    onChange={(e) => setBreedingFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todas las Mascotas</option>
                    <option value="available">Disponibles para Cría</option>
                    <option value="not_available">No Disponibles para Cría</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="md:col-span-4">
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
                    <option value="age-desc">Mayor Edad</option>
                    <option value="age-asc">Menor Edad</option>
                    <option value="weight-desc">Mayor Peso</option>
                    <option value="weight-asc">Menor Peso</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pets Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mascotas ({filteredPets.length} de {stats.totalPets})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredPets.length} mascotas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Imagen</th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Nombre
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('species')}
                        >
                          <div className="flex items-center gap-2">
                            Especie
                            {getSortIcon('species')}
                          </div>
                        </th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Raza</th>
                        <th 
                          className="text-center p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('age')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Edad
                            {getSortIcon('age')}
                          </div>
                        </th>
                        <th 
                          className="text-center p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('weight')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Peso
                            {getSortIcon('weight')}
                          </div>
                        </th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Microchip</th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('owner')}
                        >
                          <div className="flex items-center gap-2">
                            Dueño
                            {getSortIcon('owner')}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-2">
                            Fecha
                            {getSortIcon('date')}
                          </div>
                        </th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPets.map((pet) => (
                        <tr key={pet.id} className="border-b hover:bg-gray-50 transition-colors">
                          {/* Image */}
                          <td className="p-3">
                            <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                              {pet.image_url ? (
                                <img
                                  src={pet.image_url}
                                  alt={pet.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  {getSpeciesEmoji(pet.species)}
                                </div>
                              )}
                              {pet.available_for_breeding && (
                                <div className="absolute top-1 right-1">
                                  <div className="w-2 h-2 bg-pink-500 rounded-full" title="Disponible para cría"></div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Name */}
                          <td className="p-3">
                            <p className="font-medium text-gray-900">{pet.name}</p>
                          </td>

                          {/* Species */}
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              <span className="mr-1">{getSpeciesEmoji(pet.species)}</span>
                              {getSpeciesLabel(pet.species)}
                            </Badge>
                          </td>

                          {/* Breed */}
                          <td className="p-3">
                            <p className="text-sm text-gray-700">{pet.breed || 'N/A'}</p>
                          </td>

                          {/* Age */}
                          <td className="p-3 text-center">
                            {pet.age !== null && pet.age !== undefined ? (
                              <span className="text-sm font-medium">{pet.age} años</span>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Weight */}
                          <td className="p-3 text-center">
                            {pet.weight !== null && pet.weight !== undefined ? (
                              <span className="text-sm font-medium flex items-center justify-center gap-1">
                                <Scale className="w-3 h-3 text-gray-400" />
                                {pet.weight} kg
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Microchip */}
                          <td className="p-3">
                            {pet.microchip ? (
                              <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3 text-green-500" />
                                <span className="text-xs font-mono text-gray-600">{pet.microchip.slice(0, 8)}...</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Owner */}
                          <td className="p-3">
                            {pet.owner ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {pet.owner.full_name || 'Sin nombre'}
                                  </p>
                                  {pet.owner.phone && (
                                    <p className="text-xs text-gray-500">{pet.owner.phone}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {new Date(pet.created_at).toLocaleDateString('es-GT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(pet.created_at).toLocaleTimeString('es-GT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(pet)}
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
                  <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">
                    {searchTerm || speciesFilter !== 'all' || breedingFilter !== 'all'
                      ? 'No se encontraron mascotas con los filtros aplicados' 
                      : 'No hay mascotas registradas'}
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

      {/* Pet Details Modal */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Mascota</DialogTitle>
            <DialogDescription>
              Información completa de {selectedPet?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="space-y-6">
              {/* Pet Image */}
              {selectedPet.image_url && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Imagen</Label>
                  <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedPet.image_url}
                      alt={selectedPet.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Nombre</Label>
                      <p className="font-medium text-lg">{selectedPet.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Especie</Label>
                      <Badge variant="outline" className="mt-1">
                        <span className="mr-1">{getSpeciesEmoji(selectedPet.species)}</span>
                        {getSpeciesLabel(selectedPet.species)}
                      </Badge>
                    </div>
                    {selectedPet.breed && (
                      <div>
                        <Label className="text-xs text-gray-600">Raza</Label>
                        <p className="font-medium">{selectedPet.breed}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPet.age !== null && selectedPet.age !== undefined && (
                        <div>
                          <Label className="text-xs text-gray-600">Edad</Label>
                          <p className="text-sm font-medium">{selectedPet.age} años</p>
                        </div>
                      )}
                      {selectedPet.weight !== null && selectedPet.weight !== undefined && (
                        <div>
                          <Label className="text-xs text-gray-600">Peso</Label>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            {selectedPet.weight} kg
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedPet.microchip && (
                      <div>
                        <Label className="text-xs text-gray-600">Microchip</Label>
                        <p className="text-sm font-mono font-medium">{selectedPet.microchip}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-600">Disponible para Cría</Label>
                      <div className="mt-1">
                        <Badge variant={selectedPet.available_for_breeding ? "default" : "secondary"}>
                          {selectedPet.available_for_breeding ? "Sí" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Dueño</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedPet.owner ? (
                      <>
                        <div>
                          <Label className="text-xs text-gray-600">Nombre</Label>
                          <p className="font-medium">{selectedPet.owner.full_name || 'Sin nombre'}</p>
                        </div>
                        {selectedPet.owner.phone && (
                          <div>
                            <Label className="text-xs text-gray-600">Teléfono</Label>
                            <p className="text-sm">{selectedPet.owner.phone}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Información del dueño no disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Registrada:</span>
                    <span className="text-sm">{new Date(selectedPet.created_at).toLocaleString('es-GT')}</span>
                  </div>
                  {selectedPet.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actualizada:</span>
                      <span className="text-sm">{new Date(selectedPet.updated_at).toLocaleString('es-GT')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPetsPage;

