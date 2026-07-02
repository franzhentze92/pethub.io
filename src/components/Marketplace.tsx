import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Scissors, Home, Moon, Stethoscope, GraduationCap, Star, Heart, MapPin, Package, Building2, Clock, Search, Filter, X, Image as ImageIcon, RotateCcw, Phone, Truck, Tag, Ruler, Weight, Info, RefreshCw } from 'lucide-react';
import PageHeader from './PageHeader';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import ServiceBookingModal from './ServiceBookingModal';
import { toast } from 'sonner';
import { getPricingConfig } from '@/config/productPricing';
import {
  buildDynamicFilterOptions,
  countActiveProductFilters,
  getDefaultProductFilterValues,
  getProductFiltersForCategory,
  getProductMaxPrice,
  getProductMinPrice,
  PRODUCT_FILTER_ALL_VALUE,
  productMatchesDynamicFilters,
  type MarketplaceProductFilterSource,
} from '@/config/productFilters';
import { MARKETPLACE_PRODUCT_CATEGORIES, getProductCategoryLabel } from '@/lib/productCategories';
import PageLoader from '@/components/PageLoader';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { landingBtnPrimary, landingBadge, landingFeatureGradients, landingHeaderActionBtn } from '@/lib/landingTheme';
import {
  categoryBadgeBaseClass,
  formatCategoryLabel,
  getCategoryBadgeClass,
} from '@/lib/categoryBadges';
import { cn } from '@/lib/utils';
import MarketplaceProviderReviews from './marketplace/MarketplaceProviderReviews';
import { MarketplaceCatalogReviews } from './marketplace/MarketplaceCatalogReviews';
import { MarketplaceRatingBadge } from './marketplace/MarketplaceRatingBadge';
import { buildCatalogRatingMap, emptyRatingSummary } from '@/utils/catalogReviews';
import { PetPhotoCarousel, PetPhotoThumbnails } from '@/components/mobile/PetPhotoCarousel';
import { getCatalogImageUrls } from '@/utils/catalogImages';
import type { CarouselApi } from '@/components/ui/carousel';
import {
  SUBSCRIPTION_INTERVALS,
  isProductSubscriptionEligible,
  type SubscriptionInterval,
} from '@/config/productSubscriptions';

const itemCardClass =
  'rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col h-full';
const cardTitleClass = 'font-bold text-sm md:text-base text-gray-800 mb-1 line-clamp-3 min-h-[3.75rem] md:min-h-[4.125rem] leading-snug';
const cardDescriptionClass = 'text-gray-600 text-xs md:text-sm line-clamp-2 min-h-[2rem] md:min-h-[2.5rem] leading-snug';
const cardMetaBlockClass = 'space-y-1 min-h-[2.75rem]';
const filterPanelClass =
  'rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg p-4 space-y-4';
const detailsModalSectionClass =
  'rounded-xl border border-landing-aqua/15 bg-gradient-to-br from-landing-aqua/5 to-landing-mint/5 p-3.5';
const detailsModalOutlineBtn =
  'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10';

interface MarketplaceProviderInfo {
  id?: string;
  user_id: string;
  business_name: string;
  business_type: string;
  address: string;
  phone: string;
  description?: string;
  profile_picture_url?: string;
  latitude?: number;
  longitude?: number;
  city_id?: number;
  municipality?: string;
  department?: string;
  has_delivery?: boolean;
  has_pickup?: boolean;
  delivery_fee?: number;
  rating?: number;
  total_reviews?: number;
  guatemala_cities?: {
    city_name: string;
  };
}

interface ProviderService {
  id: string;
  service_name: string;
  service_category: string;
  description: string;
  detailed_description?: string;
  price: number;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  price_extra_large?: number | null;
  currency: string;
  duration_minutes: number;
  preparation_instructions?: string;
  cancellation_policy?: string;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  is_active: boolean;
  created_at: string;
  provider_id: string;
  service_image_url?: string;
  secondary_images?: string[];
  average_rating?: number;
  review_count?: number;
  providers: MarketplaceProviderInfo;
}

interface ProviderProduct {
  id: string;
  product_name: string;
  product_category: string;
  description: string;
  detailed_description?: string;
  brand?: string;
  price: number;
  currency: string;
  stock_quantity: number;
  weight_kg?: number;
  dimensions_cm?: string;
  tags?: string[];
  target_species?: string[];
  product_subtype?: string | null;
  life_stage?: string | null;
  is_active: boolean;
  created_at: string;
  provider_id: string;
  product_image_url?: string;
  secondary_images?: string[];
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
  has_delivery?: boolean;
  has_pickup?: boolean;
  delivery_fee?: number;
  average_rating?: number;
  review_count?: number;
  subscription_enabled?: boolean;
  providers: MarketplaceProviderInfo;
}

