import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import {
  ArrowLeft,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  RefreshCw,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import Checkout from '@/components/Checkout';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getSubscriptionIntervalLabel } from '@/config/productSubscriptions';

function formatPrice(amount: number, currency = 'GTQ') {
  const prefix = currency === 'GTQ' ? 'Q.' : '$';
  return `${prefix}${amount.toFixed(2)}`;
}

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const { items, total, delivery_fee, grand_total } = state;
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const currency = items[0]?.currency ?? 'GTQ';

  if (items.length === 0) {
    return (
      <DashboardShell>
        <div className="px-4 pt-2 pb-8 max-w-3xl mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-landing-aqua-dark font-medium mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>

          <MobileSectionCard className="p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-landing-aqua/15 to-landing-mint/15 flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-landing-aqua-dark/60" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h1>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Agrega productos o servicios del marketplace para comenzar tu compra.
            </p>
            <Button onClick={() => navigate('/marketplace/products')} className={cn(landingBtnPrimary, 'border-0')}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Explorar productos
            </Button>
          </MobileSectionCard>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="px-4 pt-2 pb-36 max-w-3xl mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-landing-aqua-dark font-medium mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
          Seguir comprando
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white shadow-md">
              <ShoppingCart className="w-5 h-5" />
            </span>
            Carrito
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-12">
            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const lineTotal = item.price * item.quantity;
            return (
              <MobileSectionCard key={item.id} className="p-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-landing-aqua/15 bg-gray-50 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-gray-900 leading-snug break-words">{item.name}</h2>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{item.provider_name}</p>
                      </div>
                      <p className="font-bold text-gray-900 shrink-0 text-right">
                        {formatPrice(lineTotal, item.currency)}
                      </p>
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      {formatPrice(item.price, item.currency)} c/u
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px] border-landing-aqua/25 bg-landing-aqua/5 text-landing-aqua-dark">
                        {item.type === 'product' ? 'Producto' : 'Servicio'}
                      </Badge>
                      {item.has_delivery && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-landing-mint/25 bg-landing-mint/5 text-landing-mint-dark">
                          <Truck className="w-3 h-3" />
                          Entrega
                        </Badge>
                      )}
                      {item.is_subscription && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-landing-aqua/25 bg-landing-aqua/5 text-landing-aqua-dark">
                          <RefreshCw className="w-3 h-3" />
                          {item.subscription_interval
                            ? getSubscriptionIntervalLabel(item.subscription_interval)
                            : 'Suscripción'}
                        </Badge>
                      )}
                      {item.has_pickup && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-landing-mango/25 bg-landing-mango/5 text-landing-mango-dark">
                          <Store className="w-3 h-3" />
                          Recogida
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center rounded-xl border border-landing-aqua/20 overflow-hidden bg-white">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-9 w-9 p-0 rounded-none hover:bg-landing-aqua/10"
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-9 w-9 p-0 rounded-none hover:bg-landing-aqua/10"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-3"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              </MobileSectionCard>
            );
          })}
        </div>
      </div>

      {/* Sticky summary */}
      <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-3 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="rounded-2xl border border-landing-aqua/20 bg-white/95 backdrop-blur-md shadow-xl p-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900 tabular-nums">{formatPrice(total, currency)}</span>
            </div>
            {delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Costo de entrega</span>
                <span className="font-medium text-gray-900 tabular-nums">{formatPrice(delivery_fee, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-100 pt-3">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(grand_total, currency)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={clearCart}
                className="min-h-[48px] border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10"
              >
                Vaciar
              </Button>
              <Button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className={cn(landingBtnPrimary, 'min-h-[48px] border-0')}
              >
                Pagar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Checkout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => {
          setCheckoutOpen(false);
          toast.success('¡Compra completada! Recibirás una confirmación por correo.');
          navigate('/client-orders');
        }}
      />
    </DashboardShell>
  );
};

export default CartPage;
