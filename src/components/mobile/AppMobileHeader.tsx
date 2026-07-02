import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import NotificationBell from '@/components/NotificationBell';
import RoleSwitcherDropdown from '@/components/RoleSwitcherDropdown';
import { cn } from '@/lib/utils';

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
export const AppMobileHeader: React.FC<{ showCart?: boolean }> = ({ showCart = true }) => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile(user?.id);
  const { getItemCount } = useCart();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Usuario';
  const initials = getInitials(profile?.full_name, user?.email ?? null);
  const itemCount = getItemCount();

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
            'relative overflow-hidden',
            'bg-gradient-to-br from-landing-aqua via-landing-mint to-landing-mango',
            'px-4 pt-3 pb-5',
            'rounded-b-[1.75rem]',
            'shadow-[0_8px_32px_rgba(0,240,200,0.25)]'
          )}
        >
          {/* Subtle scrim for text legibility on bright gradient */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-black/5 to-black/20" />
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-landing-tropical/20 blur-xl" />

          <div className="relative flex items-center justify-between gap-3">
            {/* User block */}
            <Link
              to="/ajustes"
              className="flex items-center gap-3 min-w-0 flex-1 group"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-white/40 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/40 shadow-md shrink-0">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-white text-xs font-semibold leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
                  {getGreeting()}
                </p>
                <div className="flex items-center gap-0.5 min-w-0">
                  <span className="text-white font-bold text-base truncate capitalize [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
                    {firstName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-white shrink-0 drop-shadow-sm group-hover:translate-y-0.5 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell variant="header" />

              {showCart && (
                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  aria-label="Abrir carrito"
                  className={cn(
                    'relative flex items-center justify-center',
                    'w-10 h-10 rounded-full',
                    'bg-white/20 backdrop-blur-sm',
                    'text-white hover:bg-white/30',
                    'transition-colors active:scale-95'
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

              <RoleSwitcherDropdown variant="header" />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AppMobileHeader;
