import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, Loader2, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

export interface CatalogReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
}

interface MarketplaceCatalogReviewsProps {
  itemType: 'product' | 'service';
  itemId: string;
  itemName: string;
  averageRating?: number;
  reviewCount?: number;
  className?: string;
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            iconClass,
            star <= rating ? 'text-landing-tropical fill-current' : 'text-gray-300',
          )}
        />
      ))}
    </div>
  );
}

export function MarketplaceCatalogReviews({
  itemType,
  itemId,
  itemName,
  averageRating = 0,
  reviewCount = 0,
  className,
}: MarketplaceCatalogReviewsProps) {
  const [reviews, setReviews] = useState<CatalogReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setReviews([]);
      return;
    }

    let cancelled = false;

    const loadReviews = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('catalog_item_reviews')
          .select('id, rating, comment, created_at')
          .eq('item_type', itemType)
          .order('created_at', { ascending: false })
          .limit(25);

        query =
          itemType === 'product'
            ? query.eq('product_id', itemId)
            : query.eq('service_id', itemId);

        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;

        setReviews(
          (data || []).map((row) => ({
            id: row.id,
            rating: row.rating,
            comment: row.comment,
            created_at: row.created_at,
            client_name: 'Cliente',
          })),
        );
      } catch (err) {
        console.error('Error loading catalog item reviews:', err);
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [itemId, itemType]);

  const displayAverage =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : averageRating;
  const displayCount = reviews.length > 0 ? reviews.length : reviewCount;
  const itemLabel = itemType === 'product' ? 'producto' : 'servicio';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-landing-aqua-dark text-sm flex items-center gap-2">
          <Package className="w-4 h-4" />
          Reseñas del {itemLabel}
        </h4>
        <div className="flex items-center gap-2 text-sm">
          <StarRow rating={Math.round(displayAverage)} size="md" />
          <span className="font-semibold text-gray-800">
            {displayAverage > 0 ? displayAverage.toFixed(1) : '—'}
          </span>
          <span className="text-gray-500">({displayCount})</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 -mt-1">
        Opiniones sobre <span className="font-medium text-gray-700">{itemName}</span>, no del
        proveedor en general.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-landing-aqua" />
          Cargando reseñas…
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-landing-mango/25 bg-white/60 px-4 py-5 text-center text-sm text-gray-500">
          Aún no hay reseñas para este {itemLabel}. Compra y califica para ayudar a otros clientes.
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-landing-mango/15 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{review.client_name}</p>
                  <p className="text-[11px] text-gray-400">
                    {format(new Date(review.created_at), 'd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <StarRow rating={review.rating} />
              </div>
              {review.comment?.trim() ? (
                <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin comentario escrito</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplaceCatalogReviews;
