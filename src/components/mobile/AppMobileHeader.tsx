import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import NotificationBell from '@/components/NotificationBell';
import RoleSwitcherDropdown from '@/components/RoleSwitcherDropdown';
import { cn } from '@/lib/utils';
import { plainPageAccentHeader, plainPageAccentHeaderForeground, plainPageHeaderActionBtn, pethubRainbowEdge, type HeaderSurface, type PlainPageAccent } from '@/lib/landingTheme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return 'U';
}

/**
 * Native-style mobile header: user greeting + notifications + cart (client).
 * Shared across client, provider, and shelter dashboards.
 */
export const AppMobileHeader: React.FC<{
  showCart?: boolean;
  variant?: 'gradient' | 'solid';
  accent?: PlainPageAccent;
}> = ({
  showCart = true,
  variant = 'gradient',
  accent = 'aqua',
}) => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile(user?.id);
  const { getItemCount } = useCart();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Usuario';
  const initials = getInitials(profile?.full_name, user?.email ?? null);
  const itemCount = getItemCount();
  const isSolid = variant === 'solid';
  const isRainbow = isSolid && accent === 'rainbow';
  const headerSurface: HeaderSurface = variant === 'gradient' ? 'gradient' : accent;
  const headerFg = isSolid ? plainPageAccentHeaderForeground[accent] : 'text-white';
  const actionBtnClass = plainPageHeaderActionBtn(headerSurface);

  return (
    <>
      <header className="sticky top-0 z-[60] bg-white">
        <div
          className="bg-white"
          style={{ height: 'env(safe-area-inset-top, 0px)' }}
          aria-hidden
        />
        <div
          className={cn(
            'relative overflow-hidden px-4 pt-3 pb-5 rounded-b-[1.75rem]',
            variant === 'solid'
              ? plainPageAccentHeader[accent]
              : 'bg-gradient-to-br from-landing-aqua via-landing-mint to-landing-mango shadow-[0_8px_32px_rgba(0,240,200,0.25)]',
          )}
        >
          {variant === 'gradient' && (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-black/5 to-black/20" />
              <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-landing-tropical/20 blur-xl" />
            </>
          )}
          {isRainbow && (
            <div
              aria-hidden
              className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-1.5 rounded-b-[1.75rem]', pethubRainbowEdge)}
            />
          )}

          <div className="relative flex items-center justify-between gap-3">
            {/* User block */}
            <Link
              to="/ajustes"
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-white/60 shadow-md shrink-0"
                />
              ) : (
                <div className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ring-2 shadow-md shrink-0',
                  isRainbow
                    ? 'bg-gray-100 text-gray-900 ring-gray-200'
                    : isSolid
                      ? 'bg-white/50 text-gray-900 ring-white/60 backdrop-blur-sm'
                      : 'bg-white/25 backdrop-blur-sm text-white ring-white/40',
                )}>
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className={cn('text-xs font-semibold leading-tight', headerFg, !isSolid && '[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]')}>
                  {getGreeting()}
                </p>
                <span className={cn('font-bold text-base truncate capitalize block', headerFg, !isSolid && '[text-shadow:0_1px_2px_rgba(0,0,0,0.25)]')}>
                  {firstName}
                </span>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell variant="header" headerSurface={headerSurface} />

              {showCart && (
                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  aria-label="Abrir carrito"
                  className={cn(
                    'relative flex items-center justify-center',
                    'w-10 h-10 rounded-full',
                    actionBtnClass,
                    'transition-colors active:scale-95',
                  )}
                >
                  <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-landing-mango text-white text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white/30">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </button>
              )}

              <RoleSwitcherDropdown variant="header" headerSurface={headerSurface} />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AppMobileHeader;
