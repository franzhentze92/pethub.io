import React, { createContext, useContext, useReducer, useEffect, useLayoutEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { geocodeAddress, calculateDistance, calculateDeliveryCost } from '@/utils/deliveryCost';
import type { SubscriptionInterval } from '@/config/productSubscriptions';

const CART_STORAGE_PREFIX = 'pethub_cart';

function getCartStorageKey(userId?: string | null): string {
  return userId ? `${CART_STORAGE_PREFIX}_${userId}` : `${CART_STORAGE_PREFIX}_guest`;
}

export interface CartItem {
  id: string;
  type: 'product' | 'service';
  name: string;
  price: number;
  currency: string;
  quantity: number;
  provider_id: string;
  provider_name: string;
  image_url?: string;
  description?: string;
  delivery_fee?: number;
  has_delivery?: boolean;
  has_pickup?: boolean;
  // Product-specific fields
  product_size?: 'small' | 'medium' | 'large' | 'extra_large' | 'general';
  product_id?: string; // Original product ID (without size suffix)
  product_category?: string; // Product category (e.g., 'alimentos', 'juguetes', etc.)
  // Subscription fields
  is_subscription?: boolean;
  subscription_interval?: SubscriptionInterval;
  // Service-specific fields
  service_size?: string; // Size selected for service (small, medium, large, extra_large)
  service_id?: string; // Original service ID (without size suffix)
  service_data?: {
    service_id: string;
    appointment_date: string;
    time_slot_id: string;
    appointment_time?: string; // HH:MM format - actual time of the appointment
    slot_end_time?: string; // HH:MM format - end time of the slot
    client_name: string;
    client_phone: string;
    client_email: string;
    notes: string;
  };
}

interface CartState {
  items: CartItem[];
  total: number;
  delivery_fee: number;
  grand_total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<CartItem> } }
  | { type: 'CLEAR_CART' }
  | { type: 'CALCULATE_TOTALS' }
  | { type: 'HYDRATE'; payload: CartState };

const initialState: CartState = {
  items: [],
  total: 0,
  delivery_fee: 0,
  grand_total: 0,
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      // For products with sizes, each size is a separate item (different IDs)
      // For products without sizes or same size, increment quantity
      const existingItem = state.items.find(item =>
        item.id === action.payload.id &&
        item.type === action.payload.type &&
        (action.payload.type === 'service' || item.product_size === action.payload.product_size) &&
        !!item.is_subscription === !!action.payload.is_subscription &&
        item.subscription_interval === action.payload.subscription_interval
      );

      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id &&
          item.type === action.payload.type &&
          (action.payload.type === 'service' || item.product_size === action.payload.product_size) &&
          !!item.is_subscription === !!action.payload.is_subscription &&
          item.subscription_interval === action.payload.subscription_interval
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return { ...state, items: updatedItems };
      } else {
        return { ...state, items: [...state.items, action.payload] };
      }
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload);
      return { ...state, items: updatedItems };
    }
    
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return { ...state, items: updatedItems };
    }

    case 'UPDATE_ITEM': {
      const updatedItems = state.items.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload.updates } : item,
      );
      return { ...state, items: updatedItems };
    }
    
    case 'CLEAR_CART': {
      return initialState;
    }

    case 'HYDRATE': {
      return action.payload;
    }
    
    case 'CALCULATE_TOTALS': {
      const total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const delivery_fee = state.items.reduce((sum, item) => {
        if (item.has_delivery && item.delivery_fee) {
          return sum + item.delivery_fee;
        }
        return sum;
      }, 0);
      const grand_total = total + delivery_fee;
      
      return { ...state, total, delivery_fee, grand_total };
    }
    
    default:
      return state;
  }
};

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as CartItem;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.price === 'number' &&
    typeof candidate.quantity === 'number' &&
    candidate.quantity > 0
  );
}

function loadCartFromStorage(key: string): CartState {
  try {
    if (typeof window === 'undefined') return initialState;
    const raw = localStorage.getItem(key);
    if (!raw) return initialState;

    const parsed = JSON.parse(raw) as { items?: unknown[] };
    if (!Array.isArray(parsed.items)) return initialState;

    const items = parsed.items.filter(isValidCartItem);
    const stateWithItems = { ...initialState, items };
    return cartReducer(stateWithItems, { type: 'CALCULATE_TOTALS' });
  } catch {
    return initialState;
  }
}

