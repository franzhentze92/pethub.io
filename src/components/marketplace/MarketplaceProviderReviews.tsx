import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

export interface ProviderReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
}

interface MarketplaceProviderReviewsProps {
  providerTableId: string | null | undefined;
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

export function MarketplaceProviderReviews({
  providerTableId,
  averageRating = 0,
  reviewCount = 0,
  className,
}: MarketplaceProviderReviewsProps) {
  const [reviews, setReviews] = useState<ProviderReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerTableId) {
      setReviews([]);
      return;
    }

    let cancelled = false;

    const loadReviews = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('provider_reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            profiles!provider_reviews_client_id_fkey (full_name)
          `)
          .eq('provider_id', providerTableId)
          .order('created_at', { ascending: false })
          .limit(25);

        if (error) throw error;
        if (cancelled) return;

        setReviews(
          (data || []).map((row) => ({
            id: row.id,
            rating: row.rating,
            comment: row.comment,
            created_at: row.created_at,
            client_name:
              (row.profiles as { full_name?: string } | null)?.full_name?.trim() || 'Cliente',
          })),
        );
      } catch (err) {
        console.error('Error loading provider reviews:', err);
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [providerTableId]);

  const displayAverage = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : averageRating;
  const displayCount = reviews.length > 0 ? reviews.length : reviewCount;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-landing-aqua-dark text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Reseñas del proveedor
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
        Opiniones sobre la tienda o negocio, no sobre un producto o servicio en particular.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-landing-aqua" />
          Cargando reseñas…
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-landing-aqua/20 bg-white/60 px-4 py-5 text-center text-sm text-gray-500">
          Aún no hay reseñas para este proveedor. ¡Sé el primero en comprar y calificar!
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-landing-aqua/10 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{review.client_name}</p>
                  <p className="text-[11px] text-gray-400">
                    {format(new Date(review.created_at), "d MMM yyyy", { locale: es })}
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

export default MarketplaceProviderReviews;
