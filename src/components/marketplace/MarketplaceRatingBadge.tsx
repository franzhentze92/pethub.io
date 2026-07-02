import React from 'react';
import { Star, Package, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketplaceRatingBadgeProps {
  label: string;
  average?: number;
  count?: number;
  variant: 'item' | 'provider';
  size?: 'sm' | 'md';
  showScoreText?: boolean;
  className?: string;
}

export function MarketplaceRatingBadge({
  label,
  average = 0,
  count = 0,
  variant,
  size = 'sm',
  showScoreText = false,
  className,
}: MarketplaceRatingBadgeProps) {
  const Icon = variant === 'provider' ? Store : Package;
  const starSize = size === 'sm' ? 10 : 14;
  const hasRating = average > 0 && count > 0;

  return (
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      <Icon
        className={cn(
          'shrink-0',
          size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5',
          variant === 'provider' ? 'text-landing-aqua-dark' : 'text-landing-mango',
        )}
      />
      <span
        className={cn(
          'shrink-0 font-medium',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          variant === 'provider' ? 'text-landing-aqua-dark' : 'text-gray-600',
        )}
      >
        {label}
      </span>
      <span className={cn('text-gray-300', size === 'sm' ? 'text-[10px]' : 'text-xs')}>·</span>
      <div className="flex items-center gap-0.5 min-w-0">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={starSize}
            className={cn(
              size === 'sm' ? 'md:w-3 md:h-3' : 'w-3.5 h-3.5',
              hasRating && star <= Math.round(average)
                ? 'text-landing-tropical fill-current'
                : 'text-gray-300',
            )}
          />
        ))}
      </div>
      {showScoreText && (
        <span className={cn('text-gray-500 truncate', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
          {hasRating ? `${average.toFixed(1)} (${count})` : 'Sin reseñas'}
        </span>
      )}
    </div>
  );
}

export default MarketplaceRatingBadge;
