import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Star, Store, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';

interface OrderReviewItem {
  id: string;
  item_type: 'product' | 'service';
  item_id: string;
  item_name: string;
  provider_id: string;
  provider_name: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderItems: OrderReviewItem[];
  onReviewSubmitted: () => void;
}

interface ReviewData {
  rating: number;
  comment: string;
}

async function resolveProviderTableId(providerRef: string): Promise<string | null> {
  const { data: byId } = await supabase
    .from('providers')
    .select('id')
    .eq('id', providerRef)
    .maybeSingle();

  if (byId?.id) return byId.id;

  const { data: byUser } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', providerRef)
    .maybeSingle();

  return byUser?.id ?? null;
}

function itemReviewKey(item: OrderReviewItem) {
  return `item_${item.item_type}_${item.item_id}`;
}

function providerReviewKey(providerRef: string) {
  return `provider_${providerRef}`;
}

function ReviewStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          className={cn(
            'p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-aqua/50',
            star <= rating
              ? 'text-landing-tropical scale-105'
              : 'text-gray-300 hover:text-landing-mango hover:scale-105',
          )}
        >
          <Star
            className={cn('w-6 h-6', star <= rating ? 'fill-current' : 'fill-transparent')}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-2 text-sm font-medium text-landing-aqua-dark">{rating}/5</span>
      )}
    </div>
  );
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderItems,
  onReviewSubmitted,
}) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Map<string, ReviewData>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const catalogItems = useMemo(() => {
    const map = new Map<string, OrderReviewItem>();
    orderItems.forEach((item) => {
      const key = `${item.item_type}_${item.item_id}`;
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  }, [orderItems]);

  const providers = useMemo(() => {
    const providerMap = new Map<string, { id: string; name: string }>();
    orderItems.forEach((item) => {
      if (!item.provider_id) return;
      if (!providerMap.has(item.provider_id)) {
        providerMap.set(item.provider_id, {
          id: item.provider_id,
          name: item.provider_name || 'Proveedor',
        });
      }
    });
    return Array.from(providerMap.values());
  }, [orderItems]);

  const totalReviewables = catalogItems.length + providers.length;

  useEffect(() => {
    if (!isOpen) {
      setReviews(new Map());
      return;
    }

    let cancelled = false;

    const loadExistingReviews = async () => {
      if (totalReviewables === 0) return;

      setLoadingExisting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const next = new Map<string, ReviewData>();

        const productIds = catalogItems
          .filter((item) => item.item_type === 'product')
          .map((item) => item.item_id);
        const serviceIds = catalogItems
          .filter((item) => item.item_type === 'service')
          .map((item) => item.item_id);

        if (productIds.length > 0 || serviceIds.length > 0) {
          const filters: string[] = [];
          if (productIds.length > 0) filters.push(`product_id.in.(${productIds.join(',')})`);
          if (serviceIds.length > 0) filters.push(`service_id.in.(${serviceIds.join(',')})`);

          const { data: itemReviews } = await supabase
            .from('catalog_item_reviews')
            .select('item_type, product_id, service_id, rating, comment')
            .eq('client_id', user.id)
            .or(filters.join(','));

          (itemReviews || []).forEach((review) => {
            const itemId = review.product_id || review.service_id;
            if (!itemId) return;
            next.set(`item_${review.item_type}_${itemId}`, {
              rating: review.rating,
              comment: review.comment || '',
            });
          });
        }

        const providerTableIds: string[] = [];
        const refToTableId = new Map<string, string>();

        for (const provider of providers) {
          const tableId = await resolveProviderTableId(provider.id);
          if (tableId) {
            providerTableIds.push(tableId);
            refToTableId.set(provider.id, tableId);
          }
        }

        if (providerTableIds.length > 0 && !cancelled) {
          const { data: existingReviews } = await supabase
            .from('provider_reviews')
            .select('provider_id, rating, comment')
            .eq('client_id', user.id)
            .in('provider_id', providerTableIds);

          const tableIdToRef = new Map<string, string>();
          refToTableId.forEach((tableId, ref) => tableIdToRef.set(tableId, ref));

          (existingReviews || []).forEach((review) => {
            const ref = tableIdToRef.get(review.provider_id);
            if (!ref) return;
            next.set(providerReviewKey(ref), {
              rating: review.rating,
              comment: review.comment || '',
            });
          });
        }

        if (!cancelled) setReviews(next);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    };

    loadExistingReviews();

    return () => {
      cancelled = true;
    };
  }, [isOpen, catalogItems, providers, totalReviewables]);

  const updateReview = (key: string, patch: Partial<ReviewData>) => {
    setReviews((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) || { rating: 0, comment: '' };
      next.set(key, { ...existing, ...patch });
      return next;
    });
  };

  const getReview = (key: string) => reviews.get(key) || { rating: 0, comment: '' };

  const ratedCount =
    catalogItems.filter((item) => getReview(itemReviewKey(item)).rating > 0).length +
    providers.filter((provider) => getReview(providerReviewKey(provider.id)).rating > 0).length;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      const itemsToSave = catalogItems
        .map((item) => ({ item, review: getReview(itemReviewKey(item)) }))
        .filter(({ review }) => review.rating > 0);

      const providersToSave = providers
        .map((provider) => ({ provider, review: getReview(providerReviewKey(provider.id)) }))
        .filter(({ review }) => review.rating > 0);

      if (itemsToSave.length === 0 && providersToSave.length === 0) {
        toast({
          title: 'Selecciona una calificación',
          description: 'Elige al menos una estrella antes de enviar tu reseña.',
          variant: 'destructive',
        });
        return;
      }

      let savedCount = 0;

      for (const { item, review } of itemsToSave) {
        const payload = {
          client_id: user.id,
          order_id: orderId,
          item_type: item.item_type,
          product_id: item.item_type === 'product' ? item.item_id : null,
          service_id: item.item_type === 'service' ? item.item_id : null,
          rating: review.rating,
          comment: review.comment.trim() || null,
          updated_at: new Date().toISOString(),
        };

        let existingQuery = supabase
          .from('catalog_item_reviews')
          .select('id')
          .eq('client_id', user.id);

        existingQuery =
          item.item_type === 'product'
            ? existingQuery.eq('product_id', item.item_id)
            : existingQuery.eq('service_id', item.item_id);

        const { data: existing } = await existingQuery.maybeSingle();

        const { error: saveError } = existing?.id
          ? await supabase.from('catalog_item_reviews').update(payload).eq('id', existing.id)
          : await supabase.from('catalog_item_reviews').insert(payload);

        if (saveError) {
          console.error('Error guardando reseña de ítem:', saveError);
          throw saveError;
        }

        savedCount += 1;
      }

      for (const { provider, review } of providersToSave) {
        const providerTableId = await resolveProviderTableId(provider.id);
        if (!providerTableId) {
          console.error('Proveedor no encontrado:', provider.id);
          continue;
        }

        const payload = {
          provider_id: providerTableId,
          client_id: user.id,
          rating: review.rating,
          comment: review.comment.trim() || null,
        };

        const { data: existing } = await supabase
          .from('provider_reviews')
          .select('id')
          .eq('provider_id', providerTableId)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: saveError } = existing?.id
          ? await supabase.from('provider_reviews').update(payload).eq('id', existing.id)
          : await supabase.from('provider_reviews').insert(payload);

        if (saveError) {
          console.error('Error guardando reseña de proveedor:', saveError);
          throw saveError;
        }

        savedCount += 1;
      }

      if (savedCount === 0) {
        throw new Error('No se pudieron guardar las reseñas.');
      }

      toast({
        title: 'Reseñas guardadas',
        description: `Se guardaron ${savedCount} reseña${savedCount > 1 ? 's' : ''} para la orden ${orderId.slice(0, 8)}… ¡Gracias por tu feedback!`,
      });

      onReviewSubmitted();
      onClose();
      setReviews(new Map());
    } catch (error: unknown) {
      console.error('Error submitting reviews:', error);
      const message = error instanceof Error ? error.message : 'No se pudieron enviar las reseñas.';
      toast({
        title: 'Error al guardar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-landing-aqua/20">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 bg-gradient-to-r from-landing-aqua/10 via-landing-mint/10 to-landing-mango/10 border-b border-landing-aqua/15">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint flex items-center justify-center shadow-sm">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            Calificar tu experiencia
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Califica los productos o servicios y también al proveedor. Son reseñas separadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loadingExisting ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-landing-aqua" />
              Cargando reseñas anteriores…
            </div>
          ) : (
            <>
              {catalogItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">Productos y servicios</h3>
                  {catalogItems.map((item) => {
                    const key = itemReviewKey(item);
                    const review = getReview(key);
                    const itemLabel = item.item_type === 'product' ? 'Producto' : 'Servicio';
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-landing-mango/20 bg-white p-4 shadow-sm space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-landing-mango/20 to-landing-tropical/20 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-landing-mango" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{item.item_name}</h4>
                            <p className="text-xs text-gray-500">Reseña del {itemLabel.toLowerCase()}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Calificación</label>
                          <ReviewStars
                            rating={review.rating}
                            onChange={(rating) => updateReview(key, { rating })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Comentario (opcional)</label>
                          <Textarea
                            placeholder={`¿Qué te pareció este ${itemLabel.toLowerCase()}?`}
                            value={review.comment}
                            onChange={(e) => updateReview(key, { comment: e.target.value })}
                            className="min-h-[80px] resize-none border-landing-mango/20 focus-visible:ring-landing-mango/30"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {providers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">Proveedores</h3>
                  {providers.map((provider) => {
                    const key = providerReviewKey(provider.id);
                    const review = getReview(key);
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-landing-aqua/15 bg-white p-4 shadow-sm space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-landing-aqua/20 to-landing-mint/20 flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5 text-landing-aqua-dark" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{provider.name}</h4>
                            <p className="text-xs text-gray-500">Reseña del proveedor</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Calificación</label>
                          <ReviewStars
                            rating={review.rating}
                            onChange={(rating) => updateReview(key, { rating })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Comentario (opcional)</label>
                          <Textarea
                            placeholder="Comparte tu experiencia con este proveedor…"
                            value={review.comment}
                            onChange={(e) => updateReview(key, { comment: e.target.value })}
                            className="min-h-[80px] resize-none border-landing-aqua/20 focus-visible:ring-landing-aqua/30"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalReviewables === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay ítems para calificar en esta orden</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-landing-aqua/15 bg-gray-50/80 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-600">
              <span>Progreso</span>
              <span>
                {ratedCount} de {totalReviewables} calificado{totalReviewables === 1 ? '' : 's'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint transition-all duration-300"
                style={{
                  width: totalReviewables ? `${(ratedCount / totalReviewables) * 100}%` : '0%',
                }}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="border-landing-aqua/25 text-gray-700"
              >
                Saltar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || totalReviewables === 0}
                className={cn('min-w-[140px]', landingBtnPrimary)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  'Enviar reseñas'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
