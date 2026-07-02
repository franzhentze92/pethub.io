import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { CreditCard, Package, MapPin, Phone, Mail, CheckCircle, Loader2, Heart, Divide, Star, Truck, Store, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  categoryBadgeBaseClass,
  formatCategoryLabel,
  getCategoryBadgeClass,
} from '@/lib/categoryBadges';
import { landingBadge, landingBtnPrimary } from '@/lib/landingTheme';
import { sendOrderConfirmationEmail } from '@/utils/sendOrderConfirmationEmail';
import { createSubscriptionsFromOrder } from '@/lib/productSubscriptions';
import { normalizePgTime } from '@/utils/appointmentDisplay';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import {
  type FulfillmentMethod,
  buildDeliveryScheduleMessage,
  getCartFulfillmentCapabilities,
  itemFulfillmentFlags,
} from '@/lib/orderFulfillment';
import { ActionConfirmDialog } from '@/components/ui/ActionConfirmDialog';
import {
  SUBSCRIPTION_INTERVALS,
  getSubscriptionIntervalLabel,
  isProductSubscriptionEligible,
  stripSubscriptionSuffix,
  type SubscriptionInterval,
} from '@/config/productSubscriptions';

const checkoutCardClass =
  'rounded-xl border border-landing-aqua/20 bg-gradient-to-br from-landing-aqua/5 to-landing-mint/5 shadow-sm';
const checkoutInputClass =
  'border-landing-aqua/25 focus-visible:ring-landing-aqua/40 focus-visible:border-landing-aqua/50';
const checkoutSelectNativeClass =
  'w-full p-2.5 border border-landing-aqua/25 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-landing-aqua/40 focus:border-landing-aqua/50';
