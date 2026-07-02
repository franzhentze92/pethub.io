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
  Package,
  Search,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Download,
  RefreshCw,
  Eye,
  Building2,
  Tag,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Scale,
  Ruler,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';

interface Product {
  id: string;
  provider_id: string;
  product_name: string;
  product_category: string;
  description: string;
  detailed_description?: string;
  price: number;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  price_extra_large?: number | null;
  price_xs?: number | null;
  price_s?: number | null;
  price_m?: number | null;
  price_l?: number | null;
  price_xl?: number | null;
  price_xxl?: number | null;
  currency: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  product_image_url?: string;
  secondary_images?: string[];
  brand?: string;
  weight_kg?: number;
  dimensions_cm?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  provider?: {
    business_name: string;
    business_type: string;
    address?: string;
    phone?: string;
    profile_picture_url?: string;
  };
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
  productsThisMonth: number;
  avgPrice: number;
}

const AdminProductsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalCategories: 0,
    productsThisMonth: 0,
    avgPrice: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'price' | 'stock' | 'category' | 'provider'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'name' | 'date' | 'price' | 'stock' | 'category' | 'provider') => {
    if (sortBy === column) {
      // Toggle order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'name' | 'date' | 'price' | 'stock' | 'category' | 'provider') => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  useEffect(() => {
    // Verify admin access
    if (user?.email !== 'admin@pethubgt.com') {
      navigate('/login');
      return;
    }

    loadProductsData();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...products];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.product_name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.provider?.business_name?.toLowerCase().includes(searchLower) ||
        product.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.product_category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(product => product.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(product => !product.is_active);
      }
    }

    // Apply stock filter
    if (stockFilter !== 'all') {
      if (stockFilter === 'in_stock') {
        filtered = filtered.filter(product => product.stock_quantity > 0);
      } else if (stockFilter === 'low_stock') {
        filtered = filtered.filter(product => 
          product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert
        );
      } else if (stockFilter === 'out_of_stock') {
        filtered = filtered.filter(product => product.stock_quantity === 0);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
              switch (sortBy) {
                case 'name':
                  comparison = (a.product_name || '').localeCompare(b.product_name || '');
                  break;
                case 'date':
                  comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                  break;
                case 'price':
                  comparison = (a.price || 0) - (b.price || 0);
                  break;
                case 'stock':
                  comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0);
                  break;
                case 'category':
                  comparison = (a.product_category || '').localeCompare(b.product_category || '');
                  break;
                case 'provider':
                  comparison = (a.provider?.business_name || '').localeCompare(b.provider?.business_name || '');
                  break;
              }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter, sortBy, sortOrder]);

  const loadProductsData = async () => {
    try {
      setLoading(true);

      // Load all products with provider information
      const { data: productsData, error: productsError } = await supabase
        .from('provider_products')
        .select(`
          *,
          providers (
            business_name,
            business_type,
            address,
            phone,
            profile_picture_url
          )
        `)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        return;
      }

      console.log('Products loaded:', productsData?.length || 0);

      const productsWithProvider = (productsData || []).map(product => ({
        ...product,
        provider: product.providers || null
      }));

      setProducts(productsWithProvider);

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const activeProducts = productsWithProvider.filter(p => p.is_active).length;
      const inactiveProducts = productsWithProvider.filter(p => !p.is_active).length;
      const lowStockProducts = productsWithProvider.filter(p => 
        p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert
      ).length;
      const outOfStockProducts = productsWithProvider.filter(p => p.stock_quantity === 0).length;
      
      const uniqueCategories = new Set(productsWithProvider.map(p => p.product_category)).size;
      
      const productsThisMonth = productsWithProvider.filter(p => 
        new Date(p.created_at) >= startOfMonth
      ).length;
      
      const totalPrice = productsWithProvider.reduce((sum, p) => sum + (p.price || 0), 0);
      const avgPrice = productsWithProvider.length > 0 
        ? totalPrice / productsWithProvider.length
        : 0;

      setStats({
        totalProducts: productsWithProvider.length,
        activeProducts,
        inactiveProducts,
        lowStockProducts,
        outOfStockProducts,
        totalCategories: uniqueCategories,
        productsThisMonth,
        avgPrice
      });

    } catch (error) {
      console.error('Error loading products data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'alimentos': 'Alimentos',
      'juguetes': 'Juguetes',
      'accesorios': 'Accesorios',
      'higiene': 'Higiene',
      'medicamentos': 'Medicamentos',
      'ropa': 'Ropa',
      'camas': 'Camas y Descanso',
      'transporte': 'Transporte',
      'otro': 'Otro'
    };
    return categories[category] || category;
  };

  const getPriceDisplay = (product: Product) => {
    // Check if product has size-based prices
    const sizePrices = [
      product.price_small,
      product.price_medium,
      product.price_large,
      product.price_extra_large,
      product.price_xs,
      product.price_s,
      product.price_m,
      product.price_l,
      product.price_xl,
      product.price_xxl
    ].filter((p): p is number => p !== null && p !== undefined);
    
    const currencySymbol = product.currency === 'GTQ' ? 'Q' : '$';
    
    if (sizePrices.length > 0) {
      const minPrice = Math.min(...sizePrices);
      const maxPrice = Math.max(...sizePrices);
      
      if (minPrice === maxPrice) {
        return `${currencySymbol}${minPrice.toFixed(2)}`;
      } else {
        return `${currencySymbol}${minPrice.toFixed(2)} - ${currencySymbol}${maxPrice.toFixed(2)}`;
      }
    } else {
      return `${currencySymbol}${(product.price || 0).toFixed(2)}`;
    }
  };

  const handleExport = () => {
    try {
      // Create CSV headers
      const headers = ['ID', 'Nombre', 'Categoría', 'Proveedor', 'Precio', 'Stock', 'Estado', 'Fecha Creación'];
      
      // Create CSV rows
      const rows = filteredProducts.map(product => [
        product.id.slice(0, 8),
        product.product_name || 'Sin nombre',
        getCategoryLabel(product.product_category) || 'Sin categoría',
        product.provider?.business_name || 'Sin proveedor',
        getPriceDisplay(product),
        product.stock_quantity || 0,
        product.is_active ? 'Activo' : 'Inactivo',
        new Date(product.created_at).toLocaleDateString('es-GT')
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
      link.setAttribute('download', `productos_pethub_${new Date().toISOString().split('T')[0]}.csv`);
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
        <AdminSidebar activeTab="products" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando productos…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab="products" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <PageHeader 
            title="Gestión de Productos"
            subtitle="Administra todos los productos de la plataforma"
            gradient="from-green-600 to-emerald-600"
            showNotifications={false}
          >
            <div className="flex items-center gap-3">
              <Button
                onClick={loadProductsData}
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
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <div className="text-sm opacity-90">Total de Productos</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.activeProducts}</div>
                <div className="text-sm opacity-90">Productos Activos</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingBag className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">{stats.lowStockProducts}</div>
                <div className="text-sm opacity-90">Stock Bajo</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4 opacity-75" />
                </div>
                <div className="text-2xl font-bold">Q{stats.avgPrice.toFixed(2)}</div>
                <div className="text-sm opacity-90">Precio Promedio</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Inactivos</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.inactiveProducts}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sin Stock</p>
                    <p className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</p>
                  </div>
                  <Package className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Categorías</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalCategories}</p>
                  </div>
                  <Tag className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Este Mes</p>
                    <p className="text-2xl font-bold text-green-600">{stats.productsThisMonth}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
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
                      placeholder="Buscar por nombre, marca, proveedor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todas las Categorías</option>
                    <option value="alimentos">Alimentos</option>
                    <option value="juguetes">Juguetes</option>
                    <option value="accesorios">Accesorios</option>
                    <option value="higiene">Higiene</option>
                    <option value="medicamentos">Medicamentos</option>
                    <option value="ropa">Ropa</option>
                    <option value="camas">Camas y Descanso</option>
                    <option value="transporte">Transporte</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
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
                    <option value="price-desc">Mayor Precio</option>
                    <option value="price-asc">Menor Precio</option>
                    <option value="stock-desc">Mayor Stock</option>
                    <option value="stock-asc">Menor Stock</option>
                  </select>
                </div>
              </div>

              {/* Stock Filter */}
              <div className="mt-4">
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todo el Stock</option>
                  <option value="in_stock">En Stock</option>
                  <option value="low_stock">Stock Bajo</option>
                  <option value="out_of_stock">Sin Stock</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Productos ({filteredProducts.length} de {stats.totalProducts})</CardTitle>
                <Badge variant="outline" className="text-sm">
                  Mostrando {filteredProducts.length} productos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredProducts.length > 0 ? (
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
                            Producto
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center gap-2">
                            Categoría
                            {getSortIcon('category')}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('provider')}
                        >
                          <div className="flex items-center gap-2">
                            Proveedor
                            {getSortIcon('provider')}
                          </div>
                        </th>
                        <th 
                          className="text-right p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Precio
                            {getSortIcon('price')}
                          </div>
                        </th>
                        <th 
                          className="text-center p-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('stock')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Stock
                            {getSortIcon('stock')}
                          </div>
                        </th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Estado</th>
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
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50 transition-colors">
                          {/* Image */}
                          <td className="p-3">
                            <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                              {product.product_image_url ? (
                                <img
                                  src={product.product_image_url}
                                  alt={product.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              {!product.is_active && (
                                <div className="absolute top-1 right-1">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                </div>
                              )}
                              {product.stock_quantity === 0 && (
                                <div className="absolute top-1 left-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                </div>
                              )}
                              {product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert && (
                                <div className="absolute top-1 left-1">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Product Name */}
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{product.product_name}</p>
                              {product.description && (
                                <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
                                  {product.description}
                                </p>
                              )}
                              {product.brand && (
                                <p className="text-xs text-gray-400 mt-1">Marca: {product.brand}</p>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(product.product_category)}
                            </Badge>
                          </td>

                          {/* Provider */}
                          <td className="p-3">
                            {product.provider ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {product.provider.business_name}
                                  </p>
                                  {product.provider.business_type && (
                                    <p className="text-xs text-gray-500 capitalize">
                                      {product.provider.business_type}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>

                          {/* Price */}
                          <td className="p-3 text-right">
                            <p className="font-bold text-green-600">
                              {getPriceDisplay(product)}
                            </p>
                            <p className="text-xs text-gray-500">{product.currency}</p>
                          </td>

                          {/* Stock */}
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center">
                              <Badge 
                                variant="outline" 
                                className={
                                  product.stock_quantity === 0 
                                    ? 'bg-red-50 text-red-700 border-red-300' 
                                    : product.stock_quantity <= product.min_stock_alert
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                    : 'bg-green-50 text-green-700 border-green-300'
                                }
                              >
                                {product.stock_quantity}
                              </Badge>
                              {product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert && (
                                <p className="text-xs text-yellow-600 mt-1">Bajo</p>
                              )}
                              {product.stock_quantity === 0 && (
                                <p className="text-xs text-red-600 mt-1">Sin stock</p>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center">
                            <Badge variant={product.is_active ? "default" : "secondary"}>
                              {product.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>

                          {/* Date */}
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {new Date(product.created_at).toLocaleDateString('es-GT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(product.created_at).toLocaleTimeString('es-GT', {
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
                              onClick={() => handleViewDetails(product)}
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
                    {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || stockFilter !== 'all'
                      ? 'No se encontraron productos con los filtros aplicados' 
                      : 'No hay productos registrados'}
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

      {/* Product Details Modal */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Producto</DialogTitle>
            <DialogDescription>
              Información completa del producto {selectedProduct?.product_name}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProduct.product_image_url && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Imagen Principal</Label>
                    <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={selectedProduct.product_image_url}
                        alt={selectedProduct.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {selectedProduct.secondary_images && selectedProduct.secondary_images.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Imágenes Secundarias</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProduct.secondary_images.map((img, index) => (
                        <div key={index} className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={img}
                            alt={`${selectedProduct.product_name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Nombre</Label>
                      <p className="font-medium">{selectedProduct.product_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Categoría</Label>
                      <Badge variant="outline" className="mt-1">
                        {getCategoryLabel(selectedProduct.product_category)}
                      </Badge>
                    </div>
                    {selectedProduct.brand && (
                      <div>
                        <Label className="text-xs text-gray-600">Marca</Label>
                        <p className="font-medium">{selectedProduct.brand}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-600">Estado</Label>
                      <div className="mt-1">
                        <Badge variant={selectedProduct.is_active ? "default" : "secondary"}>
                          {selectedProduct.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Proveedor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedProduct.provider ? (
                      <>
                        <div>
                          <Label className="text-xs text-gray-600">Negocio</Label>
                          <p className="font-medium">{selectedProduct.provider.business_name}</p>
                        </div>
                        {selectedProduct.provider.business_type && (
                          <div>
                            <Label className="text-xs text-gray-600">Tipo</Label>
                            <p className="text-sm capitalize">{selectedProduct.provider.business_type}</p>
                          </div>
                        )}
                        {selectedProduct.provider.phone && (
                          <div>
                            <Label className="text-xs text-gray-600">Teléfono</Label>
                            <p className="text-sm">{selectedProduct.provider.phone}</p>
                          </div>
                        )}
                        {selectedProduct.provider.address && (
                          <div>
                            <Label className="text-xs text-gray-600">Dirección</Label>
                            <p className="text-sm">{selectedProduct.provider.address}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Información del proveedor no disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {(selectedProduct.description || selectedProduct.detailed_description) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Descripción</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedProduct.description && (
                      <div>
                        <Label className="text-xs text-gray-600">Descripción Corta</Label>
                        <p className="text-sm mt-1">{selectedProduct.description}</p>
                      </div>
                    )}
                    {selectedProduct.detailed_description && (
                      <div>
                        <Label className="text-xs text-gray-600">Descripción Detallada</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{selectedProduct.detailed_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Precios y Stock</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Precio General</Label>
                      <p className="font-bold text-lg text-green-600">
                        {selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{(selectedProduct.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Stock Disponible</Label>
                      <p className={`font-bold text-lg ${
                        selectedProduct.stock_quantity === 0 
                          ? 'text-red-600' 
                          : selectedProduct.stock_quantity <= selectedProduct.min_stock_alert
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {selectedProduct.stock_quantity} unidades
                      </p>
                    </div>
                  </div>

                  {/* Size-based prices */}
                  {(selectedProduct.price_small || selectedProduct.price_medium || selectedProduct.price_large || selectedProduct.price_extra_large) && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Precios por Tamaño de Perro</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {selectedProduct.price_small && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Pequeño</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_small.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_medium && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Mediano</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_medium.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_large && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Grande</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_large.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_extra_large && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Extra Grande</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_extra_large.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Clothing size prices */}
                  {(selectedProduct.price_xs || selectedProduct.price_s || selectedProduct.price_m || 
                    selectedProduct.price_l || selectedProduct.price_xl || selectedProduct.price_xxl) && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-600 mb-2 block">Precios por Talla de Ropa</Label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {selectedProduct.price_xs && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">XS</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_xs.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_s && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">S</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_s.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_m && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">M</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_m.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_l && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">L</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_l.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_xl && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">XL</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_xl.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedProduct.price_xxl && (
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">XXL</p>
                            <p className="font-semibold">{selectedProduct.currency === 'GTQ' ? 'Q' : '$'}{selectedProduct.price_xxl.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-600">Alerta de Stock Mínimo</Label>
                        <p className="text-sm font-medium">{selectedProduct.min_stock_alert} unidades</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Moneda</Label>
                        <p className="text-sm font-medium">{selectedProduct.currency}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              {(selectedProduct.weight_kg || selectedProduct.dimensions_cm || selectedProduct.tags) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información Adicional</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedProduct.weight_kg && (
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-gray-400" />
                        <div>
                          <Label className="text-xs text-gray-600">Peso</Label>
                          <p className="text-sm font-medium">{selectedProduct.weight_kg} kg</p>
                        </div>
                      </div>
                    )}
                    {selectedProduct.dimensions_cm && (
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-gray-400" />
                        <div>
                          <Label className="text-xs text-gray-600">Dimensiones</Label>
                          <p className="text-sm font-medium">{selectedProduct.dimensions_cm}</p>
                        </div>
                      </div>
                    )}
                    {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600 mb-2 block">Etiquetas</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Creado:</span>
                    <span className="text-sm">{new Date(selectedProduct.created_at).toLocaleString('es-GT')}</span>
                  </div>
                  {selectedProduct.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actualizado:</span>
                      <span className="text-sm">{new Date(selectedProduct.updated_at).toLocaleString('es-GT')}</span>
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

export default AdminProductsPage;

