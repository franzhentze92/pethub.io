import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Star, Calendar, Filter, Package, Store } from 'lucide-react';
import { DashboardStatCard } from './dashboard/DashboardStatCard';
import { MobileSectionCard } from './mobile/MobileUi';
import {
  plainPageAccentTabActive,
  plainPageAccentUi,
  type PlainPageAccent,
} from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

type ReviewSource = 'provider' | 'product' | 'service';

interface UnifiedReview {
  id: string;
  source: ReviewSource;
  itemLabel: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_id: string;
  client_name: string;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const RATING_CHIPS = [
  { id: 'all', label: 'Todas' },
  { id: '5', label: '5★' },
  { id: '4', label: '4★' },
  { id: '3', label: '3★' },
  { id: '2', label: '2★' },
  { id: '1', label: '1★' },
] as const;

const SOURCE_LABELS: Record<ReviewSource, string> = {
  provider: 'Tienda',
  product: 'Producto',
  service: 'Servicio',
};

interface ProviderReviewsProps {
  accent?: PlainPageAccent;
}

const ProviderReviews: React.FC<ProviderReviewsProps> = ({ accent = 'tropical' }) => {
  const ui = plainPageAccentUi(accent);
  const { user } = useAuth();
  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | ReviewSource>('all');

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { data: providerData, error: providerLookupError } = await supabase
          .from('providers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (providerLookupError || !providerData?.id) {
          console.error('ProviderReviews: proveedor no encontrado', providerLookupError);
          setReviews([]);
          return;
        }

        const providerId = providerData.id;

        const [
          providerReviewsResult,
          productsResult,
          servicesResult,
        ] = await Promise.all([
          supabase
            .from('provider_reviews')
            .select('id, provider_id, client_id, rating, comment, created_at')
            .eq('provider_id', providerId)
            .order('created_at', { ascending: false }),
          supabase
            .from('provider_products')
            .select('id, product_name')
            .eq('provider_id', providerId),
          supabase
            .from('provider_services')
            .select('id, service_name')
            .eq('provider_id', providerId),
        ]);

        if (providerReviewsResult.error) {
          console.error('ProviderReviews: error provider_reviews', providerReviewsResult.error);
        }

        const productIds = (productsResult.data || []).map((p) => p.id);
        const serviceIds = (servicesResult.data || []).map((s) => s.id);
        const productNameMap = new Map(
          (productsResult.data || []).map((p) => [p.id, p.product_name || 'Producto']),
        );
        const serviceNameMap = new Map(
          (servicesResult.data || []).map((s) => [s.id, s.service_name || 'Servicio']),
        );

        let catalogReviews: Array<{
          id: string;
          client_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          item_type: 'product' | 'service';
          product_id: string | null;
          service_id: string | null;
        }> = [];

        const catalogQueries = [];
        if (productIds.length > 0) {
          catalogQueries.push(
            supabase
              .from('catalog_item_reviews')
              .select('id, client_id, rating, comment, created_at, item_type, product_id, service_id')
              .eq('item_type', 'product')
              .in('product_id', productIds)
              .order('created_at', { ascending: false }),
          );
        }
        if (serviceIds.length > 0) {
          catalogQueries.push(
            supabase
              .from('catalog_item_reviews')
              .select('id, client_id, rating, comment, created_at, item_type, product_id, service_id')
              .eq('item_type', 'service')
              .in('service_id', serviceIds)
              .order('created_at', { ascending: false }),
          );
        }

        if (catalogQueries.length > 0) {
          const catalogResults = await Promise.all(catalogQueries);
          catalogResults.forEach((result) => {
            if (result.error) {
              console.error('ProviderReviews: error catalog_item_reviews', result.error);
              return;
            }
            catalogReviews = catalogReviews.concat(result.data || []);
          });
        }

        const clientIds = [
          ...new Set([
            ...(providerReviewsResult.data || []).map((r) => r.client_id),
            ...catalogReviews.map((r) => r.client_id),
          ]),
        ];

        const clientNameMap = new Map<string, string>();
        if (clientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', clientIds);

          (profiles || []).forEach((profile) => {
            if (profile.full_name?.trim()) {
              clientNameMap.set(profile.user_id, profile.full_name.trim());
            }
          });
        }

        const getClientName = (clientId: string) =>
          clientNameMap.get(clientId) || 'Cliente';

        const unified: UnifiedReview[] = [
          ...(providerReviewsResult.data || []).map((review) => ({
            id: `provider-${review.id}`,
            source: 'provider' as const,
            itemLabel: 'Tu tienda',
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            client_id: review.client_id,
            client_name: getClientName(review.client_id),
          })),
          ...catalogReviews.map((review) => {
            const isProduct = review.item_type === 'product';
            const itemId = isProduct ? review.product_id : review.service_id;
            const itemLabel = isProduct
              ? productNameMap.get(itemId || '') || 'Producto'
              : serviceNameMap.get(itemId || '') || 'Servicio';

            return {
              id: `catalog-${review.id}`,
              source: (isProduct ? 'product' : 'service') as ReviewSource,
              itemLabel,
              rating: review.rating,
              comment: review.comment,
              created_at: review.created_at,
              client_id: review.client_id,
              client_name: getClientName(review.client_id),
            };
          }),
        ].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setReviews(unified);
      } catch (error) {
        console.error('ProviderReviews: error inesperado', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesRating =
        ratingFilter === 'all' || review.rating === parseInt(ratingFilter, 10);
      const matchesSource = sourceFilter === 'all' || review.source === sourceFilter;
      return matchesRating && matchesSource;
    });
  }, [reviews, ratingFilter, sourceFilter]);

  const overallRating = useMemo(() => {
    if (reviews.length === 0) return { average: 0, count: 0 };
    return {
      average: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
      count: reviews.length,
    };
  }, [reviews]);

  const withComments = reviews.filter((r) => r.comment?.trim()).length;
  const providerCount = reviews.filter((r) => r.source === 'provider').length;
  const catalogCount = reviews.length - providerCount;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/60" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <DashboardStatCard
          variant="plain"
          icon={Star}
          value={overallRating.average > 0 ? overallRating.average.toFixed(1) : '—'}
          label="Calificación promedio"
          footer={`${overallRating.count} reseña${overallRating.count !== 1 ? 's' : ''}`}
          gradientIndex={0}
        />
        <DashboardStatCard
          variant="plain"
          icon={Filter}
          value={withComments}
          label="Con comentario"
          footer={
            overallRating.count > 0
              ? `${((withComments / overallRating.count) * 100).toFixed(0)}% del total`
              : undefined
          }
          gradientIndex={1}
        />
        <DashboardStatCard
          variant="plain"
          icon={Package}
          value={catalogCount}
          label="Productos y servicios"
          footer={providerCount > 0 ? `${providerCount} de tienda` : 'Sin reseñas de tienda'}
          gradientIndex={2}
        />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'provider', 'product', 'service'] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setSourceFilter(source)}
              className={cn(
                'min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                sourceFilter === source
                  ? plainPageAccentTabActive[accent]
                  : cn('bg-white border border-gray-200 text-gray-600', ui.hoverBg),
              )}
            >
              {source === 'all'
                ? 'Todas las fuentes'
                : source === 'provider'
                  ? 'Tienda'
                  : source === 'product'
                    ? 'Productos'
                    : 'Servicios'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {RATING_CHIPS.map((chip) => {
            const active = ratingFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setRatingFilter(chip.id)}
                className={cn(
                  'min-h-[40px] rounded-xl px-2 py-2 text-[11px] font-medium transition-all text-center',
                  active
                    ? plainPageAccentTabActive[accent]
                    : cn('bg-white border border-gray-200 text-gray-600', ui.hoverBg),
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-gray-500 text-right">
          {filteredReviews.length} de {reviews.length} reseñas
        </p>
      </div>

      {reviews.length === 0 ? (
        <MobileSectionCard className="p-8 text-center">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay reseñas aún</h3>
          <p className="text-sm text-gray-500">
            Las reseñas de tus clientes sobre tu tienda, productos o servicios aparecerán aquí.
          </p>
        </MobileSectionCard>
      ) : filteredReviews.length === 0 ? (
        <MobileSectionCard className="p-8 text-center">
          <p className="text-gray-500">No hay reseñas con estos filtros.</p>
        </MobileSectionCard>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <MobileSectionCard key={review.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarFallback className={cn('text-white text-sm', ui.iconBg)}>
                    {review.client_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{review.client_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            review.source === 'provider'
                              ? cn('border', ui.border, ui.text)
                              : 'border-landing-mango/30 text-landing-mango-dark',
                          )}
                        >
                          {review.source === 'provider' ? (
                            <Store className="w-3 h-3 mr-0.5 inline" />
                          ) : (
                            <Package className="w-3 h-3 mr-0.5 inline" />
                          )}
                          {SOURCE_LABELS[review.source]}
                        </Badge>
                        <span className="text-[11px] text-gray-500 truncate">{review.itemLabel}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'w-4 h-4',
                              star <= review.rating
                                ? 'text-landing-tropical fill-current'
                                : 'text-gray-300',
                            )}
                          />
                        ))}
                        <Badge
                          variant="outline"
                          className={cn('ml-1 text-[10px] border', ui.border, ui.text)}
                        >
                          {review.rating}/5
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment?.trim() ? (
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-2">Sin comentario</p>
                  )}
                </div>
              </div>
            </MobileSectionCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderReviews;