const Marketplace: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const guidedTour = useBlueprintGuidedTourOptional();
  const [activeCategory, setActiveCategory] = useState('all');
  const [services, setServices] = useState<ProviderService[]>([]);
  const [products, setProducts] = useState<ProviderProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Initialize activeTab based on URL path
  const getInitialTab = () => {
    if (location.pathname === '/marketplace/products') return 'products';
    if (location.pathname === '/marketplace/services') return 'services';
    if (location.pathname === '/marketplace/favorites') return 'favorites';
    return 'services'; // default
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Update activeTab when URL path changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveCategory('all');
    setSearchTerm('');
    setProductFilterValues(getDefaultProductFilterValues('all'));
    setPriceRange(tab === 'products' ? [0, 1000] : [0, 1000]);
    setSelectedProviderType('all');
    setSelectedProvider('all');
    setSelectedCity('all');
    setSelectedRating('all');
    setSelectedRadius('all');
    if (tab === 'products') navigate('/marketplace/products', { replace: true });
    else if (tab === 'services') navigate('/marketplace/services', { replace: true });
    else if (tab === 'favorites') navigate('/marketplace/favorites', { replace: true });
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedProviderType, setSelectedProviderType] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all');
  const [selectedRadius, setSelectedRadius] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [productFilterValues, setProductFilterValues] = useState<Record<string, string>>(() =>
    getDefaultProductFilterValues('all'),
  );

  // Get unique locations and provider types for filters
  const locations = ['all', ...Array.from(new Set([
    ...services.map(s => s.providers.guatemala_cities.city_name).filter(Boolean),
    ...products.map(p => p.providers.guatemala_cities.city_name).filter(Boolean)
  ]))];

  const providerTypes = ['all', ...Array.from(new Set([
    ...services.map(s => s.providers.business_type).filter(Boolean),
    ...products.map(p => p.providers.business_type).filter(Boolean)
  ]))];

  // Get unique providers and cities for filters
  const providers = ['all', ...Array.from(new Set([
    ...services.map(s => s.providers.business_name).filter(Boolean),
    ...products.map(p => p.providers.business_name).filter(Boolean)
  ]))];

  const cities = ['all', ...Array.from(new Set([
    ...services.map(s => s.providers.guatemala_cities.city_name).filter(Boolean),
    ...products.map(p => p.providers.guatemala_cities.city_name).filter(Boolean)
  ]))];

  // Rating and radius options
  const ratingOptions = [
    { value: 'all', label: 'Todas las calificaciones' },
    { value: '4.5', label: '4.5+ estrellas' },
    { value: '4.0', label: '4.0+ estrellas' },
    { value: '3.5', label: '3.5+ estrellas' },
    { value: '3.0', label: '3.0+ estrellas' }
  ];

  const radiusOptions = [
    { value: 'all', label: 'Cualquier distancia' },
    { value: '1', label: '1 km o menos' },
    { value: '5', label: '5 km o menos' },
    { value: '10', label: '10 km o menos' },
    { value: '25', label: '25 km o menos' },
    { value: '50', label: '50 km o menos' }
  ];

  // Service categories
  const serviceCategories = [
    { id: 'all', label: 'Todo', icon: ShoppingBag },
    { id: 'veterinaria', label: 'Veterinaria', icon: Stethoscope },
    { id: 'grooming', label: 'Grooming', icon: Scissors },
    { id: 'entrenamiento', label: 'Entrenamiento', icon: GraduationCap },
    { id: 'alojamiento', label: 'Alojamiento', icon: Home },
    { id: 'transporte', label: 'Transporte', icon: Moon },
    { id: 'fisioterapia', label: 'Fisioterapia', icon: Building2 },
    { id: 'nutricion', label: 'Nutrición', icon: Package },
  ];

  // Product categories (shared config)
  const productCategories = MARKETPLACE_PRODUCT_CATEGORIES;

  useEffect(() => {
    setProductFilterValues(getDefaultProductFilterValues(activeCategory));
  }, [activeCategory]);

  const scopedProductsForFilters = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((product) => product.product_category === activeCategory);
  }, [products, activeCategory]);

  const productPriceBounds = useMemo(() => {
    if (scopedProductsForFilters.length === 0) return { min: 0, max: 1000 };
    const prices = scopedProductsForFilters.map((product) => getProductMaxPrice(product));
    const max = Math.max(...prices, 100);
    return { min: 0, max: Math.ceil(max / 50) * 50 };
  }, [scopedProductsForFilters]);

  useEffect(() => {
    if (activeTab !== 'products') return;
    setPriceRange([productPriceBounds.min, productPriceBounds.max]);
  }, [activeCategory, activeTab, productPriceBounds.min, productPriceBounds.max]);

  // Deep-link support: /marketplace?category=grooming | productos | alimentos, etc.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (!category) return;

    if (category === 'productos') {
      setActiveTab('products');
      setActiveCategory('all');
      return;
    }

    if (productCategories.some((c) => c.id === category)) {
      setActiveTab('products');
      setActiveCategory(category);
      return;
    }

    if (serviceCategories.some((c) => c.id === category)) {
      setActiveTab('services');
      setActiveCategory(category);
    }
  }, [location.search]);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<ProviderService | ProviderProduct | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailCarouselApi, setDetailCarouselApi] = useState<CarouselApi>();
  const [detailPhotoIndex, setDetailPhotoIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<'one_time' | 'subscription'>('one_time');
  const [subscriptionInterval, setSubscriptionInterval] = useState<SubscriptionInterval>('monthly');

  useEffect(() => {
    if (!detailCarouselApi) return;
    const onSelect = () => setDetailPhotoIndex(detailCarouselApi.selectedScrollSnap());
    onSelect();
    detailCarouselApi.on('select', onSelect);
    return () => {
      detailCarouselApi.off('select', onSelect);
    };
  }, [detailCarouselApi]);

  // User location and favorites
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set());
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<Set<string>>(new Set());

  // Cart states
  const { addItem } = useCart();
  const [showServiceBookingModal, setShowServiceBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [productQuantity, setProductQuantity] = useState<{ [key: string]: number }>({});

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  }, []);

  // Fetch user's marketplace favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: favoritesData, error } = await supabase
          .from('marketplace_favorites')
          .select('item_type, product_id, service_id')
          .eq('user_id', user.id);

        if (error) throw error;

        const productIds = new Set<string>();
        const serviceIds = new Set<string>();
        (favoritesData || []).forEach((row) => {
          if (row.item_type === 'product' && row.product_id) productIds.add(row.product_id);
          if (row.item_type === 'service' && row.service_id) serviceIds.add(row.service_id);
        });
        setFavoriteProductIds(productIds);
        setFavoriteServiceIds(serviceIds);
      } catch (error) {
        console.log('Error fetching favorites:', error);
      }
    };

    fetchFavorites();
  }, [supabase]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Format distance
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const toggleFavorite = async (itemType: 'product' | 'service', itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Inicia sesión para guardar favoritos');
        return;
      }

      const isProduct = itemType === 'product';
      const currentSet = isProduct ? favoriteProductIds : favoriteServiceIds;
      const setCurrent = isProduct ? setFavoriteProductIds : setFavoriteServiceIds;

      if (currentSet.has(itemId)) {
        let query = supabase
          .from('marketplace_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', itemType);

        query = isProduct
          ? query.eq('product_id', itemId)
          : query.eq('service_id', itemId);

        const { error } = await query;
        if (error) throw error;

        setCurrent((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        toast.success(isProduct ? 'Producto quitado de favoritos' : 'Servicio quitado de favoritos');
      } else {
        const { error } = await supabase.from('marketplace_favorites').insert({
          user_id: user.id,
          item_type: itemType,
          product_id: isProduct ? itemId : null,
          service_id: isProduct ? null : itemId,
        });
        if (error) throw error;

        setCurrent((prev) => new Set(prev).add(itemId));
        toast.success(isProduct ? 'Producto guardado en favoritos' : 'Servicio guardado en favoritos');
        void guidedTour?.notifySectionSaved('marketplace');
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
      toast.error('No se pudo actualizar favoritos');
    }
  };

  // Handle add to cart
  const handleAddToCart = (
    product: ProviderProduct,
    quantity?: number,
    options?: { isSubscription?: boolean; subscriptionInterval?: SubscriptionInterval },
  ) => {
    // Validate size is selected if product has size-based pricing
    const pricingConfig = getPricingConfig(product.product_category);
    if (pricingConfig.system !== 'single' && !selectedSize) {
      toast.error("⚠️ Selecciona un tamaño. Por favor selecciona un tamaño antes de agregar al carrito");
      return;
    }

    // Validate provider_id exists
    if (!product.provider_id) {
      toast.error("❌ Error: Producto sin proveedor válido");
      return;
    }

    // Use the provider's user_id (auth.users.id) instead of provider_id (providers.id)
    const providerUserId = product.providers?.user_id;
    if (!providerUserId) {
      toast.error("❌ Error: No se pudo identificar el usuario del proveedor");
      return;
    }

    // Get quantity from state or use provided quantity or default to 1
    const qty = quantity || productQuantity[product.id] || 1;
    
    // Validate quantity doesn't exceed stock
    if (qty > product.stock_quantity) {
      toast.error(`❌ Error: Solo hay ${product.stock_quantity} unidades disponibles`);
      return;
    }

    // Calculate price based on selected size
    let finalPrice = product.price;
    let sizeLabel = '';
    
    if (selectedSize && selectedSize !== 'general') {
      const sizePrice = (product as any)[`price_${selectedSize}`];
      if (sizePrice) {
        finalPrice = sizePrice;
        // Get size label from config
        const sizeOption = pricingConfig.sizeOptions?.find(s => s.key === selectedSize);
        if (sizeOption) {
          sizeLabel = ` - ${sizeOption.label}`;
        }
      }
    }

    const isSubscription = options?.isSubscription ?? false;
    const interval = options?.subscriptionInterval ?? subscriptionInterval;

    if (isSubscription && !isProductSubscriptionEligible(product)) {
      toast.error('❌ Este producto no está disponible en suscripción');
      return;
    }

    // Create unique ID that includes size and subscription to allow separate cart entries
    let itemId = selectedSize && selectedSize !== 'general'
      ? `${product.id}_${selectedSize}`
      : product.id;
    if (isSubscription) {
      itemId = `${itemId}_sub_${interval}`;
    }

    addItem({
      id: itemId,
      type: 'product',
      name: product.product_name + sizeLabel + (isSubscription ? ' (Suscripción)' : ''),
      price: finalPrice,
      currency: product.currency,
      provider_id: providerUserId, // Use user_id from providers table
      provider_name: product.providers.business_name,
      image_url: product.product_image_url,
      description: product.description,
      delivery_fee: 0, // Delivery fee will be calculated based on distance in checkout
      has_delivery: product.providers.has_delivery,
      has_pickup: product.providers.has_pickup,
      product_size: selectedSize || 'general',
      product_id: product.id, // Store original product ID (without size suffix)
      product_category: product.product_category, // Store product category for food division logic
      is_subscription: isSubscription,
      subscription_interval: isSubscription ? interval : undefined,
    }, qty);

    const sizeText = sizeLabel ? ` (${sizeLabel.replace(' - ', '')})` : '';
    const subText = isSubscription
      ? ` — suscripción ${SUBSCRIPTION_INTERVALS.find((i) => i.value === interval)?.label.toLowerCase()}`
      : '';
    toast.success(`✅ Producto Agregado: ${product.product_name}${sizeText}${subText} ha sido agregado al carrito`);
  };

  // Handle service booking (open booking modal instead of adding to cart)
  const handleServiceBooking = (service: ProviderService) => {
    setSelectedService(service);
    setShowServiceBookingModal(true);
  };

  // Handle add service to cart (for services that don't need booking)
  const handleAddServiceToCart = (service: ProviderService) => {
    if (!service.provider_id) {
      toast.error("❌ Error: Servicio sin proveedor válido");
      return;
    }

    // Use the provider's user_id (auth.users.id) instead of provider_id (providers.id)
    const providerUserId = service.providers?.user_id;
    if (!providerUserId) {
      toast.error("❌ Error: No se pudo identificar el usuario del proveedor");
      return;
    }

    addItem({
      id: service.id,
      type: 'service',
      name: service.service_name,
      price: service.price,
      currency: service.currency,
      provider_id: providerUserId, // Use user_id from providers table
      provider_name: service.providers.business_name,
      image_url: service.service_image_url || undefined,
      description: service.description,
      delivery_fee: 0, // Delivery fee will be calculated based on distance in checkout
      has_delivery: service.providers.has_delivery,
      has_pickup: service.providers.has_pickup,
    });

    toast.success(`✅ Servicio Agregado: ${service.service_name} ha sido agregado al carrito`);
  };

  // Fetch real services and products from database
  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch active services with provider information
        const { data: servicesData, error: servicesError } = await supabase
          .from('provider_services')
          .select(`
            *,
            providers (
              id,
              user_id,
              business_name,
              business_type,
              address,
              phone,
              description,
              profile_picture_url,
              latitude,
              longitude,
              city_id,
              municipality,
              department,
              has_delivery,
              has_pickup,
              delivery_fee,
              rating,
              total_reviews,
              guatemala_cities!inner (
                city_name
              )
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (servicesError) throw servicesError;

        const attachItemRatings = <T extends { id: string }>(
          items: T[],
          ratingMap: Map<string, { average: number; count: number }>,
        ) =>
          items.map((item) => {
            const summary = ratingMap.get(item.id) ?? emptyRatingSummary();
            return {
              ...item,
              average_rating: summary.average,
              review_count: summary.count,
            };
          });

        const { data: catalogReviews, error: catalogReviewsError } = await supabase
          .from('catalog_item_reviews')
          .select('product_id, service_id, rating');

        if (catalogReviewsError) {
          console.error('Error fetching catalog item reviews:', catalogReviewsError);
        }

        const productRatingMap = buildCatalogRatingMap(catalogReviews || [], 'product');
        const serviceRatingMap = buildCatalogRatingMap(catalogReviews || [], 'service');

        const servicesWithRatings = attachItemRatings(servicesData || [], serviceRatingMap);

        // Fetch active products with provider information
        const { data: productsData, error: productsError } = await supabase
          .from('provider_products')
          .select(`
            *,
            providers (
              id,
              user_id,
              business_name,
              business_type,
              address,
              phone,
              description,
              profile_picture_url,
              latitude,
              longitude,
              city_id,
              municipality,
              department,
              has_delivery,
              has_pickup,
              delivery_fee,
              rating,
              total_reviews,
              guatemala_cities!inner (
                city_name
              )
            )
          `)
          .eq('is_active', true)
          .gt('stock_quantity', 0)
          .order('created_at', { ascending: false });

        if (productsError) {
          console.error('Products query error:', productsError);
          // If product reviews table has issues, try without reviews
          const { data: productsDataFallback, error: productsErrorFallback } = await supabase
            .from('provider_products')
            .select(`
              *,
              providers (
                id,
                user_id,
                business_name,
                business_type,
                address,
                phone,
                description,
                profile_picture_url,
                latitude,
                longitude,
                city_id,
                municipality,
                department,
                has_delivery,
                has_pickup,
                delivery_fee,
                rating,
                total_reviews,
                guatemala_cities!inner (
                  city_name
                )
              )
            `)
            .eq('is_active', true)
            .gt('stock_quantity', 0)
            .order('created_at', { ascending: false });

          if (productsErrorFallback) throw productsErrorFallback;
          
          // Set products without reviews
          const productsWithoutReviews = attachItemRatings(productsDataFallback || [], productRatingMap);
          
          setServices(servicesWithRatings);
          setProducts(productsWithoutReviews);
          return;
        }


        const productsWithRatings = attachItemRatings(productsData || [], productRatingMap);

        setServices(servicesWithRatings);
        setProducts(productsWithRatings);
      } catch (err) {
        console.error('Error fetching marketplace data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          code: (err as any)?.code,
          details: (err as any)?.details,
          hint: (err as any)?.hint
        });
        setError(err instanceof Error ? err.message : 'Error al cargar el marketplace');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceData();
  }, [supabase]);

  // Filter services by category and other filters
  const filteredServices = services.filter(service => {
    const matchesCategory = activeCategory === 'all' || service.service_category === activeCategory;
    const matchesSearch = searchTerm === '' || 
      service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.providers.business_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1];
    const matchesProviderType = selectedProviderType === 'all' || service.providers.business_type === selectedProviderType;
    const matchesProvider = selectedProvider === 'all' || service.providers.business_name === selectedProvider;
    const matchesCity = selectedCity === 'all' || service.providers.guatemala_cities.city_name === selectedCity;
    const matchesRating = selectedRating === 'all' || (service.average_rating && service.average_rating >= parseFloat(selectedRating));
    const matchesRadius = selectedRadius === 'all' || !userLocation || !service.providers.latitude || !service.providers.longitude || 
      calculateDistance(userLocation.lat, userLocation.lng, service.providers.latitude, service.providers.longitude) <= parseFloat(selectedRadius);
    
    return matchesCategory && matchesSearch && matchesPrice && matchesProviderType && 
           matchesProvider && matchesCity && matchesRating && matchesRadius;
  });

  // Filter products by category and other filters
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'all' || product.product_category === activeCategory;
    const matchesSearch =
      searchTerm === '' ||
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.providers.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.tags ?? []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const minPrice = getProductMinPrice(product);
    const matchesPrice = minPrice >= priceRange[0] && minPrice <= priceRange[1];
    const matchesProviderType =
      selectedProviderType === 'all' || product.providers.business_type === selectedProviderType;
    const matchesProvider =
      selectedProvider === 'all' || product.providers.business_name === selectedProvider;
    const matchesCity =
      selectedCity === 'all' || product.providers.guatemala_cities?.city_name === selectedCity;
    const matchesRating =
      selectedRating === 'all' ||
      (product.average_rating && product.average_rating >= parseFloat(selectedRating));
    const matchesRadius =
      selectedRadius === 'all' ||
      !userLocation ||
      !product.providers.latitude ||
      !product.providers.longitude ||
      calculateDistance(
        userLocation.lat,
        userLocation.lng,
        product.providers.latitude,
        product.providers.longitude,
      ) <= parseFloat(selectedRadius);
    const matchesDynamicFilters = productMatchesDynamicFilters(
      product as MarketplaceProductFilterSource,
      activeCategory,
      productFilterValues,
    );

    return (
      matchesCategory &&
      matchesSearch &&
      matchesPrice &&
      matchesProviderType &&
      matchesProvider &&
      matchesCity &&
      matchesRating &&
      matchesRadius &&
      matchesDynamicFilters
    );
  });

  // Sort filtered results
  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.service_name.localeCompare(b.service_name);
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.product_name.localeCompare(b.product_name);
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const favoriteProducts = useMemo(
    () => sortedProducts.filter((product) => favoriteProductIds.has(product.id)),
    [sortedProducts, favoriteProductIds],
  );

  const favoriteServices = useMemo(
    () => sortedServices.filter((service) => favoriteServiceIds.has(service.id)),
    [sortedServices, favoriteServiceIds],
  );

  const favoriteCount = favoriteProductIds.size + favoriteServiceIds.size;

  const marketplaceTabs: MobileTabItem[] = useMemo(
    () => [
      {
        id: 'products',
        label: 'Productos',
        shortLabel: `Productos (${sortedProducts.length})`,
        icon: ShoppingBag,
        gradientIndex: 0,
      },
      {
        id: 'services',
        label: 'Servicios',
        shortLabel: `Servicios (${sortedServices.length})`,
        icon: Scissors,
        gradientIndex: 2,
      },
    ],
    [sortedProducts.length, sortedServices.length],
  );

  const activeProductFilterCount = countActiveProductFilters(activeCategory, productFilterValues);
  const defaultPriceMin = activeTab === 'products' ? productPriceBounds.min : 0;
  const defaultPriceMax = activeTab === 'products' ? productPriceBounds.max : 1000;

  const hasActiveFilters =
    searchTerm !== '' ||
    priceRange[0] !== defaultPriceMin ||
    priceRange[1] !== defaultPriceMax ||
    selectedProviderType !== 'all' ||
    selectedProvider !== 'all' ||
    selectedCity !== 'all' ||
    selectedRating !== 'all' ||
    selectedRadius !== 'all' ||
    (activeTab === 'products' && activeProductFilterCount > 0);

  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([defaultPriceMin, defaultPriceMax]);
    setSelectedProviderType('all');
    setSelectedProvider('all');
    setSelectedCity('all');
    setSelectedRating('all');
    setSelectedRadius('all');
    setProductFilterValues(getDefaultProductFilterValues(activeCategory));
  };

  const updateProductFilter = (filterId: string, value: string) => {
    setProductFilterValues((prev) => ({ ...prev, [filterId]: value }));
  };

  const renderProductDynamicFilters = () => {
    const definitions = getProductFiltersForCategory(activeCategory);
    if (definitions.length === 0) return null;

    const categoryLabel =
      activeCategory === 'all' ? 'productos' : getProductCategoryLabel(activeCategory).toLowerCase();

    return (
      <div className="md:col-span-2 lg:col-span-3 space-y-3 pt-4 border-t border-landing-aqua/10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-landing-aqua-dark">
            Filtros de {categoryLabel}
          </p>
          {activeProductFilterCount > 0 && (
            <span className="text-xs font-medium text-landing-aqua-dark bg-landing-aqua/10 px-2.5 py-1 rounded-full">
              {activeProductFilterCount} activo{activeProductFilterCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {definitions.map((definition) => {
            const options = definition.dynamicSource
              ? buildDynamicFilterOptions(definition, scopedProductsForFilters)
              : definition.options ?? [];

            if (definition.dynamicSource && options.length === 0) return null;

            const currentValue = productFilterValues[definition.id] ?? PRODUCT_FILTER_ALL_VALUE;

            return (
              <div key={definition.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{definition.label}</label>
                <Select value={currentValue} onValueChange={(value) => updateProductFilter(definition.id, value)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={definition.placeholder ?? 'Todos'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PRODUCT_FILTER_ALL_VALUE}>
                      {definition.placeholder ?? 'Todos'}
                    </SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCategoryGrid = (categories: typeof serviceCategories) => (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((category, index) => {
        const active = activeCategory === category.id;
        const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 min-h-[44px] transition-all duration-200',
              active
                ? `bg-gradient-to-r ${gradient} text-white shadow-md`
                : 'bg-white/80 backdrop-blur-sm border border-white/60 text-gray-600 hover:border-landing-aqua/30 hover:text-landing-aqua-dark shadow-sm'
            )}
          >
            <category.icon size={18} className={active ? 'text-white' : 'text-landing-aqua-dark'} />
            <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">{category.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderFiltersPanel = (
    itemLabel: string,
    resultCount: number,
    mode: 'products' | 'services' = 'services',
  ) => (
    <div className={filterPanelClass}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={
            mode === 'products'
              ? 'Buscar por nombre, marca, etiqueta o proveedor...'
              : `Buscar ${itemLabel} o proveedores...`
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 min-h-[44px] rounded-xl border-gray-200/80 bg-white/90"
        />
      </div>

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
          Filtros
          {mode === 'products' && activeProductFilterCount > 0 && !showFilters && (
            <span className="ml-1 rounded-full bg-landing-aqua text-white text-[10px] font-semibold px-1.5 py-0.5">
              {activeProductFilterCount}
            </span>
          )}
          {showFilters && <X className="w-4 h-4" />}
        </Button>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 min-h-[44px] rounded-xl">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Más recientes</SelectItem>
            <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
            <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
            <SelectItem value="name">Nombre A-Z</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}

        <span className="text-sm font-medium text-gray-600 ml-auto bg-white/60 px-3 py-2 rounded-full whitespace-nowrap">
          {resultCount} {itemLabel} encontrados
        </span>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-100/80">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Rango de Precio</label>
            <div className="px-3">
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={mode === 'products' ? productPriceBounds.max : 1000}
                min={mode === 'products' ? productPriceBounds.min : 0}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Q.{priceRange[0]}</span>
                <span>Q.{priceRange[1]}</span>
              </div>
            </div>
          </div>

          {mode === 'products' && renderProductDynamicFilters()}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Proveedor</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todos los proveedores" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider === 'all' ? 'Todos los proveedores' : provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ciudad</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city === 'all' ? 'Todas las ciudades' : city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Calificación Mínima</label>
            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todas las calificaciones" />
              </SelectTrigger>
              <SelectContent>
                {ratingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Radio de Búsqueda</label>
            <Select value={selectedRadius} onValueChange={setSelectedRadius}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Cualquier distancia" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tipo de Proveedor</label>
            <Select value={selectedProviderType} onValueChange={setSelectedProviderType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                {providerTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'Todos los tipos' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  // Get category icon
  const getCategoryIcon = (category: string, isProduct: boolean = false) => {
    const categories = isProduct ? productCategories : serviceCategories;
    const found = categories.find(c => c.id === category);
    return found ? found.icon : ShoppingBag;
  };

  const pickFirstAvailableSize = (product: ProviderProduct): string | null => {
    const pricingConfig = getPricingConfig(product.product_category);
    if (pricingConfig.system === 'single') {
      return product.price > 0 ? 'general' : null;
    }

    for (const size of pricingConfig.sizeOptions || []) {
      const price = (product as Record<string, unknown>)[`price_${size.key}`];
      if (typeof price === 'number' && price > 0) {
        return size.key;
      }
    }

    return product.price > 0 ? 'general' : null;
  };

  // Handle item details
  const handleShowDetails = (item: ProviderService | ProviderProduct) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
    setDetailPhotoIndex(0);
    detailCarouselApi?.scrollTo(0, true);
    setPurchaseMode('one_time');
    setSubscriptionInterval('monthly');
    if ('product_image_url' in item) {
      setSelectedSize(pickFirstAvailableSize(item as ProviderProduct));
    } else {
      setSelectedSize(null);
    }
  };

  // Close details modal
  const handleCloseDetails = () => {
    setSelectedItem(null);
    setShowDetailsModal(false);
    setSelectedImageIndex(0); // Reset image index when closing
    setSelectedSize(null); // Reset size selection when closing
    setPurchaseMode('one_time');
    setSubscriptionInterval('monthly');
  };

  // Format price
  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'GTQ' ? 'Q.' : '$';
    return `${symbol}${price.toFixed(2)}`;
  };

  const formatServicePriceRange = (service: ProviderService) => {
    const sizePrices = [
      service.price_small,
      service.price_medium,
      service.price_large,
      service.price_extra_large,
    ].filter((p): p is number => p != null && p > 0);

    if (sizePrices.length > 0) {
      const min = Math.min(...sizePrices);
      const max = Math.max(...sizePrices);
      return min === max
        ? formatPrice(min, service.currency)
        : `${formatPrice(min, service.currency)} - ${formatPrice(max, service.currency)}`;
    }
    return formatPrice(service.price, service.currency);
  };

  const visibleServices = activeTab === 'favorites' ? favoriteServices : sortedServices;
  const visibleProducts = activeTab === 'favorites' ? favoriteProducts : sortedProducts;

  const blueprintTourFavoriteTarget = useMemo(() => {
    if (visibleProducts.length > 0) {
      return { type: 'product' as const, id: visibleProducts[0].id };
    }
    if (visibleServices.length > 0) {
      return { type: 'service' as const, id: visibleServices[0].id };
    }
    return null;
  }, [visibleProducts, visibleServices]);

  const isBlueprintFavoriteTarget = (itemType: 'product' | 'service', itemId: string) =>
    blueprintTourFavoriteTarget?.type === itemType && blueprintTourFavoriteTarget.id === itemId;

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader variant="inline" message="Cargando productos y servicios…" />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <PageHeader
          title="Marketplace"
          subtitle="Encuentra servicios y productos para tu mascota"
          gradient="from-landing-aqua via-landing-mint to-landing-mango"
        />
        <div className="rounded-2xl bg-red-50/90 border border-red-200 p-4 backdrop-blur-sm">
          <p className="text-red-700 font-medium">{error}</p>
          <Button
            variant="outline"
            className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Marketplace"
        subtitle="Encuentra servicios y productos para tu mascota"
        gradient="from-landing-aqua via-landing-mint to-landing-mango"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('favorites')}
            className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-sm min-h-[36px]', landingHeaderActionBtn)}
          >
            <Heart className="w-4 h-4" />
            Favoritos{favoriteCount > 0 ? ` (${favoriteCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => navigate('/client-orders')}
            className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-sm min-h-[36px]', landingHeaderActionBtn)}
          >
            <Package className="w-4 h-4" />
            Mis órdenes
          </button>
        </div>
      </PageHeader>

      <div className={cn('space-y-4', activeTab === 'favorites' && favoriteCount > 0 && 'flex flex-col')}>
        {activeTab !== 'favorites' && (
          <MobileTabStrip tabs={marketplaceTabs} activeTab={activeTab} onChange={handleTabChange} />
        )}

        {activeTab !== 'favorites' &&
          renderCategoryGrid(activeTab === 'products' ? productCategories : serviceCategories)}

      {activeTab === 'favorites' && favoriteCount === 0 && (
        <div className="text-center py-12 rounded-2xl bg-white/60 border border-white/60">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No tienes favoritos</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
            Marca productos o servicios con la estrella para verlos aquí.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => handleTabChange('products')}>
              Ver productos
            </Button>
            <Button variant="outline" onClick={() => handleTabChange('services')}>
              Ver servicios
            </Button>
          </div>
        </div>
      )}

      {(activeTab === 'services' || activeTab === 'favorites') && (activeTab !== 'favorites' || favoriteServices.length > 0) && (
        <div className={cn('space-y-4', activeTab === 'favorites' && 'order-2')}>
          {activeTab === 'favorites' && (
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 px-0.5">
              <Scissors className="w-4 h-4 text-landing-aqua-dark" />
              Servicios favoritos ({favoriteServices.length})
            </h2>
          )}
          {activeTab === 'services' && renderFiltersPanel('servicios', sortedServices.length, 'services')}

          {activeTab === 'services' && sortedServices.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/60 border border-white/60">
              <Scissors className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay servicios disponibles</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {activeCategory === 'all'
                  ? 'Los proveedores aún no han agregado servicios.'
                  : `No hay servicios de ${serviceCategories.find((c) => c.id === activeCategory)?.label.toLowerCase()} disponibles en este momento.`}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 items-stretch">
              {visibleServices.map((service, index) => {
                const CategoryIcon = getCategoryIcon(service.service_category);
                const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
                return (
                  <Card
                    key={service.id}
                    className={cn(itemCardClass, 'cursor-pointer')}
                    onClick={() => handleShowDetails(service)}
                  >
                    {(() => {
                      const allImages = getCatalogImageUrls(
                        service.service_image_url,
                        service.secondary_images,
                      );

                      if (allImages.length === 0) {
                        return (
                          <div className={cn('relative w-full h-32 md:h-44 flex items-center justify-center bg-gradient-to-br', gradient, 'opacity-20')}>
                            <CategoryIcon className="w-10 h-10 text-landing-aqua-dark" />
                            <div className="absolute top-2 left-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  categoryBadgeBaseClass,
                                  getCategoryBadgeClass(service.service_category, 'service')
                                )}
                              >
                                {formatCategoryLabel(service.service_category)}
                              </Badge>
                            </div>
                            <div className="absolute top-2 right-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-blueprint-guided={
                                  isBlueprintFavoriteTarget('service', service.id) ? 'add-favorite' : undefined
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite('service', service.id);
                                }}
                                className={cn(
                                  'w-8 h-8 p-0 rounded-full transition-all duration-200',
                                  favoriteServiceIds.has(service.id)
                                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                                    : 'bg-white/95 text-gray-600 hover:bg-white hover:shadow-md'
                                )}
                              >
                                <Star className="w-4 h-4" fill={favoriteServiceIds.has(service.id) ? 'currentColor' : 'none'} />
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="relative w-full h-32 md:h-44 overflow-hidden">
                          <img
                            src={allImages[0]}
                            alt={service.service_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                            {allImages.length > 1 && (
                              <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {allImages.length}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              data-blueprint-guided={
                                isBlueprintFavoriteTarget('service', service.id) ? 'add-favorite' : undefined
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite('service', service.id);
                              }}
                              className={cn(
                                'w-8 h-8 p-0 rounded-full transition-all duration-200',
                                favoriteServiceIds.has(service.id)
                                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                                  : 'bg-white/95 text-gray-600 hover:bg-white hover:shadow-md'
                              )}
                            >
                              <Star className="w-4 h-4" fill={favoriteServiceIds.has(service.id) ? 'currentColor' : 'none'} />
                            </Button>
                          </div>
                          <div className="absolute top-2 left-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                categoryBadgeBaseClass,
                                getCategoryBadgeClass(service.service_category, 'service')
                              )}
                            >
                              {formatCategoryLabel(service.service_category)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                    <CardHeader className="pb-2 pt-3 px-3 md:px-5 shrink-0">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant="outline" className="text-[10px] md:text-xs shrink-0 border-landing-aqua/25 text-landing-aqua-dark bg-landing-aqua/5">
                          {service.duration_minutes} min
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 pt-0 px-3 md:px-5 pb-4">
                      <div className="flex-1">
                        <h3 className={cardTitleClass}>{service.service_name}</h3>
                        <p className={cardDescriptionClass}>{service.description}</p>
                      </div>

                      <div className="mt-auto pt-3 border-t border-gray-100/80">
                        <div className={cn(cardMetaBlockClass, 'mb-3')}>
                          <div className="flex items-center text-gray-500 text-xs md:text-sm min-h-[1.25rem]">
                            <Building2 size={12} className="mr-1.5 shrink-0" />
                            <span className="truncate">{service.providers.business_name}</span>
                          </div>
                          <div className="flex items-center text-gray-500 text-xs md:text-sm min-h-[1.25rem]">
                            <MapPin size={12} className="mr-1.5 shrink-0" />
                            <span className="truncate">{service.providers.address || '\u00A0'}</span>
                          </div>
                      </div>

                      <div className="space-y-1 mb-2 md:mb-3">
                        <MarketplaceRatingBadge
                          label="Servicio"
                          variant="item"
                          average={service.average_rating}
                          count={service.review_count}
                        />
                        <MarketplaceRatingBadge
                          label="Proveedor"
                          variant="provider"
                          average={service.providers.rating}
                          count={service.providers.total_reviews}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm md:text-lg font-bold text-landing-aqua-dark truncate">
                          {(() => {
                            const hasSizePrices =
                              service.price_small ||
                              service.price_medium ||
                              service.price_large ||
                              service.price_extra_large;

                            if (hasSizePrices) {
                              const sizePrices = [
                                service.price_small,
                                service.price_medium,
                                service.price_large,
                                service.price_extra_large,
                              ].filter((p): p is number => p !== null && p !== undefined);

                              if (sizePrices.length > 0) {
                                const minPrice = Math.min(...sizePrices);
                                const maxPrice = Math.max(...sizePrices);
                                return minPrice === maxPrice
                                  ? formatPrice(minPrice, service.currency)
                                  : `${formatPrice(minPrice, service.currency)} - ${formatPrice(maxPrice, service.currency)}`;
                              }
                            }

                            return formatPrice(service.price, service.currency);
                          })()}
                        </span>
                        <Button
                          className={cn(landingBtnPrimary, 'text-xs md:text-sm px-2 md:px-4 shrink-0')}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServiceBooking(service);
                          }}
                        >
                          Reservar
                        </Button>
                      </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'products' || activeTab === 'favorites') && (activeTab !== 'favorites' || favoriteProducts.length > 0) && (
        <div className={cn('space-y-4', activeTab === 'favorites' && 'order-1')}>
          {activeTab === 'favorites' && (
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 px-0.5">
              <ShoppingBag className="w-4 h-4 text-landing-aqua-dark" />
              Productos favoritos ({favoriteProducts.length})
            </h2>
          )}
          {activeTab === 'products' && renderFiltersPanel('productos', sortedProducts.length, 'products')}

          {activeTab === 'products' && sortedProducts.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/60 border border-white/60">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay productos disponibles</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {activeCategory === 'all'
                  ? 'Los proveedores aún no han agregado productos.'
                  : `No hay productos de ${productCategories.find((c) => c.id === activeCategory)?.label.toLowerCase()} disponibles en este momento.`}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 items-stretch">
              {visibleProducts.map((product, index) => {
                const CategoryIcon = getCategoryIcon(product.product_category, true);
                const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
                return (
                  <Card key={product.id} className={itemCardClass}>
                    <div className="relative h-32 md:h-44 overflow-hidden bg-gray-100">
                      {(() => {
                        const allImages = getCatalogImageUrls(
                          product.product_image_url,
                          product.secondary_images,
                        );
                        
                        if (allImages.length === 0) {
                          return (
                            <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br', gradient, 'opacity-25')}>
                              <CategoryIcon className="w-10 h-10 text-landing-aqua-dark" />
                            </div>
                          );
                        }
                        
                        return (
                          <button
                            type="button"
                            className="relative w-full h-full"
                            onClick={() => handleShowDetails(product)}
                          >
                            <img
                              src={allImages[0]}
                              alt={product.product_name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                            {allImages.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {allImages.length}
                              </div>
                            )}
                          </button>
                        );
                      })()}
                      
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            categoryBadgeBaseClass,
                            getCategoryBadgeClass(product.product_category, 'product')
                          )}
                        >
                          {formatCategoryLabel(product.product_category)}
                        </Badge>
                      </div>

                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {product.discount_percentage && product.discount_percentage > 0 && (
                          <Badge variant="destructive" className="text-[10px] font-medium shadow-lg">
                            -{product.discount_percentage}%
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          data-blueprint-guided={
                            isBlueprintFavoriteTarget('product', product.id) ? 'add-favorite' : undefined
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite('product', product.id);
                          }}
                          className={cn(
                            'w-8 h-8 p-0 rounded-full transition-all duration-200',
                            favoriteProductIds.has(product.id)
                              ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                              : 'bg-white/95 text-gray-600 hover:bg-white hover:shadow-md'
                          )}
                        >
                          <Star className="w-4 h-4" fill={favoriteProductIds.has(product.id) ? 'currentColor' : 'none'} />
                        </Button>
                      </div>
                    </div>
                    
                    <CardHeader className="pb-1 pt-3 px-3 md:px-5">
                      <div className="flex items-center justify-end gap-2">
                        {product.brand && (
                          <Badge variant="outline" className="text-[10px] shrink-0 border-gray-200 text-gray-600 bg-white/90">
                            {product.brand}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 md:px-5 pb-4">
                      <button type="button" onClick={() => handleShowDetails(product)} className="w-full text-left">
                        <h3 className="font-bold text-sm md:text-base text-gray-800 mb-1 line-clamp-3 min-h-[3.75rem] md:min-h-[4.125rem] leading-snug hover:text-landing-aqua-dark transition-colors">
                          {product.product_name}
                        </h3>
                      </button>
                      <p className="text-gray-600 text-xs md:text-sm mb-2 line-clamp-2">{product.description}</p>

                      {/* Provider and Location Info */}
                      <div className="space-y-1 md:space-y-2 mb-2 md:mb-3">
                        <div className="flex items-center text-gray-500 text-xs md:text-sm">
                          <Building2 size={12} className="md:w-3.5 md:h-3.5 mr-1 md:mr-2 flex-shrink-0" />
                          <span className="truncate">{product.providers.business_name}</span>
                        </div>
                        
                        {/* Distance */}
                        {userLocation && product.providers.latitude && product.providers.longitude && (
                          <div className="flex items-center text-gray-500 text-xs md:text-sm">
                            <MapPin size={12} className="md:w-3.5 md:h-3.5 mr-1 md:mr-2 flex-shrink-0" />
                            <span className="truncate">{product.providers.address}</span>
                            <span className="ml-1 text-landing-aqua-dark font-medium text-[10px] md:text-xs">
                              ({formatDistance(calculateDistance(
                                userLocation.lat, 
                                userLocation.lng, 
                                product.providers.latitude, 
                                product.providers.longitude
                              ))})
                            </span>
                          </div>
                        )}

                        {/* Delivery Options */}
                        {product.has_delivery && (
                          <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-1 md:px-2">
                              🚚 {product.delivery_fee && product.delivery_fee > 0 ? `Q${product.delivery_fee}` : 'Delivery'}
                            </Badge>
                          </div>
                        )}
                        {isProductSubscriptionEligible(product) && (
                          <div className="flex items-center gap-1 text-[10px] md:text-xs">
                            <Badge variant="outline" className="bg-landing-aqua/10 text-landing-aqua-dark border-landing-aqua/25 px-1 md:px-2 gap-1">
                              <RefreshCw className="w-3 h-3" />
                              Suscripción
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Reviews */}
                      <div className="space-y-1 mb-2 md:mb-3">
                        <MarketplaceRatingBadge
                          label="Producto"
                          variant="item"
                          average={product.average_rating}
                          count={product.review_count}
                        />
                        <MarketplaceRatingBadge
                          label="Proveedor"
                          variant="provider"
                          average={product.providers.rating}
                          count={product.providers.total_reviews}
                        />
                      </div>

                      {/* Price Section */}
                      <div className="flex items-center justify-between mb-2 md:mb-3 gap-1">
                        <div className="min-w-0 flex-1">
                          {(() => {
                            const pricingConfig = getPricingConfig(product.product_category);
                            
                            // Always check if product has size-based pricing, regardless of category config
                            // This allows products to have size prices even if category is set to 'single'
                            const hasDogSizePrices = product.price_small || 
                              product.price_medium || 
                              product.price_large || 
                              product.price_extra_large;
                            
                            const hasClothingSizePrices = (product as any).price_xs ||
                              (product as any).price_s ||
                              (product as any).price_m ||
                              (product as any).price_l ||
                              (product as any).price_xl ||
                              (product as any).price_xxl;
                            
                            const hasSizePrices = hasDogSizePrices || hasClothingSizePrices;
                            
                            if (hasSizePrices) {
                              // Collect all available size prices (only valid numbers)
                              const sizePrices: number[] = [];
                              
                              // Always check for dog size prices (only if they're valid numbers)
                              if (product.price_small != null && !isNaN(Number(product.price_small)) && product.price_small > 0) {
                                sizePrices.push(Number(product.price_small));
                              }
                              if (product.price_medium != null && !isNaN(Number(product.price_medium)) && product.price_medium > 0) {
                                sizePrices.push(Number(product.price_medium));
                              }
                              if (product.price_large != null && !isNaN(Number(product.price_large)) && product.price_large > 0) {
                                sizePrices.push(Number(product.price_large));
                              }
                              if (product.price_extra_large != null && !isNaN(Number(product.price_extra_large)) && product.price_extra_large > 0) {
                                sizePrices.push(Number(product.price_extra_large));
                              }
                              
                              // Always check for clothing size prices (only if they're valid numbers)
                              const clothingPrices = ['price_xs', 'price_s', 'price_m', 'price_l', 'price_xl', 'price_xxl'];
                              clothingPrices.forEach(priceKey => {
                                const price = (product as any)[priceKey];
                                if (price != null && !isNaN(Number(price)) && price > 0) {
                                  sizePrices.push(Number(price));
                                }
                              });
                              
                              // Don't include general price in the range if we have size-specific prices
                              
                              if (sizePrices.length > 0) {
                                const minPrice = Math.min(...sizePrices);
                                const maxPrice = Math.max(...sizePrices);
                                
                                if (product.discount_percentage && product.discount_percentage > 0 && product.original_price) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <div className="flex flex-col">
                                        <span className="text-sm md:text-lg font-bold text-landing-aqua-dark">
                                          {minPrice === maxPrice 
                                            ? formatPrice(minPrice, product.currency)
                                            : `${formatPrice(minPrice, product.currency)} - ${formatPrice(maxPrice, product.currency)}`
                                          }
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                          {minPrice === maxPrice ? 'Precio único' : 'Rango'}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500 line-through hidden md:inline">
                                        {formatPrice(product.original_price, product.currency)}
                                      </span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex flex-col">
                                      <span className="text-sm md:text-lg font-bold text-landing-aqua-dark">
                                        {minPrice === maxPrice 
                                          ? formatPrice(minPrice, product.currency)
                                          : `${formatPrice(minPrice, product.currency)} - ${formatPrice(maxPrice, product.currency)}`
                                        }
                                      </span>
                                      <span className="text-[10px] text-gray-500">
                                        {minPrice === maxPrice ? 'Precio único' : 'Rango'}
                                      </span>
                                    </div>
                                  );
                                }
                              }
                            }
                            
                            if (product.discount_percentage && product.discount_percentage > 0 && product.original_price) {
                              return (
                                <div className="flex items-center gap-1 md:gap-2">
                                  <span className="text-sm md:text-lg font-bold text-landing-aqua-dark">
                                    {formatPrice(product.price, product.currency)}
                                  </span>
                                  <span className="text-xs text-gray-500 line-through hidden md:inline">
                                    {formatPrice(product.original_price, product.currency)}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <span className="text-sm md:text-lg font-bold text-landing-aqua-dark">
                                {formatPrice(product.price, product.currency)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div className="space-y-1 md:space-y-2">
                        <div className="flex gap-2">
                          <Button
                            className={cn('flex-1 text-xs md:text-sm', landingBtnPrimary)}
                            size="sm"
                            disabled={product.stock_quantity === 0}
                            onClick={() => {
                              const hasSizeOptions = product.price_small || product.price_medium || product.price_large || product.price_extra_large;
                              if (hasSizeOptions || isProductSubscriptionEligible(product)) {
                                handleShowDetails(product);
                              } else {
                                const qty = productQuantity[product.id] || 1;
                                handleAddToCart(product, qty);
                              }
                            }}
                          >
                            {product.stock_quantity === 0 ? 'Sin Stock' : 'Comprar'}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 text-xs md:text-sm border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10"
                            size="sm"
                            onClick={() => handleShowDetails(product)}
                          >
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      <Dialog open={showDetailsModal} onOpenChange={(open) => !open && handleCloseDetails()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-landing-aqua/20 shadow-xl p-0 gap-0">
          {selectedItem && (
            <>
              <DialogHeader className="px-5 pt-5 pb-4 border-b border-landing-aqua/10 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
                <DialogTitle className="text-lg font-bold text-gray-900 pr-8 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white shadow-md">
                    {'service_name' in selectedItem ? (
                      <Scissors className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </span>
                  <span className="min-w-0 pt-1">
                    {'service_name' in selectedItem ? selectedItem.service_name : selectedItem.product_name}
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          categoryBadgeBaseClass,
                          'text-[10px] font-normal',
                          getCategoryBadgeClass(
                            'service_name' in selectedItem
                              ? selectedItem.service_category
                              : selectedItem.product_category,
                            'service_name' in selectedItem ? 'service' : 'product'
                          )
                        )}
                      >
                        {formatCategoryLabel(
                          'service_name' in selectedItem
                            ? selectedItem.service_category
                            : selectedItem.product_category
                        )}
                      </Badge>
                      {'service_name' in selectedItem && (
                        <Badge variant="outline" className="text-[10px] border-landing-aqua/25 text-landing-aqua-dark">
                          {selectedItem.duration_minutes} min
                        </Badge>
                      )}
                    </span>
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="p-5 space-y-4">
                {selectedItem && (() => {
                  const isService = 'service_name' in selectedItem;
                  const itemName = isService
                    ? (selectedItem as ProviderService).service_name
                    : (selectedItem as ProviderProduct).product_name;
                  const mainImage = isService
                    ? (selectedItem as ProviderService).service_image_url
                    : (selectedItem as ProviderProduct).product_image_url;
                  const secondaryImages = isService
                    ? (selectedItem as ProviderService).secondary_images
                    : (selectedItem as ProviderProduct).secondary_images;
                  const allImages = getCatalogImageUrls(mainImage, secondaryImages);
                  const CategoryIcon = isService
                    ? getCategoryIcon((selectedItem as ProviderService).service_category)
                    : getCategoryIcon((selectedItem as ProviderProduct).product_category, true);

                  if (allImages.length === 0) {
                    return (
                      <div className="rounded-xl overflow-hidden border border-landing-aqua/15 h-40 flex items-center justify-center bg-gradient-to-br from-landing-aqua/15 to-landing-mint/15">
                        {isService ? (
                          <Scissors className="w-12 h-12 text-landing-aqua-dark/50" />
                        ) : (
                          <CategoryIcon className="w-12 h-12 text-landing-aqua-dark/50" />
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <PetPhotoCarousel
                        images={allImages}
                        alt={itemName}
                        aspectClassName="aspect-[4/3]"
                        showCounter
                        showArrows={allImages.length > 1}
                        showDots={allImages.length > 1}
                        setApi={setDetailCarouselApi}
                        className="rounded-xl border border-landing-aqua/15 shadow-sm overflow-hidden"
                      />
                      {allImages.length > 1 && (
                        <PetPhotoThumbnails
                          images={allImages}
                          current={detailPhotoIndex}
                          onSelect={(index) => detailCarouselApi?.scrollTo(index)}
                          alt={itemName}
                        />
                      )}
                    </div>
                  );
                })()}
                {/* Price & rating summary */}
                <div className={cn(detailsModalSectionClass, 'space-y-3')}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-gray-500 block mb-0.5">Precio</span>
                      <p className="text-2xl font-bold text-landing-aqua-dark">
                        {'service_name' in selectedItem
                          ? formatServicePriceRange(selectedItem)
                          : (() => {
                              const product = selectedItem as ProviderProduct;
                              if (selectedSize && selectedSize !== 'general') {
                                const sizePrice = (product as Record<string, unknown>)[`price_${selectedSize}`];
                                if (typeof sizePrice === 'number' && sizePrice > 0) {
                                  return formatPrice(sizePrice, product.currency);
                                }
                              }
                              return formatPrice(product.price, product.currency);
                            })()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-landing-aqua/10">
                    <MarketplaceRatingBadge
                      label={'service_name' in selectedItem ? 'Servicio' : 'Producto'}
                      variant="item"
                      average={selectedItem.average_rating}
                      count={selectedItem.review_count}
                      size="md"
                      showScoreText
                    />
                    <MarketplaceRatingBadge
                      label="Proveedor"
                      variant="provider"
                      average={selectedItem.providers.rating}
                      count={selectedItem.providers.total_reviews}
                      size="md"
                      showScoreText
                    />
                  </div>
                </div>

                {/* Description */}
                <div className={detailsModalSectionClass}>
                  <h4 className="font-semibold text-landing-aqua-dark mb-1.5 text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    Descripción
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {selectedItem.description}
                  </p>
                  {selectedItem.detailed_description && (
                    <div className="mt-3 pt-3 border-t border-landing-aqua/10">
                      <p className="text-xs font-medium text-landing-aqua-dark mb-1">Descripción detallada</p>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                        {selectedItem.detailed_description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Provider Information */}
                <div>
                  <h4 className="font-semibold text-landing-aqua-dark mb-2 text-sm">Proveedor</h4>
                  <div className={cn(detailsModalSectionClass, 'space-y-2.5')}>
                    <div className="flex items-center gap-3">
                      {selectedItem.providers.profile_picture_url ? (
                        <img
                          src={selectedItem.providers.profile_picture_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-landing-aqua/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-landing-aqua to-landing-mint flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {selectedItem.providers.business_name}
                        </p>
                        <p className="text-xs text-gray-500">{selectedItem.providers.business_type}</p>
                      </div>
                    </div>
                    {selectedItem.providers.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedItem.providers.description}</p>
                    )}
                    {selectedItem.providers.address && (
                      <div className="flex items-start text-gray-600 text-sm">
                        <MapPin size={14} className="mr-2 text-landing-aqua-dark shrink-0 mt-0.5" />
                        <span>
                          {selectedItem.providers.address}
                          {selectedItem.providers.guatemala_cities?.city_name &&
                            `, ${selectedItem.providers.guatemala_cities.city_name}`}
                          {selectedItem.providers.municipality &&
                            !selectedItem.providers.guatemala_cities?.city_name &&
                            `, ${selectedItem.providers.municipality}`}
                        </span>
                      </div>
                    )}
                    {selectedItem.providers.phone && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <Phone size={14} className="mr-2 text-landing-aqua-dark shrink-0" />
                        <span>{selectedItem.providers.phone}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedItem.providers.has_delivery && (
                        <Badge variant="outline" className="text-[10px] border-landing-mint/30 text-landing-mint-dark">
                          <Truck className="w-3 h-3 mr-1" />
                          Entrega
                          {selectedItem.providers.delivery_fee
                            ? ` · Q${selectedItem.providers.delivery_fee}`
                            : ''}
                        </Badge>
                      )}
                      {selectedItem.providers.has_pickup && (
                        <Badge variant="outline" className="text-[10px] border-landing-aqua/30 text-landing-aqua-dark">
                          Retiro en tienda
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <MarketplaceCatalogReviews
                  itemType={'service_name' in selectedItem ? 'service' : 'product'}
                  itemId={selectedItem.id}
                  itemName={
                    'service_name' in selectedItem
                      ? selectedItem.service_name
                      : selectedItem.product_name
                  }
                  averageRating={selectedItem.average_rating}
                  reviewCount={selectedItem.review_count}
                  className={detailsModalSectionClass}
                />

                <MarketplaceProviderReviews
                  providerTableId={selectedItem.providers.id}
                  averageRating={selectedItem.providers.rating}
                  reviewCount={selectedItem.providers.total_reviews}
                  className={detailsModalSectionClass}
                />

                {/* Service/Product Specific Details */}
                {('service_name' in selectedItem) ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-landing-aqua-dark text-sm">Detalles del servicio</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={detailsModalSectionClass}>
                        <span className="text-xs text-gray-500">Duración</span>
                        <p className="font-semibold text-sm text-gray-800 mt-0.5">{selectedItem.duration_minutes} min</p>
                      </div>
                      <div className={detailsModalSectionClass}>
                        <span className="text-xs text-gray-500">Categoría</span>
                        <Badge
                          variant="outline"
                          className={cn(categoryBadgeBaseClass, 'mt-1', getCategoryBadgeClass(selectedItem.service_category, 'service'))}
                        >
                          {formatCategoryLabel(selectedItem.service_category)}
                        </Badge>
                      </div>
                      {selectedItem.max_advance_booking_days != null && (
                        <div className={detailsModalSectionClass}>
                          <span className="text-xs text-gray-500">Reserva hasta</span>
                          <p className="font-semibold text-sm text-gray-800 mt-0.5">
                            {selectedItem.max_advance_booking_days} días antes
                          </p>
                        </div>
                      )}
                      {selectedItem.min_advance_booking_hours != null && (
                        <div className={detailsModalSectionClass}>
                          <span className="text-xs text-gray-500">Aviso mínimo</span>
                          <p className="font-semibold text-sm text-gray-800 mt-0.5">
                            {selectedItem.min_advance_booking_hours} h
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedItem.preparation_instructions && (
                      <div className={detailsModalSectionClass}>
                        <span className="text-xs font-medium text-landing-aqua-dark block mb-1">Qué preparar</span>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{selectedItem.preparation_instructions}</p>
                      </div>
                    )}
                    {selectedItem.cancellation_policy && (
                      <div className={detailsModalSectionClass}>
                        <span className="text-xs font-medium text-landing-aqua-dark block mb-1">Política de cancelación</span>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{selectedItem.cancellation_policy}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-landing-aqua-dark text-sm">Detalles del producto</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={detailsModalSectionClass}>
                        <span className="text-xs text-gray-500">Categoría</span>
                        <Badge
                          variant="outline"
                          className={cn(categoryBadgeBaseClass, 'mt-1', getCategoryBadgeClass(selectedItem.product_category, 'product'))}
                        >
                          {formatCategoryLabel(selectedItem.product_category)}
                        </Badge>
                      </div>
                      {selectedItem.brand && (
                        <div className={detailsModalSectionClass}>
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Marca</span>
                          <p className="font-semibold text-sm text-gray-800 mt-0.5">{selectedItem.brand}</p>
                        </div>
                      )}
                      {selectedItem.weight_kg != null && selectedItem.weight_kg > 0 && (
                        <div className={detailsModalSectionClass}>
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Weight className="w-3 h-3" /> Peso</span>
                          <p className="font-semibold text-sm text-gray-800 mt-0.5">{selectedItem.weight_kg} kg</p>
                        </div>
                      )}
                      {selectedItem.dimensions_cm && (
                        <div className={detailsModalSectionClass}>
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Ruler className="w-3 h-3" /> Dimensiones</span>
                          <p className="font-semibold text-sm text-gray-800 mt-0.5">{selectedItem.dimensions_cm}</p>
                        </div>
                      )}
                      <div className={detailsModalSectionClass}>
                        <span className="text-xs text-gray-500">Disponibilidad</span>
                        <p className={cn('font-semibold text-sm mt-0.5', selectedItem.stock_quantity > 0 ? 'text-landing-mint-dark' : 'text-red-600')}>
                          {selectedItem.stock_quantity > 0
                            ? `${selectedItem.stock_quantity} en stock`
                            : 'Agotado'}
                        </p>
                      </div>
                    </div>
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] bg-landing-aqua/10 text-landing-aqua-dark">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Selector de Tamaño */}
                    {(() => {
                      const product = selectedItem as ProviderProduct;
                      const pricingConfig = getPricingConfig(product.product_category);
                      
                      // Build size options based on pricing system
                      let sizeOptions: Array<{ key: string; label: string; description?: string; price?: number | null }> = [];
                      
                      if (pricingConfig.system === 'dog_size') {
                        sizeOptions = pricingConfig.sizeOptions?.map(size => ({
                          key: size.key,
                          label: size.label,
                          description: size.description,
                          price: (product as any)[`price_${size.key}`]
                        })) || [];
                      } else if (pricingConfig.system === 'clothing_size') {
                        sizeOptions = pricingConfig.sizeOptions?.map(size => ({
                          key: size.key,
                          label: size.label,
                          description: size.description,
                          price: (product as any)[`price_${size.key}`]
                        })) || [];
                      }

                      // Filter out options without prices
                      const availableSizeOptions = sizeOptions.filter(p => p.price !== null && p.price !== undefined);
                      const hasSizeOptions = availableSizeOptions.length > 0;
                      const hasGeneralPrice = product.price && product.price > 0;

                      if (pricingConfig.system === 'single') {
                        // Single price system - no size selector needed
                        return null;
                      }

                      if (!hasSizeOptions && !hasGeneralPrice) return null;

                      return (
                        <div>
                          <h4 className="font-semibold text-landing-aqua-dark mb-3 text-sm">Selecciona el Tamaño *</h4>
                          {hasSizeOptions && (
                            <div className={`grid gap-3 mb-3 ${
                              pricingConfig.system === 'clothing_size' 
                                ? 'grid-cols-2 md:grid-cols-3' 
                                : 'grid-cols-2'
                            }`}>
                              {availableSizeOptions.map((size) => (
                                <button
                                  key={size.key}
                                  onClick={() => setSelectedSize(size.key)}
                                  className={cn(
                                    'p-3 rounded-xl border-2 transition-all text-left',
                                    selectedSize === size.key
                                      ? 'border-landing-aqua bg-landing-aqua/5 ring-2 ring-landing-aqua/20'
                                      : 'border-gray-200 hover:border-landing-aqua/30 bg-white'
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={cn('text-sm font-medium', selectedSize === size.key ? 'text-landing-aqua-dark' : 'text-gray-700')}>
                                      {pricingConfig.system === 'clothing_size' ? `Talla ${size.label}` : size.label}
                                    </span>
                                    {selectedSize === size.key && (
                                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                      </div>
                                    )}
                                  </div>
                                  {size.description && (
                                    <span className="text-xs text-gray-500 block mb-1">{size.description}</span>
                                  )}
                                  <p className={cn('text-lg font-bold', selectedSize === size.key ? 'text-landing-aqua-dark' : 'text-gray-600')}>
                                    {selectedItem.currency === 'GTQ' ? 'Q.' : '$'}
                                    {size.price?.toFixed(2)}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                          {hasGeneralPrice && (
                            <button
                              onClick={() => setSelectedSize('general')}
                              className={cn(
                                'w-full p-3 rounded-xl border-2 transition-all text-left',
                                selectedSize === 'general'
                                  ? 'border-landing-aqua bg-landing-aqua/5 ring-2 ring-landing-aqua/20'
                                  : 'border-gray-200 hover:border-landing-aqua/30 bg-white'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className={cn('text-sm font-medium block', selectedSize === 'general' ? 'text-landing-aqua-dark' : 'text-gray-700')}>
                                    Precio General
                                  </span>
                                  <span className="text-xs text-gray-500">Sin diferenciación por tamaño</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className={cn('text-lg font-bold', selectedSize === 'general' ? 'text-landing-aqua-dark' : 'text-gray-600')}>
                                    {selectedItem.currency === 'GTQ' ? 'Q.' : '$'}
                                    {product.price.toFixed(2)}
                                  </p>
                                  {selectedSize === 'general' && (
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Price and Action */}
                <div className="border-t border-landing-aqua/15 pt-4 -mx-1 px-1">
                  <div className="rounded-xl bg-gradient-to-r from-landing-aqua/8 to-landing-mint/8 border border-landing-aqua/15 p-4 space-y-3">
                    {(() => {
                      if ('service_name' in selectedItem) {
                        return (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="text-sm text-gray-500">Precio</span>
                              <p className="text-2xl font-bold text-landing-aqua-dark">
                                {formatServicePriceRange(selectedItem)}
                              </p>
                            </div>
                            <Badge className={cn(landingBadge, 'shrink-0')}>
                              {selectedItem.duration_minutes} min
                            </Badge>
                          </div>
                        );
                      }

                      const product = selectedItem as ProviderProduct;
                      const pricingConfig = getPricingConfig(product.product_category);
                      let displayPrice = product.price;
                      let sizeLabel = '';

                      if (selectedSize && selectedSize !== 'general') {
                        const sizePrice = (product as any)[`price_${selectedSize}`];
                        if (sizePrice) {
                          displayPrice = sizePrice;
                          const sizeOption = pricingConfig.sizeOptions?.find(s => s.key === selectedSize);
                          if (sizeOption) {
                            sizeLabel = ` (${sizeOption.label})`;
                          }
                        }
                      } else if (selectedSize === 'general' && product.price) {
                        displayPrice = product.price;
                        sizeLabel = '';
                      }

                      return (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-500">Precio{sizeLabel}</span>
                            <p className="text-2xl font-bold text-landing-aqua-dark">
                              {formatPrice(displayPrice, selectedItem.currency)}
                            </p>
                            {!selectedSize && getPricingConfig((selectedItem as ProviderProduct).product_category).system !== 'single' && (
                              <p className="text-xs text-red-500 mt-1">Por favor selecciona un tamaño</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {!('service_name' in selectedItem) && isProductSubscriptionEligible(selectedItem as ProviderProduct) && selectedItem.stock_quantity > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-landing-aqua-dark text-sm flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          Tipo de compra
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPurchaseMode('one_time')}
                            className={cn(
                              'p-3 rounded-xl border-2 text-left transition-all',
                              purchaseMode === 'one_time'
                                ? 'border-landing-aqua bg-landing-aqua/5 ring-2 ring-landing-aqua/20'
                                : 'border-gray-200 hover:border-landing-aqua/30 bg-white',
                            )}
                          >
                            <span className="text-sm font-medium block">Compra única</span>
                            <span className="text-xs text-gray-500">Pago una sola vez</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPurchaseMode('subscription')}
                            className={cn(
                              'p-3 rounded-xl border-2 text-left transition-all',
                              purchaseMode === 'subscription'
                                ? 'border-landing-aqua bg-landing-aqua/5 ring-2 ring-landing-aqua/20'
                                : 'border-gray-200 hover:border-landing-aqua/30 bg-white',
                            )}
                          >
                            <span className="text-sm font-medium block">Suscripción</span>
                            <span className="text-xs text-gray-500">Entregas recurrentes</span>
                          </button>
                        </div>
                        {purchaseMode === 'subscription' && (
                          <div>
                            <Label className="text-sm text-gray-700 mb-2 block">¿Cada cuánto quieres recibirlo?</Label>
                            <Select value={subscriptionInterval} onValueChange={(v) => setSubscriptionInterval(v as SubscriptionInterval)}>
                              <SelectTrigger className="border-landing-aqua/25">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SUBSCRIPTION_INTERVALS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label} — {opt.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-2">
                              Se cobrará el precio del producto en cada entrega programada.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {!('service_name' in selectedItem) && selectedItem.stock_quantity > 0 && (
                      <div className="flex items-center gap-3">
                        <Label htmlFor="quantity-modal" className="text-sm font-medium text-gray-700">Cantidad:</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={detailsModalOutlineBtn}
                            onClick={() => {
                              const currentQty = productQuantity[selectedItem.id] || 1;
                              if (currentQty > 1) {
                                setProductQuantity(prev => ({ ...prev, [selectedItem.id]: currentQty - 1 }));
                              }
                            }}
                            disabled={(productQuantity[selectedItem.id] || 1) <= 1}
                          >
                            -
                          </Button>
                          <Input
                            id="quantity-modal"
                            type="number"
                            min="1"
                            max={selectedItem.stock_quantity}
                            value={productQuantity[selectedItem.id] || 1}
                            onChange={(e) => {
                              const qty = Math.max(1, Math.min(selectedItem.stock_quantity, parseInt(e.target.value) || 1));
                              setProductQuantity(prev => ({ ...prev, [selectedItem.id]: qty }));
                            }}
                            className="w-20 text-center border-landing-aqua/25 focus-visible:ring-landing-aqua/40"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className={detailsModalOutlineBtn}
                            onClick={() => {
                              const currentQty = productQuantity[selectedItem.id] || 1;
                              if (currentQty < selectedItem.stock_quantity) {
                                setProductQuantity(prev => ({ ...prev, [selectedItem.id]: currentQty + 1 }));
                              }
                            }}
                            disabled={(productQuantity[selectedItem.id] || 1) >= selectedItem.stock_quantity}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {'service_name' in selectedItem ? (
                        <Button
                          className={cn('flex-1 min-h-[44px]', landingBtnPrimary, 'border-0')}
                          size="sm"
                          onClick={() => {
                            handleServiceBooking(selectedItem as ProviderService);
                            setShowDetailsModal(false);
                          }}
                        >
                          Reservar Servicio
                        </Button>
                      ) : (
                        <Button
                          className={cn('flex-1 min-h-[44px]', landingBtnPrimary, 'border-0')}
                          disabled={
                            selectedItem.stock_quantity === 0 ||
                            (getPricingConfig((selectedItem as ProviderProduct).product_category).system !== 'single' &&
                              !selectedSize)
                          }
                          size="sm"
                          onClick={() => {
                            const product = selectedItem as ProviderProduct;
                            if (
                              getPricingConfig(product.product_category).system !== 'single' &&
                              !selectedSize
                            ) {
                              toast.error('⚠️ Selecciona un tamaño antes de comprar');
                              return;
                            }
                            const qty = productQuantity[selectedItem.id] || 1;
                            handleAddToCart(product, qty, {
                              isSubscription: purchaseMode === 'subscription',
                              subscriptionInterval,
                            });
                            setShowDetailsModal(false);
                          }}
                        >
                          {selectedItem.stock_quantity === 0
                            ? 'Sin Stock'
                            : getPricingConfig((selectedItem as ProviderProduct).product_category).system !== 'single' &&
                                !selectedSize
                              ? 'Selecciona un tamaño'
                              : purchaseMode === 'subscription'
                                ? 'Suscribirme'
                                : 'Comprar Ahora'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Service Booking Modal */}
      <ServiceBookingModal
        isOpen={showServiceBookingModal}
        onClose={() => {
          setShowServiceBookingModal(false);
          setSelectedService(null);
        }}
        service={selectedService}
        onBookingSuccess={() => {
          // Refresh marketplace data or show success message
          toast.success("✅ Reserva Confirmada: Tu reserva ha sido creada exitosamente");
        }}
      />
    </DashboardShell>
  );
};

export default Marketplace;