function saveCartToStorage(key: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  if (items.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify({ items }));
}

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getItemCount: () => number;
  calculateDeliveryFee: (clientAddress: { address: string; city: string }, providerAddresses: Map<string, { address: string; city: string; lat?: number; lon?: number }>, clientCoordinates?: { lat: number; lon: number }) => Promise<number>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const storageKey = getCartStorageKey(user?.id);
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [cartReady, setCartReady] = useState(false);
  const hydratedKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (authLoading) return;

    const loaded = loadCartFromStorage(storageKey);
    dispatch({ type: 'HYDRATE', payload: loaded });
    hydratedKeyRef.current = storageKey;
    setCartReady(true);
  }, [authLoading, storageKey]);

  useEffect(() => {
    if (authLoading || !cartReady || hydratedKeyRef.current !== storageKey) return;
    saveCartToStorage(storageKey, state.items);
  }, [authLoading, cartReady, storageKey, state.items]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity } });
    dispatch({ type: 'CALCULATE_TOTALS' });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
    dispatch({ type: 'CALCULATE_TOTALS' });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
      dispatch({ type: 'CALCULATE_TOTALS' });
    }
  };

  const updateItem = (id: string, updates: Partial<CartItem>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });
    dispatch({ type: 'CALCULATE_TOTALS' });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemCount = () => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const calculateDeliveryFee = async (
    clientAddress: { address: string; city: string },
    providerAddresses: Map<string, { address: string; city: string; lat?: number; lon?: number }>,
    clientCoordinates?: { lat: number; lon: number }
  ): Promise<number> => {
    console.log('🚚 Starting delivery fee calculation...');
    
    // Get unique provider IDs from cart items that have delivery
    const providersWithDelivery = new Set<string>();
    state.items.forEach(item => {
      if (item.has_delivery && item.provider_id) {
        providersWithDelivery.add(item.provider_id);
      }
    });

    console.log('📦 Providers with delivery:', Array.from(providersWithDelivery));

    if (providersWithDelivery.size === 0) {
      console.log('ℹ️ No items with delivery in cart');
      return 0;
    }

    // Get client coordinates - use saved coordinates if available, otherwise geocode
    let clientCoords = { lat: 0, lon: 0 };
    if (clientCoordinates && clientCoordinates.lat && clientCoordinates.lon) {
      console.log('✅ Using saved client coordinates:', clientCoordinates);
      clientCoords = { lat: clientCoordinates.lat, lon: clientCoordinates.lon };
    } else {
      console.log('📍 Geocoding client address (no saved coordinates):', clientAddress);
      try {
        const clientGeocode = await geocodeAddress(clientAddress.address, clientAddress.city);
        if (!clientGeocode) {
          console.warn('❌ Could not geocode client address');
          return 0;
        }
        clientCoords = clientGeocode;
        console.log('✅ Client coordinates geocoded:', clientCoords);
      } catch (error) {
        console.error('❌ Error geocoding client address:', error);
        return 0;
      }
    }

    // Calculate delivery cost for each provider and sum them
    let totalDeliveryFee = 0;
    
    for (const providerId of providersWithDelivery) {
      const providerInfo = providerAddresses.get(providerId);
      if (!providerInfo) {
        console.warn(`⚠️ Provider address not found for provider_id: ${providerId}`);
        continue;
      }

      console.log(`📍 Processing provider ${providerId}:`, providerInfo);

      let providerCoords = { lat: 0, lon: 0 };
      
      // Use stored coordinates if available, otherwise geocode
      if (providerInfo.lat && providerInfo.lon) {
        providerCoords = { lat: providerInfo.lat, lon: providerInfo.lon };
        console.log(`✅ Using stored coordinates for provider ${providerId}:`, providerCoords);
      } else {
        console.log(`📍 Geocoding provider address for ${providerId}...`);
        try {
          const providerGeocode = await geocodeAddress(providerInfo.address, providerInfo.city);
          if (!providerGeocode) {
            console.warn(`❌ Could not geocode provider address for ${providerId}`);
            continue;
          }
          providerCoords = providerGeocode;
          console.log(`✅ Provider coordinates geocoded:`, providerCoords);
        } catch (error) {
          console.error(`❌ Error geocoding provider address for ${providerId}:`, error);
          continue;
        }
      }

      // Calculate distance and delivery cost
      const distance = calculateDistance(
        providerCoords.lat,
        providerCoords.lon,
        clientCoords.lat,
        clientCoords.lon
      );
      
      console.log(`📏 Distance from provider ${providerId} to client: ${distance.toFixed(2)} km`);
      
      const deliveryCost = calculateDeliveryCost(distance);
      
      // If delivery cost is null, distance exceeds 30 km limit
      if (deliveryCost === null) {
        console.warn(`❌ Distance exceeds 30 km limit: ${distance.toFixed(2)} km`);
        throw new Error(`La distancia de ${distance.toFixed(2)} km excede el límite de entrega de 30 km. Por favor, selecciona una dirección más cercana o contacta al proveedor para opciones de envío especiales.`);
      }
      
      console.log(`💰 Delivery cost for provider ${providerId}: Q${deliveryCost}`);
      
      totalDeliveryFee += deliveryCost;
    }

    console.log(`✅ Total delivery fee: Q${totalDeliveryFee}`);
    return totalDeliveryFee;
  };

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    updateItem,
    clearCart,
    getItemCount,
    calculateDeliveryFee,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
