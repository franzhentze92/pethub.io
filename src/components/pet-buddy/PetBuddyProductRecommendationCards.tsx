import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Loader2, Truck } from 'lucide-react';
import type { PetBuddyProductRecommendation } from '@/ai/types';
import { cn } from '@/lib/utils';

interface PetBuddyProductRecommendationCardsProps {
  recommendations: PetBuddyProductRecommendation[];
  onAddToCart: (rec: PetBuddyProductRecommendation) => Promise<boolean>;
  onCloseChat?: () => void;
}

function formatPrice(price: number, currency: string): string {
  const prefix = currency === 'GTQ' ? 'Q.' : `${currency} `;
  return `${prefix}${price.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const PetBuddyProductRecommendationCards: React.FC<PetBuddyProductRecommendationCardsProps> = ({
  recommendations,
  onAddToCart,
  onCloseChat,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  if (!recommendations.length) return null;

  const handleAdd = async (rec: PetBuddyProductRecommendation) => {
    setLoadingId(rec.productId);
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[rec.productId];
      return next;
    });
    try {
      const ok = await onAddToCart(rec);
      if (ok) {
        setAddedIds((prev) => new Set(prev).add(rec.productId));
      } else {
        setErrorById((prev) => ({
          ...prev,
          [rec.productId]: 'No se pudo agregar. Intenta de nuevo.',
        }));
      }
    } catch {
      setErrorById((prev) => ({
        ...prev,
        [rec.productId]: 'Error al agregar al carrito.',
      }));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] font-semibold text-landing-mango-dark uppercase tracking-wide">
        Opciones en la tienda
      </p>
      {recommendations.map((rec) => {
        const added = addedIds.has(rec.productId);
        const loading = loadingId === rec.productId;
        const macroHint =
          rec.fatPct != null
            ? `${rec.fatPct}% grasa`
            : rec.proteinPct != null
              ? `${rec.proteinPct}% proteína`
              : null;

        return (
          <div
            key={rec.productId}
            className="rounded-xl border border-landing-mint/25 bg-white overflow-hidden shadow-sm"
          >
            <div className="px-3 py-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                    {rec.brand ? `${rec.brand} — ` : ''}
                    {rec.productName}
                  </p>
                  {rec.provider && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{rec.provider}</p>
                  )}
                </div>
                <p className="text-xs font-bold text-landing-aqua-dark shrink-0">
                  {formatPrice(rec.price, rec.currency)}
                </p>
              </div>
              {(macroHint || rec.hasDelivery) && (
                <div className="flex flex-wrap gap-1.5">
                  {macroHint && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-landing-tropical/30 text-landing-mango-dark">
                      {macroHint}
                    </span>
                  )}
                  {rec.hasDelivery && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-0.5">
                      <Truck className="w-2.5 h-2.5" />
                      Delivery
                    </span>
                  )}
                </div>
              )}
              {rec.reason && (
                <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{rec.reason}</p>
              )}
              {errorById[rec.productId] && (
                <p className="text-[10px] text-red-600">{errorById[rec.productId]}</p>
              )}
            </div>
            <div className="flex border-t border-gray-100">
              {added ? (
                <>
                  <div className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-green-700 bg-green-50">
                    <Check className="w-3.5 h-3.5" />
                    En el carrito
                  </div>
                  <Link
                    to="/cart"
                    onClick={() => onCloseChat?.()}
                    className="px-3 py-2 text-[11px] font-semibold text-landing-mango-dark border-l border-gray-100 hover:bg-landing-mango/10"
                  >
                    Ver carrito
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleAdd(rec)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold',
                    'bg-landing-aqua text-white hover:bg-landing-aqua-dark transition-colors disabled:opacity-60',
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  )}
                  Agregar al carrito
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PetBuddyProductRecommendationCards;