const defaultItemBadgeClass =
  'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30 hover:bg-landing-mango/15';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ isOpen, onClose, onSuccess }) => {
  const { state, clearCart, calculateDeliveryFee, updateItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items, total, delivery_fee, grand_total } = state;
  
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(0);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [deliveryDistanceExceeded, setDeliveryDistanceExceeded] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [providerAddresses, setProviderAddresses] = useState<Map<string, { address: string; city: string; lat?: number; lon?: number }>>(new Map());
  const [clientCoordinates, setClientCoordinates] = useState<{ lat?: number; lon?: number }>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [deliveryScheduleMessage, setDeliveryScheduleMessage] = useState<string>('');
  const [pets, setPets] = useState<any[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  // Store selected pets for each cart item: { itemId: [petId1, petId2, ...] }
  const [selectedPets, setSelectedPets] = useState<{ [itemId: string]: string[] }>({});
  // For food products, store whether to divide price
  const [dividePriceForFood, setDividePriceForFood] = useState<{ [itemId: string]: boolean }>({});
  const [addresses, setAddresses] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('delivery');
  const [productEligibility, setProductEligibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const productIds = [
      ...new Set(
        items
          .filter((item) => item.type === 'product')
          .map((item) => item.product_id || item.id.split('_')[0])
          .filter(Boolean),
      ),
    ];
    if (productIds.length === 0) {
      setProductEligibility({});
      return;
    }
    void supabase
      .from('provider_products')
      .select('id, product_category, subscription_enabled')
      .in('id', productIds)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        (data || []).forEach((p) => {
          map[p.id] = isProductSubscriptionEligible(p);
        });
        setProductEligibility(map);
      });
  }, [isOpen, items]);

  const isItemSubscriptionEligible = (item: (typeof items)[number]) => {
    if (item.type !== 'product') return false;
    if (isProductSubscriptionEligible({ product_category: item.product_category })) return true;
    const productId = item.product_id || item.id.split('_')[0];
    return productId ? !!productEligibility[productId] : false;
  };

  const hasSubscriptionItems = items.some((item) => item.is_subscription);

  const setItemSubscriptionMode = (
    itemId: string,
    item: (typeof items)[number],
    isSubscription: boolean,
    interval: SubscriptionInterval = 'monthly',
  ) => {
    const baseName = stripSubscriptionSuffix(item.name);
    updateItem(itemId, {
      is_subscription: isSubscription,
      subscription_interval: isSubscription ? interval : undefined,
      name: isSubscription ? `${baseName} (Suscripción)` : baseName,
    });
  };

  const [formData, setFormData] = useState({
    fullName: user?.email?.split('@')[0] || '',
    phone: '',
    address: '',
    city: '',
    deliveryInstructions: '',
    paymentMethod: 'card',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined
  });

  // Fetch provider addresses for delivery cost calculation
  const fetchProviderAddresses = async () => {
    try {
      console.log('🚀 [fetchProviderAddresses] Function called', {
        itemsCount: items.length,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          has_delivery: item.has_delivery,
          provider_id: item.provider_id,
          provider_name: item.provider_name
        }))
      });

      // Get unique provider IDs from cart items (delivery + pickup locations)
      const providerIds = [...new Set(items.filter(item => item.provider_id).map(item => item.provider_id))];
      
      console.log('🔍 [fetchProviderAddresses] Filtered provider IDs:', {
        providerIds,
        totalItems: items.length,
        itemsWithDelivery: items.filter(item => item.has_delivery).length,
        allItemsHasDelivery: items.map(item => ({ name: item.name, has_delivery: item.has_delivery, provider_id: item.provider_id }))
      });
      
      if (providerIds.length === 0) {
        console.log('ℹ️ No providers with delivery found in cart');
        setProviderAddresses(new Map());
        return;
      }

      // Fetch provider addresses from database
      // Note: city is in guatemala_cities table, not directly in providers
      const { data: providersData, error } = await supabase
        .from('providers')
        .select(`
          user_id,
          address,
          latitude,
          longitude,
          guatemala_cities (
            city_name
          )
        `)
        .in('user_id', providerIds);

      if (error) {
        console.error('❌ Error fetching provider addresses:', error);
        return;
      }

      console.log('📦 Provider addresses fetched:', providersData);

      // Create a map of provider_id -> address info
      const addressesMap = new Map<string, { address: string; city: string; lat?: number; lon?: number }>();
      (providersData || []).forEach((provider: any) => {
        // Handle guatemala_cities - it can be an object or array
        let cityName = '';
        if (provider.guatemala_cities) {
          if (Array.isArray(provider.guatemala_cities)) {
            cityName = provider.guatemala_cities[0]?.city_name || '';
          } else {
            cityName = (provider.guatemala_cities as any).city_name || '';
          }
        }
        addressesMap.set(provider.user_id, {
          address: provider.address || '',
          city: cityName,
          lat: provider.latitude || undefined,
          lon: provider.longitude || undefined,
        });
        console.log(`✅ Loaded address for provider ${provider.user_id}:`, {
          address: provider.address,
          city: cityName,
          hasCoords: !!(provider.latitude && provider.longitude)
        });
      });

      if (addressesMap.size === 0) {
        console.warn('⚠️ No provider addresses found in database');
      }

      setProviderAddresses(addressesMap);
    } catch (error) {
      console.error('❌ Error fetching provider addresses:', error);
    }
  };

  const fulfillmentCapabilities = getCartFulfillmentCapabilities(items);
  const isDeliveryFulfillment = fulfillmentMethod === 'delivery';
  const isPickupFulfillment = fulfillmentMethod === 'pickup';

  useEffect(() => {
    if (!isOpen) return;
    setFulfillmentMethod(fulfillmentCapabilities.defaultMethod);
  }, [isOpen, fulfillmentCapabilities.defaultMethod]);

  const pickupLocations = [...new Set(items.map((item) => item.provider_id))]
    .map((providerId) => {
      const cartItem = items.find((item) => item.provider_id === providerId);
      const location = providerAddresses.get(providerId);
      return {
        providerId,
        providerName: cartItem?.provider_name || 'Tienda',
        address: location?.address || '',
        city: location?.city || '',
      };
    })
    .filter((location) => location.address || location.city);

  const activeDeliveryFee = isDeliveryFulfillment
    ? (calculatedDeliveryFee > 0 ? calculatedDeliveryFee : delivery_fee)
    : 0;
  const checkoutGrandTotal = total + activeDeliveryFee;

  // Calculate delivery fee when address changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!isDeliveryFulfillment) {
        setCalculatedDeliveryFee(0);
        setDeliveryDistanceExceeded(false);
        setDeliveryDistance(null);
        return;
      }

      console.log('🔄 Calculating delivery fee...', {
        hasAddress: !!formData.address,
        hasCity: !!formData.city,
        providerAddressesCount: providerAddresses.size,
        itemsWithDelivery: items.filter(item => item.has_delivery).length
      });

      if (!formData.address || !formData.city) {
        console.log('❌ Missing address or city');
        setCalculatedDeliveryFee(0);
        return;
      }

      if (providerAddresses.size === 0) {
        console.log('❌ No provider addresses found');
        // Check if there are items with delivery
        const itemsWithDelivery = items.filter(item => item.has_delivery && item.provider_id);
        if (itemsWithDelivery.length > 0) {
          console.warn('⚠️ Items have delivery but no provider addresses loaded');
        }
        setCalculatedDeliveryFee(0);
        return;
      }

      setIsCalculatingDelivery(true);
      try {
        console.log('📍 Calling calculateDeliveryFee with:', {
          clientAddress: formData.address,
          clientCity: formData.city,
          providers: Array.from(providerAddresses.keys())
        });
        
        // Use coordinates from formData if available, otherwise use clientCoordinates
        const coordinates = (formData.latitude && formData.longitude) 
          ? { lat: formData.latitude, lon: formData.longitude }
          : (clientCoordinates.lat && clientCoordinates.lon 
            ? { lat: clientCoordinates.lat, lon: clientCoordinates.lon } 
            : undefined);
        
        const fee = await calculateDeliveryFee(
          { address: formData.address, city: formData.city },
          providerAddresses,
          coordinates
        );
        
        console.log('✅ Delivery fee calculated:', fee);
        setCalculatedDeliveryFee(fee);
        setDeliveryDistanceExceeded(false);
        setDeliveryDistance(null);
        
        if (fee === 0) {
          console.warn('⚠️ Calculated fee is 0 - check geocoding or distance calculation');
        }
      } catch (error) {
        console.error('❌ Error calculating delivery fee:', error);
        setCalculatedDeliveryFee(0);
        
        // Check if error is about distance limit
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('excede el límite de entrega')) {
          // Extract distance from error message if available
          const distanceMatch = errorMessage.match(/(\d+\.?\d*)\s*km/);
          const distance = distanceMatch ? parseFloat(distanceMatch[1]) : null;
          setDeliveryDistance(distance);
          setDeliveryDistanceExceeded(true);
          
          toast({
            title: "🚫 Distancia excede el límite de entrega",
            description: errorMessage,
            variant: "destructive",
            duration: 8000,
          });
        } else {
          setDeliveryDistanceExceeded(false);
          setDeliveryDistance(null);
          toast({
            title: "Error al calcular costo de entrega",
            description: "No se pudo calcular el costo de entrega. Por favor, verifica las direcciones.",
            variant: "destructive",
          });
        }
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    // Debounce the calculation
    const timeoutId = setTimeout(calculateFee, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.address, formData.city, formData.latitude, formData.longitude, providerAddresses, calculateDeliveryFee, items, clientCoordinates, isDeliveryFulfillment]);

  // Fetch user's pets, addresses, and cards when checkout opens
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !isOpen) return;
      
      try {
        setLoadingPets(true);
        setLoadingAddresses(true);
        
        // Fetch pets
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name, species, breed, image_url')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (petsError) throw petsError;
        const petsList = petsData || [];
        setPets(petsList);
        
        // Auto-select first pet for all items if only one pet exists
        if (petsList.length === 1) {
          const singlePetId = petsList[0].id;
          const autoSelected: { [itemId: string]: string[] } = {};
          items.forEach(item => {
            autoSelected[item.id] = [singlePetId];
          });
          setSelectedPets(autoSelected);
        }

        // Fetch addresses
        const { data: addressesData, error: addressesError } = await supabase
          .from('client_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (addressesError) throw addressesError;
        const addressesList = addressesData || [];
        setAddresses(addressesList);
        
        // Auto-select default address if exists
        const defaultAddress = addressesList.find((addr: any) => addr.is_default);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setUseSavedAddress(true);
          setFormData(prev => ({
            ...prev,
            fullName: defaultAddress.full_name,
            phone: defaultAddress.phone,
            address: defaultAddress.address,
            city: defaultAddress.city,
            deliveryInstructions: defaultAddress.delivery_instructions || '',
            latitude: defaultAddress.latitude ?? undefined,
            longitude: defaultAddress.longitude ?? undefined
          }));
          // Update client coordinates for delivery fee calculation
          if (defaultAddress.latitude && defaultAddress.longitude) {
            setClientCoordinates({
              lat: defaultAddress.latitude,
              lon: defaultAddress.longitude
            });
            console.log('✅ Using saved coordinates from default address:', {
              lat: defaultAddress.latitude,
              lon: defaultAddress.longitude
            });
          }
        }

        // Fetch payment cards
        const { data: cardsData, error: cardsError } = await supabase
          .from('payment_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (cardsError) throw cardsError;
        const cardsList = cardsData || [];
        setCards(cardsList);
        
        // Auto-select default card if exists
        const defaultCard = cardsList.find((card: any) => card.is_default);
        if (defaultCard) {
          setSelectedCardId(defaultCard.id);
          setUseSavedCard(true);
          setFormData(prev => ({
            ...prev,
            paymentMethod: 'card'
          }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setPets([]);
        setAddresses([]);
        setCards([]);
      } finally {
        setLoadingPets(false);
        setLoadingAddresses(false);
      }
    };

    if (isOpen) {
      fetchData();
      console.log('🚀 [Checkout] Dialog opened, fetching provider addresses...', {
        itemsCount: items.length,
        itemsWithDelivery: items.filter(item => item.has_delivery).length
      });
      fetchProviderAddresses();
    }
  }, [user, isOpen, items.length]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Clear coordinates if address or city is manually changed
      if (field === 'address' || field === 'city') {
        updated.latitude = undefined;
        updated.longitude = undefined;
        setClientCoordinates({}); // Clear client coordinates to force geocoding
      }
      return updated;
    });
  };

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find(addr => addr.id === addressId);
    if (address) {
      console.log('📍 Address selected:', {
        id: address.id,
        address: address.address,
        city: address.city,
        hasCoordinates: !!(address.latitude && address.longitude),
        latitude: address.latitude,
        longitude: address.longitude
      });
      
      setFormData(prev => ({
        ...prev,
        fullName: address.full_name,
        phone: address.phone,
        address: address.address,
        city: address.city,
        deliveryInstructions: address.delivery_instructions || '',
        latitude: address.latitude ?? undefined,
        longitude: address.longitude ?? undefined
      }));
      
      // Update client coordinates for delivery fee calculation
      if (address.latitude && address.longitude) {
        setClientCoordinates({
          lat: address.latitude,
          lon: address.longitude
        });
        console.log('✅ Using saved coordinates from selected address:', {
          lat: address.latitude,
          lon: address.longitude
        });
      } else {
        // Clear coordinates if address doesn't have them
        setClientCoordinates({});
        console.log('⚠️ Selected address does not have saved coordinates - will geocode');
      }
      
      // Ensure useSavedAddress is checked when selecting from dropdown
      setUseSavedAddress(true);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    setFormData(prev => ({
      ...prev,
      paymentMethod: 'card'
    }));
  };

  const togglePetSelection = (itemId: string, petId: string) => {
    setSelectedPets((prev) => {
      const currentPets = prev[itemId] || [];
      const isSelected = currentPets.includes(petId);

      if (isSelected) {
        return {
          ...prev,
          [itemId]: currentPets.filter((id) => id !== petId),
        };
      }

      return {
        ...prev,
        [itemId]: [...currentPets, petId],
      };
    });
  };

  const hasDeliveryItems = items.some((item) => item.has_delivery);
  const hasMapCoordinates =
    Boolean(formData.latitude && formData.longitude) ||
    Boolean(clientCoordinates.lat && clientCoordinates.lon);
  const allItemsHaveLinkedPets =
    pets.length === 0 ||
    items.every((item) => (selectedPets[item.id] || []).length > 0);
  const needsMapLocation = isDeliveryFulfillment && hasDeliveryItems && !hasMapCoordinates;

  const toggleDividePrice = (itemId: string) => {
    setDividePriceForFood(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const isFoodProduct = (item: any) => {
    // Check if item is a product and has category 'alimentos'
    return item.type === 'product' && item.product_category === 'alimentos';
  };

  const getItemPrice = (item: any) => {
    const selectedPetsForItem = selectedPets[item.id] || [];
    const shouldDivide = dividePriceForFood[item.id] && isFoodProduct(item) && selectedPetsForItem.length > 0;
    
    if (shouldDivide) {
      return item.price / selectedPetsForItem.length;
    }
    return item.price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if delivery distance is exceeded
    if (isDeliveryFulfillment && deliveryDistanceExceeded) {
      toast({
        title: "🚫 Entrega no disponible",
        description: `La distancia de ${deliveryDistance?.toFixed(2) || 'más de 30'} km excede el límite de entrega de 30 km. Por favor, selecciona una dirección más cercana.`,
        variant: "destructive",
        duration: 6000,
      });
      return;
    }
    
    if (!formData.fullName || !formData.phone) {
      toast({
        title: "⚠️ Información Requerida",
        description: "Por favor completa tu nombre y teléfono.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (isDeliveryFulfillment && (!formData.address || !formData.city)) {
      toast({
        title: "⚠️ Dirección Requerida",
        description: "Por favor completa tu dirección de entrega.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Check if address has coordinates (required for delivery calculation)
    const hasCoordinates = (formData.latitude && formData.longitude) || 
                          (clientCoordinates.lat && clientCoordinates.lon);
    
    if (isDeliveryFulfillment && items.some(item => item.has_delivery) && !hasCoordinates) {
      toast({
        title: "Ubicación en el mapa requerida",
        description: "Para calcular el costo de entrega, marca la ubicación exacta de tu dirección en Ajustes → Direcciones y Tarjetas.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    const missingPetLink = items.some((item) => (selectedPets[item.id] || []).length === 0);
    if (pets.length > 0 && missingPetLink) {
      toast({
        title: "Vincula tus mascotas",
        description: "Selecciona al menos una mascota para cada producto o servicio del carrito.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const hasSubscriptionItems = items.some((item) => item.is_subscription);
    if (hasSubscriptionItems && (!useSavedCard || !selectedCardId)) {
      toast({
        title: "Tarjeta requerida para suscripciones",
        description: "Selecciona una tarjeta guardada para los cobros recurrentes de tus suscripciones.",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    setShowOrderConfirm(true);
  };

  const processOrder = async () => {
    setShowOrderConfirm(false);
    setIsProcessing(true);

    try {
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Determine payment status based on payment method
      const paymentStatus = formData.paymentMethod === 'cash' ? 'completed' : 'completed'; // For now, all payments are completed
      
      // Generate order number ONCE and reuse it
      const generatedOrderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      setOrderNumber(generatedOrderNumber); // Store it in state for display in success dialog
      
      const finalDeliveryFee = activeDeliveryFee;
      const finalGrandTotal = checkoutGrandTotal;
      const pickupAddressText = pickupLocations
        .map((location) => [location.address, location.city].filter(Boolean).join(', '))
        .filter(Boolean)
        .join(' | ');

      // Debug: Log the data being sent
      console.log('Creating order with data:', {
        order_number: generatedOrderNumber,
        client_id: user?.id,
        total_amount: total,
        delivery_fee: finalDeliveryFee,
        grand_total: finalGrandTotal,
        currency: items[0]?.currency || 'GTQ',
        payment_method: formData.paymentMethod,
        payment_status: paymentStatus,
        status: 'confirmed', // Set to confirmed since payment is completed
        delivery_name: formData.fullName,
        delivery_phone: formData.phone,
        delivery_address: formData.address,
        delivery_city: formData.city,
        delivery_instructions: formData.deliveryInstructions
      });

      // Create order in database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: generatedOrderNumber, // Use the same order number generated above
          client_id: user?.id,
          total_amount: total,
          delivery_fee: finalDeliveryFee,
          grand_total: finalGrandTotal,
          currency: items[0]?.currency || 'GTQ',
          payment_method: formData.paymentMethod,
          payment_status: paymentStatus,
          status: 'confirmed', // Set to confirmed since payment is completed
          delivery_name: formData.fullName,
          delivery_phone: formData.phone,
          delivery_address: isDeliveryFulfillment ? formData.address : (pickupAddressText || 'Retiro en tienda'),
          delivery_city: isDeliveryFulfillment ? formData.city : (pickupLocations[0]?.city || ''),
          delivery_instructions: isDeliveryFulfillment
            ? formData.deliveryInstructions
            : (formData.deliveryInstructions || 'Retiro en tienda'),
          client_email: user?.email || null,
          fulfillment_method: fulfillmentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Generate invoice number
      const generateInvoiceNumber = () => {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `INV-${year}-${Date.now().toString().slice(-6)}-${random}`;
      };

      const invoiceNumber = generateInvoiceNumber();

      // Get client information from user profile or form data
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name, phone, address')
        .eq('user_id', user?.id)
        .maybeSingle(); // Use maybeSingle() to handle case when profile doesn't exist

      // Create invoice
      try {
        const invoiceInsertData = {
          order_id: orderData.id,
          invoice_number: invoiceNumber,
          client_id: user?.id,
          client_name: formData.fullName || userProfile?.full_name || user?.email?.split('@')[0] || 'Cliente',
          client_email: user?.email || null,
          client_phone: formData.phone || userProfile?.phone || null,
          client_address: formData.address || userProfile?.address || null,
          client_city: formData.city || null,
          subtotal: total,
          delivery_fee: finalDeliveryFee,
          tax_amount: 0, // Can be calculated if needed
          discount_amount: 0, // Can be calculated if needed
          total_amount: finalGrandTotal,
          currency: items[0]?.currency || 'GTQ',
          payment_method: formData.paymentMethod,
          payment_status: paymentStatus,
          status: paymentStatus === 'completed' ? 'paid' : 'issued',
          paid_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
          notes: formData.deliveryInstructions || null
        };

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoiceInsertData)
          .select()
          .single();

        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
          console.error('Invoice data that failed:', invoiceInsertData);
          
          // Check if it's a "table doesn't exist" error
          if (invoiceError.code === '42P01' || invoiceError.message.includes('does not exist')) {
            console.warn('⚠️ Invoices table does not exist. Please run the supabase_invoices_table.sql script in Supabase SQL Editor.');
          }
          // Don't throw error - order was created successfully, invoice is optional
        } else {
          console.log('✅ Invoice created successfully:', invoiceData);
        }
      } catch (invoiceErr: any) {
        console.error('Unexpected error creating invoice:', invoiceErr);
        // Don't throw - order was created successfully
      }

      // Get provider user_ids for all items (needed for order_items foreign key)
      // The provider_id in cart items should be user_id, but we verify/convert if needed
      const uniqueProviderIds = [...new Set(items.map(item => item.provider_id))];
      const providerUserMap = new Map<string, string>();
      
      for (const providerId of uniqueProviderIds) {
        // First, check if providerId is already a user_id by checking if it exists in providers.user_id
        const { data: providerByUserId } = await supabase
          .from('providers')
          .select('user_id, id')
          .eq('user_id', providerId)
          .maybeSingle();
        
        if (providerByUserId?.user_id) {
          // providerId is already a user_id
          providerUserMap.set(providerId, providerId);
        } else {
          // Try to get user_id from providers table (in case providerId is providers.id)
          const { data: providerData } = await supabase
            .from('providers')
            .select('user_id, id')
            .eq('id', providerId)
            .maybeSingle();
          
          if (providerData?.user_id) {
            providerUserMap.set(providerId, providerData.user_id);
          } else {
            // Fallback: assume provider_id is already user_id (shouldn't happen, but safe fallback)
            console.warn(`Could not find user_id for provider_id: ${providerId}, using as-is`);
            providerUserMap.set(providerId, providerId);
          }
        }
      }

      // Create order items - provider_id must be user_id (foreign key to users table)
      const orderItems = items.map(item => {
        const providerUserId = providerUserMap.get(item.provider_id) || item.provider_id;
        const fulfillmentFlags = itemFulfillmentFlags(
          fulfillmentMethod,
          !!item.has_delivery,
          !!item.has_pickup,
        );

        return {
          order_id: orderData.id,
          provider_id: providerUserId, // Must be user_id for foreign key constraint
          item_type: item.type,
          // Use product_id (original UUID) for products, or service_id for services
          // item.id might have size suffix (e.g., "uuid_small") which is not a valid UUID
          item_id: item.type === 'service' 
            ? item.service_data?.service_id 
            : (item.product_id || item.id), // Use product_id if available (original UUID), fallback to item.id
          item_name: item.name,
          item_description: item.description,
          item_image_url: item.image_url,
          unit_price: item.price,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          currency: item.currency,
          provider_name: item.provider_name,
          provider_phone: null, // Optional field
          provider_address: null, // Optional field
          has_delivery: fulfillmentFlags.has_delivery,
          has_pickup: fulfillmentFlags.has_pickup,
          delivery_fee: item.delivery_fee || 0
        };
      });

      console.log('Creating order items with provider user_ids:', orderItems.map(item => ({
        item_name: item.item_name,
        provider_id: item.provider_id
      })));

      const { data: insertedOrderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select('id');

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        console.error('Order items data:', orderItems);
        throw itemsError;
      }

      // Create pet associations for each order item
      if (insertedOrderItems && insertedOrderItems.length > 0) {
        const petAssociations: any[] = [];
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const orderItem = insertedOrderItems[i];
          const selectedPetsForItem = selectedPets[item.id] || [];
          const shouldDivide = dividePriceForFood[item.id] && isFoodProduct(item) && selectedPetsForItem.length > 0;
          const pricePerPet = shouldDivide ? item.price / selectedPetsForItem.length : null;
          
          // Create association for each selected pet
          for (const petId of selectedPetsForItem) {
            petAssociations.push({
              order_item_id: orderItem.id,
              pet_id: petId,
              price_per_pet: pricePerPet, // Store divided price if applicable
              quantity: shouldDivide ? 1 : item.quantity // If divided, each pet gets quantity 1
            });
          }
        }
        
        if (petAssociations.length > 0) {
          // Try to insert into order_item_pets table
          // If table doesn't exist, we'll catch the error and continue
          const { error: petsError } = await supabase
            .from('order_item_pets')
            .insert(petAssociations);
          
          if (petsError) {
            console.warn('Error creating pet associations (table might not exist):', petsError);
            console.log('Pet associations data:', petAssociations);
            // Don't throw - order was created successfully, just log the warning
            // The table might need to be created in Supabase
          } else {
            console.log('Successfully created pet associations:', petAssociations.length);
          }
        }
      }

      const subscriptionItems = items.filter((item) => item.is_subscription && item.type === 'product');
      if (subscriptionItems.length > 0) {
        try {
          const created = await createSubscriptionsFromOrder(subscriptionItems, {
            clientId: user.id,
            orderId: orderData.id,
            paymentCardId: useSavedCard ? selectedCardId : null,
            fulfillmentMethod: fulfillmentMethod,
            deliveryName: formData.fullName,
            deliveryPhone: formData.phone,
            deliveryAddress: isDeliveryFulfillment ? formData.address : (pickupAddressText || 'Retiro en tienda'),
            deliveryCity: isDeliveryFulfillment ? formData.city : (pickupLocations[0]?.city || ''),
            deliveryInstructions: formData.deliveryInstructions,
          });
          console.log('Subscriptions created:', created.length);
        } catch (subscriptionError: unknown) {
          console.error('Error creating subscriptions:', subscriptionError);
          const msg =
            subscriptionError instanceof Error
              ? subscriptionError.message
              : 'Error desconocido al registrar suscripción';
          toast({
            title: 'Error al registrar suscripción',
            description: `La orden se creó, pero la suscripción no se guardó: ${msg}`,
            variant: 'destructive',
            duration: 9000,
          });
        }
      }

      // Create service appointments for service items
      const serviceItems = items.filter(item => item.type === 'service');
      console.log('Service items to create appointments for:', serviceItems.length, serviceItems);

      const cartItemToOrderItemId = new Map<string, string>();
      if (insertedOrderItems) {
        items.forEach((cartItem, index) => {
          const orderItemId = insertedOrderItems[index]?.id;
          if (orderItemId) cartItemToOrderItemId.set(cartItem.id, orderItemId);
        });
      }
      
      if (serviceItems.length > 0) {
        // For each service item, we need to use the provider's user_id (not providers.id)
        // The foreign key service_appointments_provider_id_fkey references users.id, not providers.id
        const serviceAppointments = await Promise.all(serviceItems.map(async (item) => {
          console.log('Processing service item for appointment:', {
            service_id: item.service_data?.service_id,
            provider_id: item.provider_id, // This is already the user_id from the cart
            client_id: user?.id,
            appointment_date: item.service_data?.appointment_date
          });

          // The provider_id in the cart is already the user_id (from ServiceBookingModal)
          // The foreign key service_appointments_provider_id_fkey expects user_id, not providers.id
          // So we can use item.provider_id directly
          const providerUserId = item.provider_id;

          // Check if time_slot_id is a valid UUID (not a generated temporary ID)
          // Generated IDs start with "generated-" and are not valid UUIDs
          const timeSlotId = item.service_data?.time_slot_id;
          const isValidTimeSlotId = timeSlotId && 
            !timeSlotId.startsWith('generated-') && 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(timeSlotId);
          
          const appointmentData = {
            service_id: item.service_data?.service_id,
            client_id: user?.id,
            provider_id: providerUserId, // Use user_id directly (foreign key expects users.id)
            order_id: orderData.id,
            order_item_id: cartItemToOrderItemId.get(item.id) || null,
            appointment_date: item.service_data?.appointment_date,
            appointment_time: normalizePgTime(item.service_data?.appointment_time),
            slot_end_time: normalizePgTime(item.service_data?.slot_end_time),
            time_slot_id: isValidTimeSlotId ? timeSlotId : null, // Only use valid UUIDs, otherwise null
            status: 'pending',
            client_name: item.service_data?.client_name,
            client_phone: item.service_data?.client_phone,
            client_email: item.service_data?.client_email,
            notes: item.service_data?.notes,
            total_price: item.price * item.quantity,
            currency: item.currency
          };
          
          console.log('Appointment data to insert:', appointmentData);
          
          return appointmentData;
        }));

        console.log('All service appointments to insert:', serviceAppointments);

        const { data: insertedAppointments, error: appointmentsError } = await supabase
          .from('service_appointments')
          .insert(serviceAppointments)
          .select();

        if (appointmentsError) {
          console.error('Error creating service appointments:', appointmentsError);
          console.error('Appointments data that failed:', serviceAppointments);
          // Show warning toast but don't block the order completion
          toast({
            title: "⚠️ Advertencia",
            description: "La orden se creó exitosamente, pero hubo un problema al crear algunas citas. Por favor, contacta al proveedor.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          console.log('Successfully created service appointments:', insertedAppointments);
        }
      }
      
      // Send confirmation email (non-blocking for UX)
      void sendOrderConfirmationEmail(
        (name, options) => supabase.functions.invoke(name, options),
        orderData.id,
      );

      // Set success state
      setIsSuccess(true);
      dispatchNotificationsUpdated();
      if (isDeliveryFulfillment) {
        setDeliveryScheduleMessage(buildDeliveryScheduleMessage(new Date()));
      }
      
      // Show success toast with order details
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const scheduleNotice = isDeliveryFulfillment ? buildDeliveryScheduleMessage(new Date()) : '';
      const subscriptionNotice =
        subscriptionItems.length > 0
          ? ' Tu suscripción quedó activa — adminístrala en Tienda → Suscripciones.'
          : '';
      toast({
        title: "✅ ¡Compra Realizada Exitosamente!",
        description: isDeliveryFulfillment
          ? `Tu orden ${generatedOrderNumber} ha sido procesada. Total: ${items[0]?.currency === 'GTQ' ? 'Q.' : '$'}${finalGrandTotal.toFixed(2)}. ${scheduleNotice}${subscriptionNotice}`
          : `Tu orden ${generatedOrderNumber} ha sido procesada correctamente. Total: ${items[0]?.currency === 'GTQ' ? 'Q.' : '$'}${finalGrandTotal.toFixed(2)} (${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}).${subscriptionNotice}`,
        variant: "default",
        duration: 9000,
      });

      // Clear cart after successful payment
      setTimeout(() => {
        clearCart();
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error creating order:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        error: error
      });
      toast({
        title: "❌ Error en el Pago",
        description: `Hubo un problema procesando tu pago: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md text-center rounded-2xl border-landing-aqua/20 shadow-xl p-0 gap-0" aria-describedby="order-success-description">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-landing-aqua/10 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
            <DialogTitle className="text-xl text-gray-900">¡Orden Confirmada!</DialogTitle>
          </DialogHeader>
          <div className="py-8 px-6" id="order-success-description">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-landing-aqua to-landing-mint text-white shadow-lg">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Gracias por tu compra!
            </h3>
            <p className="text-gray-600 mb-4">
              Tu orden ha sido procesada exitosamente. Recibirás un email de confirmación.
            </p>
            {fulfillmentMethod === 'delivery' && (
              <div className="mb-4 rounded-xl border border-landing-mint/40 bg-landing-mint/10 p-4 text-left">
                <p className="text-sm font-semibold text-landing-aqua-dark flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 shrink-0" />
                  Entrega a domicilio
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {deliveryScheduleMessage}
                </p>
              </div>
            )}
            <div className={cn(checkoutCardClass, 'p-4 text-left')}>
              <p className="text-sm text-landing-aqua-dark font-mono">
                <strong>Número de Orden:</strong> {orderNumber || 'N/A'}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Puedes copiar este número para buscar tu orden en "Mis Órdenes"
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-landing-aqua/20 shadow-xl p-0 gap-0"
        aria-describedby="checkout-form-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-landing-aqua/10 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white shadow-md">
              <CreditCard className="w-5 h-5" />
            </span>
            Finalizar Compra
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6" id="checkout-form-description">
          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-landing-aqua-dark">Resumen de la Orden</h3>
            
            <div className="space-y-3">
              {items.map((item) => {
                const eligible = isItemSubscriptionEligible(item);
                const displayName = stripSubscriptionSuffix(item.name);
                return (
                <div key={item.id} className="p-3 border border-landing-aqua/15 rounded-xl bg-landing-aqua/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md overflow-hidden border bg-gray-100 flex items-center justify-center shrink-0">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{displayName}</h4>
                      <p className="text-sm text-gray-500">{item.provider_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'product' ? 'Producto' : 'Servicio'}
                        </Badge>
                        {item.is_subscription && (
                          <Badge variant="outline" className="text-xs gap-1 border-landing-aqua/30 bg-landing-aqua/10 text-landing-aqua-dark">
                            <RefreshCw className="w-3 h-3" />
                            {item.subscription_interval
                              ? getSubscriptionIntervalLabel(item.subscription_interval)
                              : 'Suscripción'}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-600">
                          Cantidad: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-gray-900">
                        {item.currency === 'GTQ' ? 'Q.' : '$'}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {eligible && (
                    <div className="pt-2 border-t border-landing-aqua/10 space-y-2">
                      <p className="text-xs text-gray-500">Tipo de entrega</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setItemSubscriptionMode(item.id, item, false)}
                          className={cn(
                            'p-2 rounded-lg border text-sm transition-all',
                            !item.is_subscription
                              ? 'border-landing-aqua bg-landing-aqua/5 font-medium text-landing-aqua-dark'
                              : 'border-gray-200 text-gray-600 hover:border-landing-aqua/30',
                          )}
                        >
                          Compra única
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setItemSubscriptionMode(item.id, item, true, item.subscription_interval ?? 'monthly')
                          }
                          className={cn(
                            'p-2 rounded-lg border text-sm transition-all',
                            item.is_subscription
                              ? 'border-landing-aqua bg-landing-aqua/5 font-medium text-landing-aqua-dark'
                              : 'border-gray-200 text-gray-600 hover:border-landing-aqua/30',
                          )}
                        >
                          Suscripción
                        </button>
                      </div>
                      {item.is_subscription && (
                        <Select
                          value={item.subscription_interval ?? 'monthly'}
                          onValueChange={(v) =>
                            setItemSubscriptionMode(item.id, item, true, v as SubscriptionInterval)
                          }
                        >
                          <SelectTrigger className={cn(checkoutInputClass, 'h-9 text-sm')}>
                            <SelectValue placeholder="Frecuencia de entrega" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBSCRIPTION_INTERVALS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            {hasSubscriptionItems && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Las suscripciones requieren una tarjeta guardada para los cobros automáticos en cada entrega.
              </p>
            )}

            {/* Order Totals */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {items[0]?.currency === 'GTQ' ? 'Q.' : '$'}{total.toFixed(2)}
                </span>
              </div>
              {isDeliveryFulfillment && items.some(item => item.has_delivery) && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Costo de entrega:</span>
                    <span className="font-medium">
                      {isCalculatingDelivery ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs text-gray-500">Calculando...</span>
                        </span>
                      ) : deliveryDistanceExceeded ? (
                        <span className="text-xs text-red-600 font-semibold">No disponible</span>
                      ) : calculatedDeliveryFee > 0 ? (
                        `Q.${calculatedDeliveryFee.toFixed(2)}`
                      ) : formData.address && formData.city ? (
                        <span className="text-xs text-amber-600">No disponible</span>
                      ) : (
                        <span className="text-xs text-gray-500">Ingresa tu dirección</span>
                      )}
                    </span>
                  </div>
                  {deliveryDistanceExceeded && deliveryDistance && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded">
                      <div className="font-semibold mb-1">🚫 Entrega no disponible</div>
                      <div>
                        La distancia de <strong>{deliveryDistance.toFixed(2)} km</strong> excede el límite de entrega de <strong>30 km</strong>.
                      </div>
                      <div className="mt-2 text-xs">
                        Por favor, selecciona una dirección más cercana o contacta al proveedor para opciones de envío especiales.
                      </div>
                    </div>
                  )}
                  {(() => {
                    const hasCoordinates = (formData.latitude && formData.longitude) || 
                                          (clientCoordinates.lat && clientCoordinates.lon);
                    const hasAddress = formData.address && formData.city;
                    
                    if (!hasAddress && !deliveryDistanceExceeded) {
                      return (
                        <div className="text-xs text-landing-aqua-dark bg-landing-aqua/10 border border-landing-aqua/20 p-2 rounded-lg">
                          {useSavedAddress ? (
                            <>⚠️ Por favor selecciona una dirección guardada del menú desplegable</>
                          ) : (
                            <>💡 Ingresa tu dirección de entrega para calcular el costo de envío basado en distancia</>
                          )}
                        </div>
                      );
                    }
                    
                    if (hasAddress && !hasCoordinates && !deliveryDistanceExceeded) {
                      return (
                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded">
                          <div className="font-semibold mb-1">📍 Ubicación en el mapa requerida</div>
                          <div>
                            Para calcular el costo de entrega, necesitas marcar la ubicación exacta de tu dirección en el mapa.
                          </div>
                          <div className="mt-2 text-xs">
                            Por favor, ve a <strong>Ajustes → Direcciones y Tarjetas</strong>, edita tu dirección y selecciona la ubicación en el mapa usando el botón "Usar mi ubicación actual" o haciendo clic en el mapa.
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </>
              )}
              <div className="flex justify-between text-lg font-semibold border-t border-landing-aqua/15 pt-3 text-landing-aqua-dark">
                <span>Total:</span>
                <span>
                  {items[0]?.currency === 'GTQ' ? 'Q.' : '$'}
                  {isCalculatingDelivery 
                    ? '...' 
                    : checkoutGrandTotal.toFixed(2)
                  }
                </span>
              </div>
              {isDeliveryFulfillment && (
                <div className="rounded-xl border border-landing-mint/35 bg-landing-mint/10 p-3 text-xs text-gray-700 leading-relaxed">
                  <p className="font-semibold text-landing-aqua-dark flex items-center gap-1.5 mb-1">
                    <Truck className="w-3.5 h-3.5" />
                    Fecha estimada de entrega
                  </p>
                  <p>{buildDeliveryScheduleMessage(new Date())}</p>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Form */}
          <div className="space-y-4">
            {/* Pet Selection Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-landing-aqua-dark">
                <Heart className="w-5 h-5 text-landing-mango" />
                Vincular a Mascotas
              </h3>
              
              {loadingPets ? (
                <div className="text-center py-4 text-gray-500">
                  Cargando mascotas...
                </div>
              ) : pets.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No tienes mascotas registradas. Por favor registra al menos una mascota antes de realizar una compra.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const selectedPetsForItem = selectedPets[item.id] || [];
                    const isFood = isFoodProduct(item);
                    const shouldDivide = dividePriceForFood[item.id] && isFood && selectedPetsForItem.length > 0;
                    const itemPrice = shouldDivide ? item.price / selectedPetsForItem.length : item.price;
                    
                    return (
                      <Card key={item.id} className={cn(checkoutCardClass, 'border-2')}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-md object-cover" />
                            ) : (
                              <Package className="w-12 h-12 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-500">{item.provider_name}</p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  categoryBadgeBaseClass,
                                  'mt-1',
                                  item.type === 'product' && item.product_category
                                    ? getCategoryBadgeClass(item.product_category, 'product')
                                    : item.type === 'service'
                                      ? 'bg-landing-aqua/15 text-landing-aqua-dark border-landing-aqua/30'
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                )}
                              >
                                {item.type === 'product' && item.product_category
                                  ? formatCategoryLabel(item.product_category)
                                  : item.type === 'product'
                                    ? 'Producto'
                                    : 'Servicio'}
                              </Badge>
                            </div>
                          </div>
                          
                          <Label className="text-sm font-medium mb-2 block">
                            Selecciona mascota(s) para este {item.type === 'product' ? 'producto' : 'servicio'} *
                          </Label>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {pets.map((pet) => {
                              const isSelected = selectedPetsForItem.includes(pet.id);
                              return (
                                <label
                                  key={pet.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    togglePetSelection(item.id, pet.id);
                                  }}
                                  className={cn(
                                    'flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all select-none',
                                    isSelected
                                      ? 'border-landing-aqua bg-landing-aqua/10 ring-2 ring-landing-aqua/25 shadow-sm'
                                      : 'border-landing-aqua/15 hover:border-landing-aqua/35 bg-white hover:bg-landing-aqua/5'
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    tabIndex={-1}
                                    className="border-landing-aqua/50 data-[state=checked]:bg-landing-aqua data-[state=checked]:border-landing-aqua pointer-events-none"
                                  />
                                  {pet.image_url ? (
                                    <img src={pet.image_url} alt={pet.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-landing-aqua to-landing-mint flex items-center justify-center text-white text-xs font-bold shrink-0">
                                      {pet.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-gray-800 truncate">{pet.name}</span>
                                </label>
                              );
                            })}
                          </div>
                          
                          {/* Divide price option for food products */}
                          {isFood && selectedPetsForItem.length > 1 && (
                            <div className="flex items-center gap-2 p-2 rounded-lg border border-landing-aqua/20 bg-landing-aqua/5">
                              <Checkbox
                                checked={dividePriceForFood[item.id] || false}
                                onCheckedChange={() => toggleDividePrice(item.id)}
                              />
                              <Label className="text-sm cursor-pointer flex items-center gap-2 text-gray-700">
                                <Divide className="w-4 h-4 text-landing-aqua-dark" />
                                Dividir precio entre {selectedPetsForItem.length} mascotas
                                <span className="text-xs text-gray-600">
                                  ({item.currency === 'GTQ' ? 'Q.' : '$'}{itemPrice.toFixed(2)} por mascota)
                                </span>
                              </Label>
                            </div>
                          )}
                          
                          {selectedPetsForItem.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              {selectedPetsForItem.length} {selectedPetsForItem.length === 1 ? 'mascota seleccionada' : 'mascotas seleccionadas'}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {(fulfillmentCapabilities.showChoice || fulfillmentCapabilities.canPickup) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-landing-aqua-dark">¿Cómo quieres recibir tu pedido?</h3>

                {fulfillmentCapabilities.showChoice ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod('delivery')}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                        isDeliveryFulfillment
                          ? 'border-landing-aqua bg-landing-aqua/10 ring-2 ring-landing-aqua/20 shadow-sm'
                          : 'border-landing-aqua/15 bg-white hover:border-landing-aqua/35 hover:bg-landing-aqua/5'
                      )}
                    >
                      <span className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        isDeliveryFulfillment
                          ? 'bg-gradient-to-br from-landing-aqua to-landing-mint text-white'
                          : 'bg-landing-aqua/10 text-landing-aqua-dark'
                      )}>
                        <Truck className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-gray-900">Entrega a domicilio</span>
                        <span className="block text-xs text-gray-500 mt-1">
                          Te lo llevamos a tu dirección. Se calcula el costo de envío.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod('pickup')}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                        isPickupFulfillment
                          ? 'border-landing-aqua bg-landing-aqua/10 ring-2 ring-landing-aqua/20 shadow-sm'
                          : 'border-landing-aqua/15 bg-white hover:border-landing-aqua/35 hover:bg-landing-aqua/5'
                      )}
                    >
                      <span className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        isPickupFulfillment
                          ? 'bg-gradient-to-br from-landing-aqua to-landing-mint text-white'
                          : 'bg-landing-aqua/10 text-landing-aqua-dark'
                      )}>
                        <Store className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-gray-900">Retiro en tienda</span>
                        <span className="block text-xs text-gray-500 mt-1">
                          Recoge tu pedido en la tienda del proveedor. Sin costo de envío.
                        </span>
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className={cn(checkoutCardClass, 'p-4 flex items-center gap-3')}>
                    <Store className="w-5 h-5 text-landing-aqua-dark shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Retiro en tienda</p>
                      <p className="text-sm text-gray-500">Este pedido solo está disponible para retiro.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h3 className="text-lg font-semibold text-landing-aqua-dark">
              {isPickupFulfillment ? 'Información de contacto' : 'Información de Entrega'}
            </h3>

            {isPickupFulfillment && pickupLocations.length > 0 && (
              <Card className={checkoutCardClass}>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-landing-aqua-dark" />
                    Punto de retiro
                  </p>
                  {pickupLocations.map((location) => (
                    <div key={location.providerId} className="text-sm text-gray-600 border-t border-landing-aqua/10 pt-3 first:border-t-0 first:pt-0">
                      <p className="font-semibold text-gray-800">{location.providerName}</p>
                      {location.address && <p>{location.address}</p>}
                      {location.city && <p>{location.city}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Saved Addresses Section */}
            {isDeliveryFulfillment && addresses.length > 0 && (
              <div className={cn(checkoutCardClass, 'p-4')}>
                <Label className="text-sm font-medium mb-2 block text-gray-800">Usar dirección guardada</Label>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="use-saved-address"
                    checked={useSavedAddress}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setUseSavedAddress(isChecked);
                      if (!isChecked) {
                        setSelectedAddressId(null);
                        setFormData(prev => ({
                          ...prev,
                          fullName: user?.email?.split('@')[0] || '',
                          phone: '',
                          address: '',
                          city: '',
                          deliveryInstructions: '',
                          latitude: undefined,
                          longitude: undefined
                        }));
                        setClientCoordinates({});
                      } else if (selectedAddressId) {
                        handleAddressSelect(selectedAddressId);
                      } else if (addresses.length > 0) {
                        handleAddressSelect(addresses[0].id);
                      }
                    }}
                  />
                  <Label htmlFor="use-saved-address" className="cursor-pointer text-sm text-gray-700">
                    Seleccionar de mis direcciones guardadas
                  </Label>
                </div>
                {useSavedAddress && (
                  <Select value={selectedAddressId || ''} onValueChange={handleAddressSelect}>
                    <SelectTrigger className={checkoutInputClass}>
                      <SelectValue placeholder="Selecciona una dirección" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((address: any) => (
                        <SelectItem key={address.id} value={address.id}>
                          <div className="flex items-center space-x-2">
                            <span>{address.label}</span>
                            {address.is_default && (
                              <Badge variant="outline" className={cn(landingBadge, defaultItemBadgeClass, 'ml-2 text-[10px]')}>
                                <Star size={10} className="mr-1" />
                                Predeterminada
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Nombre Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Tu nombre completo"
                    required
                    disabled={isDeliveryFulfillment && useSavedAddress && selectedAddressId !== null}
                    className={checkoutInputClass}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+502 1234-5678"
                    required
                    disabled={isDeliveryFulfillment && useSavedAddress && selectedAddressId !== null}
                    className={checkoutInputClass}
                  />
                </div>
              </div>

              {isDeliveryFulfillment && (!useSavedAddress || addresses.length === 0) && (
                <>
                  <div>
                    <Label htmlFor="address">Dirección *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Dirección completa"
                      required
                      disabled={useSavedAddress && selectedAddressId !== null}
                      className={checkoutInputClass}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Ciudad"
                      required
                      disabled={useSavedAddress && selectedAddressId !== null}
                      className={checkoutInputClass}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryInstructions">Instrucciones de Entrega</Label>
                    <Textarea
                      id="deliveryInstructions"
                      value={formData.deliveryInstructions}
                      onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                      placeholder="Instrucciones especiales para la entrega..."
                      rows={3}
                      disabled={useSavedAddress && selectedAddressId !== null}
                      className={cn(checkoutInputClass, 'resize-none')}
                    />
                  </div>
                </>
              )}

              {isPickupFulfillment && (
                <div>
                  <Label htmlFor="pickupNotes">Notas para el retiro (opcional)</Label>
                  <Textarea
                    id="pickupNotes"
                    value={formData.deliveryInstructions}
                    onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                    placeholder="Ej. Horario preferido para recoger..."
                    rows={3}
                    className={cn(checkoutInputClass, 'resize-none')}
                  />
                </div>
              )}

              {isDeliveryFulfillment && useSavedAddress && selectedAddressId && (
                <Card className={checkoutCardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                      <MapPin className="w-5 h-5 text-landing-aqua-dark" />
                      <span className="font-semibold text-gray-800">
                        {addresses.find((a: any) => a.id === selectedAddressId)?.label}
                      </span>
                      {addresses.find((a: any) => a.id === selectedAddressId)?.is_default && (
                        <Badge variant="outline" className={cn(landingBadge, defaultItemBadgeClass, 'text-[10px]')}>
                          <Star size={10} className="mr-1" />
                          Predeterminada
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium text-gray-800">{formData.fullName}</p>
                      <p>{formData.phone}</p>
                      <p>{formData.address}</p>
                      <p>{formData.city}</p>
                      {formData.deliveryInstructions && (
                        <p className="text-xs text-gray-500 italic mt-2">
                          {formData.deliveryInstructions}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Saved Payment Cards Section */}
              {cards.length > 0 && formData.paymentMethod === 'card' && (
                <div className={cn(checkoutCardClass, 'p-4')}>
                  <Label className="text-sm font-medium mb-2 block text-gray-800">Usar tarjeta guardada</Label>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="use-saved-card"
                      checked={useSavedCard}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setUseSavedCard(isChecked);
                        if (!isChecked) {
                          setSelectedCardId(null);
                        } else if (selectedCardId) {
                          handleCardSelect(selectedCardId);
                        }
                      }}
                    />
                    <Label htmlFor="use-saved-card" className="cursor-pointer text-sm text-gray-700">
                      Seleccionar de mis tarjetas guardadas
                    </Label>
                  </div>
                  {useSavedCard && (
                    <Select value={selectedCardId || ''} onValueChange={handleCardSelect}>
                      <SelectTrigger className={checkoutInputClass}>
                        <SelectValue placeholder="Selecciona una tarjeta" />
                      </SelectTrigger>
                      <SelectContent>
                        {cards.map((card: any) => (
                          <SelectItem key={card.id} value={card.id}>
                            <div className="flex items-center space-x-2">
                              <span>{card.label} - **** {card.card_number_last_four}</span>
                              {card.is_default && (
                                <Badge variant="outline" className={cn(landingBadge, defaultItemBadgeClass, 'ml-2 text-[10px]')}>
                                  <Star size={10} className="mr-1" />
                                  Predeterminada
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className={cn(checkoutCardClass, 'p-4 space-y-3')}>
                <Label htmlFor="paymentMethod" className="text-gray-800">Método de Pago</Label>
                <select
                  id="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={(e) => {
                    handleInputChange('paymentMethod', e.target.value);
                    if (e.target.value !== 'card') {
                      setUseSavedCard(false);
                      setSelectedCardId(null);
                    }
                  }}
                  className={checkoutSelectNativeClass}
                >
                  <option value="card">Tarjeta de Crédito/Débito</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia Bancaria</option>
                </select>

              {/* Payment Method Info */}
              {formData.paymentMethod === 'card' && (
                <>
                  {useSavedCard && selectedCardId && (
                    <Card className="border border-landing-aqua/20 bg-white/80 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                          <CreditCard className="w-5 h-5 text-landing-aqua-dark" />
                          <span className="font-semibold text-gray-800">
                            {cards.find((c: any) => c.id === selectedCardId)?.label}
                          </span>
                          {cards.find((c: any) => c.id === selectedCardId)?.is_default && (
                            <Badge variant="outline" className={cn(landingBadge, defaultItemBadgeClass, 'text-[10px]')}>
                              <Star size={10} className="mr-1" />
                              Predeterminada
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-mono text-lg font-semibold text-landing-aqua-dark">
                            **** **** **** {cards.find((c: any) => c.id === selectedCardId)?.card_number_last_four}
                          </p>
                          <p>{cards.find((c: any) => c.id === selectedCardId)?.card_holder_name}</p>
                          <p>
                            {cards.find((c: any) => c.id === selectedCardId)?.expiry_month.toString().padStart(2, '0')}/
                            {cards.find((c: any) => c.id === selectedCardId)?.expiry_year}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {!useSavedCard && (
                    <div className="rounded-xl border border-landing-aqua/15 bg-landing-aqua/5 p-4">
                      <h4 className="font-medium text-landing-aqua-dark mb-2">Información de Pago</h4>
                      <p className="text-sm text-gray-600">
                        Para esta demostración, el pago se procesará automáticamente.
                        <br />
                        En producción, se integrará con pasarelas de pago seguras.
                      </p>
                    </div>
                  )}
                </>
              )}
              </div>

              {needsMapLocation && (
                <div className="rounded-xl border border-landing-mango/30 bg-landing-mango/10 p-3.5 flex gap-3 items-start">
                  <MapPin className="w-5 h-5 shrink-0 text-landing-mango-dark mt-0.5" />
                  <div className="text-sm text-gray-700 leading-snug min-w-0">
                    <p className="font-medium text-gray-900 mb-1">Ubicación en el mapa requerida</p>
                    <p>
                      Edita tu dirección en <strong>Ajustes → Direcciones y Tarjetas</strong> y marca el punto exacto en el mapa para calcular la entrega.
                    </p>
                  </div>
                </div>
              )}

              {!allItemsHaveLinkedPets && pets.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  Selecciona al menos una mascota para cada artículo del carrito.
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  className={cn(
                    landingBtnPrimary,
                    'w-full border-0 min-h-[48px] text-sm sm:text-base py-3'
                  )}
                  disabled={
                    isProcessing ||
                    (isDeliveryFulfillment && deliveryDistanceExceeded) ||
                    needsMapLocation ||
                    !allItemsHaveLinkedPets ||
                    (hasSubscriptionItems && (!useSavedCard || !selectedCardId))
                  }
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                      Procesando Pago...
                    </>
                  ) : isDeliveryFulfillment && deliveryDistanceExceeded ? (
                    <>Entrega no disponible (+30 km)</>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">
                        Confirmar Pago — {items[0]?.currency === 'GTQ' ? 'Q.' : '$'}
                        {checkoutGrandTotal.toFixed(2)}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ActionConfirmDialog
      open={showOrderConfirm}
      onOpenChange={setShowOrderConfirm}
      title="Confirmar compra"
      description="Revisa tu orden antes de procesar el pago."
      confirmLabel="Confirmar pago"
      fields={[
        {
          label: 'Artículos',
          value: `${items.reduce((sum, item) => sum + item.quantity, 0)} en el carrito`,
        },
        {
          label: 'Método',
          value: isDeliveryFulfillment ? 'Entrega a domicilio' : 'Retiro en tienda',
        },
        ...(isDeliveryFulfillment
          ? [
              { label: 'Dirección', value: `${formData.address}, ${formData.city}` },
            ]
          : []),
        { label: 'Nombre', value: formData.fullName },
        { label: 'Teléfono', value: formData.phone },
        {
          label: 'Subtotal',
          value: `${items[0]?.currency === 'GTQ' ? 'Q.' : '$'}${total.toFixed(2)}`,
        },
        ...(isDeliveryFulfillment && activeDeliveryFee > 0
          ? [
              {
                label: 'Entrega',
                value: `${items[0]?.currency === 'GTQ' ? 'Q.' : '$'}${activeDeliveryFee.toFixed(2)}`,
              },
            ]
          : []),
        {
          label: 'Total',
          value: `${items[0]?.currency === 'GTQ' ? 'Q.' : '$'}${checkoutGrandTotal.toFixed(2)}`,
        },
      ]}
      onConfirm={processOrder}
      loading={isProcessing}
      showEdit
      onEdit={() => setShowOrderConfirm(false)}
    />
    </>
  );
};

export default Checkout;
