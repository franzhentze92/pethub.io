import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Package,
  Calendar,
  Pause,
  Play,
  XCircle,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnSolid } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import PageLoader from './PageLoader';
import { ActionConfirmDialog } from '@/components/ui/ActionConfirmDialog';
import {
  cancelSubscription,
  fetchClientSubscriptions,
  pauseSubscription,
  resumeSubscription,
  type ProductSubscriptionWithDeliveries,
} from '@/lib/productSubscriptions';
import {
  formatSubscriptionDate,
  getSubscriptionIntervalLabel,
} from '@/config/productSubscriptions';

const statusConfig: Record<ProductSubscriptionWithDeliveries['status'], { label: string; className: string }> = {
  active: { label: 'Activa', className: 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30' },
  paused: { label: 'Pausada', className: 'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  payment_failed: { label: 'Pago fallido', className: 'bg-red-50 text-red-700 border-red-200' },
};

function formatPrice(amount: number, currency = 'GTQ') {
  const prefix = currency === 'GTQ' ? 'Q.' : '$';
  return `${prefix}${amount.toFixed(2)}`;
}

const ClientSubscriptions: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<ProductSubscriptionWithDeliveries[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'pause' | 'resume' | 'cancel';
    subscription: ProductSubscriptionWithDeliveries;
  } | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchClientSubscriptions(user.id);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: 'Error al cargar suscripciones',
        description: error instanceof Error ? error.message : 'Intenta de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, subscription } = confirmAction;
    setActionLoading(subscription.id);
    try {
      if (type === 'pause') await pauseSubscription(subscription.id);
      if (type === 'resume') await resumeSubscription(subscription.id);
      if (type === 'cancel') await cancelSubscription(subscription.id);

      toast({
        title: type === 'cancel' ? 'Suscripción cancelada' : type === 'pause' ? 'Suscripción pausada' : 'Suscripción reactivada',
        description:
          type === 'cancel'
            ? 'No se realizarán más entregas ni cobros.'
            : type === 'pause'
              ? 'Puedes reactivarla cuando quieras.'
              : 'Las entregas continuarán según la frecuencia seleccionada.',
      });
      setConfirmAction(null);
      await loadSubscriptions();
    } catch (error) {
      toast({
        title: 'No se pudo completar la acción',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell variant="plain">
        <PageLoader message="Cargando suscripciones..." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell variant="plain">
      <div className="px-4 pt-2 pb-8 max-w-3xl mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate('/marketplace/products')}
          className="flex items-center gap-2 text-landing-aqua-dark font-medium mb-4 min-h-[44px] md:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al marketplace
        </button>

        <div className="space-y-1 mt-1 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mis Suscripciones</h1>
          <p className="text-sm text-gray-500">Administra tus entregas recurrentes y frecuencia de cobro</p>
        </div>

        {subscriptions.length === 0 ? (
          <MobileSectionCard variant="plain" className="p-10 text-center mt-6">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-landing-aqua/15 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-landing-aqua-dark/60" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sin suscripciones activas</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Compra un producto con opción de suscripción en el marketplace para recibir entregas automáticas.
            </p>
            <Button onClick={() => navigate('/marketplace/products')} className={cn(landingBtnSolid, 'border-0')}>
              <Package className="w-4 h-4 mr-2" />
              Explorar productos
            </Button>
          </MobileSectionCard>
        ) : (
          <div className="space-y-3 mt-4">
            {subscriptions.map((sub) => {
              const status = statusConfig[sub.status];
              const lineTotal = sub.unit_price * sub.quantity;
              return (
                <MobileSectionCard key={sub.id} variant="plain" className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 leading-snug">{sub.product_name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {getSubscriptionIntervalLabel(sub.interval_type)} · Cantidad: {sub.quantity}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 text-[10px]', status.className)}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="rounded-lg bg-landing-aqua/5 border border-landing-aqua/15 p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Cobro por entrega
                      </p>
                      <p className="font-bold text-landing-aqua-dark mt-1">{formatPrice(lineTotal, sub.currency)}</p>
                    </div>
                    <div className="rounded-lg bg-landing-mint/5 border border-landing-mint/15 p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Próxima entrega
                      </p>
                      <p className="font-bold text-gray-900 mt-1">
                        {sub.status === 'active'
                          ? formatSubscriptionDate(sub.next_delivery_date)
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-4 space-y-1">
                    <p>Entregas realizadas: {sub.deliveries_count}</p>
                    {sub.last_delivery_date && (
                      <p>Última entrega: {formatSubscriptionDate(sub.last_delivery_date)}</p>
                    )}
                    <p>
                      {sub.fulfillment_method === 'delivery' ? 'Entrega a domicilio' : 'Retiro en tienda'}
                      {sub.delivery_city ? ` · ${sub.delivery_city}` : ''}
                    </p>
                  </div>

                  {sub.subscription_deliveries.length > 0 && (
                    <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Historial de entregas</p>
                      <ul className="space-y-2">
                        {sub.subscription_deliveries.slice(0, 3).map((delivery) => (
                          <li key={delivery.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {formatSubscriptionDate(delivery.delivery_date)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                {formatPrice(Number(delivery.amount_charged), delivery.currency)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  delivery.payment_status === 'completed'
                                    ? 'border-landing-mint/30 text-landing-mint-dark'
                                    : delivery.payment_status === 'pending'
                                      ? 'border-landing-mango/30 text-landing-mango-dark'
                                      : 'border-red-200 text-red-600',
                                )}
                              >
                                {delivery.payment_status === 'completed'
                                  ? 'Pagado'
                                  : delivery.payment_status === 'pending'
                                    ? 'Pendiente'
                                    : 'Fallido'}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sub.status !== 'cancelled' && (
                    <div className="flex flex-wrap gap-2">
                      {sub.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === sub.id}
                          onClick={() => setConfirmAction({ type: 'pause', subscription: sub })}
                          className="border-landing-mango/30 text-landing-mango-dark hover:bg-landing-mango/10"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </Button>
                      )}
                      {sub.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === sub.id}
                          onClick={() => setConfirmAction({ type: 'resume', subscription: sub })}
                          className="border-landing-mint/30 text-landing-mint-dark hover:bg-landing-mint/10"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Reactivar
                        </Button>
                      )}
                      {(sub.status === 'active' || sub.status === 'paused' || sub.status === 'payment_failed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === sub.id}
                          onClick={() => setConfirmAction({ type: 'cancel', subscription: sub })}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  )}
                </MobileSectionCard>
              );
            })}
          </div>
        )}
      </div>

      <ActionConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.type === 'cancel'
            ? 'Cancelar suscripción'
            : confirmAction?.type === 'pause'
              ? 'Pausar suscripción'
              : 'Reactivar suscripción'
        }
        description={
          confirmAction?.type === 'cancel'
            ? 'No se programarán más entregas ni cobros para este producto.'
            : confirmAction?.type === 'pause'
              ? 'Las entregas y cobros se detendrán hasta que la reactives.'
              : 'Se reanudarán las entregas según la frecuencia configurada.'
        }
        confirmLabel={
          confirmAction?.type === 'cancel'
            ? 'Sí, cancelar'
            : confirmAction?.type === 'pause'
              ? 'Pausar'
              : 'Reactivar'
        }
        fields={
          confirmAction
            ? [
                { label: 'Producto', value: confirmAction.subscription.product_name },
                {
                  label: 'Frecuencia',
                  value: getSubscriptionIntervalLabel(confirmAction.subscription.interval_type),
                },
                {
                  label: 'Cobro por entrega',
                  value: formatPrice(
                    confirmAction.subscription.unit_price * confirmAction.subscription.quantity,
                    confirmAction.subscription.currency,
                  ),
                },
              ]
            : []
        }
        onConfirm={() => void handleConfirmAction()}
      />
    </DashboardShell>
  );
};

export default ClientSubscriptions;
