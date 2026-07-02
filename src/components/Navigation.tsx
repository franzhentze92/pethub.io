import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Activity, ShoppingBag, Heart, Settings, Package,
  Stethoscope, Bell, PawPrint, Search, HeartHandshake, Utensils,
  ShoppingCart, Shield, RefreshCw,
} from 'lucide-react';
import { landingFeatureGradients } from '@/lib/landingTheme';
import { useAuth } from '@/contexts/AuthContext';
import { isPetHubAdminUser } from '@/lib/pethubAdminAccess';
import { usePetBuddy } from '@/contexts/PetBuddyContext';
import PetBuddyNavTab from '@/components/pet-buddy/PetBuddyNavTab';

type NavIcon = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

interface NavItem {
  id: string;
  label: string;
  icon: NavIcon;
  gradientIndex: number;
  path?: string;
  expandable?: boolean;
}

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setIsOpen } = usePetBuddy();
  const [expandedButton, setExpandedButton] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const showPetHubAdmin = isPetHubAdminUser(user?.email);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setExpandedButton(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const careOptions: NavItem[] = [
    { id: 'nutrition', label: 'Nutrición', icon: Utensils, gradientIndex: 2, path: '/feeding-schedules' },
    { id: 'exercise', label: 'Ejercicio', icon: Activity, gradientIndex: 1, path: '/trazabilidad' },
    { id: 'veterinary', label: 'Veterinaria', icon: Stethoscope, gradientIndex: 3, path: '/veterinaria' },
    { id: 'recordatorios', label: 'Recordatorios', icon: Bell, gradientIndex: 5, path: '/recordatorios' },
  ];

  const shopOptions: NavItem[] = [
    { id: 'products', label: 'Marketplace', icon: Package, gradientIndex: 1, path: '/marketplace/products' },
    { id: 'orders', label: 'Mis Órdenes', icon: ShoppingCart, gradientIndex: 0, path: '/client-orders' },
    { id: 'subscriptions', label: 'Suscripciones', icon: RefreshCw, gradientIndex: 2, path: '/my-subscriptions' },
  ];

  const socialOptions: NavItem[] = [
    { id: 'adopcion', label: 'Adopción', icon: Heart, gradientIndex: 1, path: '/adopcion' },
    { id: 'parejas', label: 'Parejas', icon: HeartHandshake, gradientIndex: 4, path: '/parejas' },
    { id: 'mascotas-perdidas', label: 'Mascotas Perdidas', icon: Search, gradientIndex: 3, path: '/mascotas-perdidas' },
  ];

  const leftNavItems = useMemo<NavItem[]>(
    () => [
      { id: 'dashboard', label: 'Inicio', icon: Home, gradientIndex: 0, path: '/dashboard' },
      { id: 'shop', label: 'Tienda', icon: ShoppingBag, gradientIndex: 2, expandable: true },
      { id: 'care', label: 'Cuidado', icon: Heart, gradientIndex: 1, expandable: true },
    ],
    [],
  );

  const rightNavItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { id: 'social', label: 'Social', icon: PawPrint, gradientIndex: 4, expandable: true },
      { id: 'profile', label: 'Ajustes', icon: Settings, gradientIndex: 5, path: '/ajustes' },
    ];
    if (showPetHubAdmin) {
      items.push({
        id: 'pethub-admin',
        label: 'Admin',
        icon: Shield,
        gradientIndex: 3,
        path: '/pethub-admin',
      });
    }
    return items;
  }, [showPetHubAdmin]);

  const gradientAt = (index: number) =>
    landingFeatureGradients[index % landingFeatureGradients.length];

  const closePetBuddy = useCallback(() => setIsOpen(false), [setIsOpen]);

  const isBottomActive = (item: NavItem) =>
    location.pathname === item.path ||
    (item.id === 'shop' && location.pathname.startsWith('/marketplace')) ||
    (item.id === 'shop' && location.pathname === '/client-orders') ||
    (item.id === 'shop' && location.pathname === '/my-subscriptions') ||
    (item.id === 'dashboard' && location.pathname === '/dashboard') ||
    (item.id === 'profile' && (location.pathname === '/ajustes' || location.pathname === '/pet-hub-blueprint')) ||
    (item.id === 'social' && ['/adopcion', '/parejas', '/mascotas-perdidas'].includes(location.pathname)) ||
    (item.id === 'care' && ['/feeding-schedules', '/trazabilidad', '/veterinaria', '/recordatorios'].includes(location.pathname)) ||
    (item.id === 'pethub-admin' && location.pathname.startsWith('/pethub-admin'));

  const popupAlignClass = (itemId: string, side: 'left' | 'right') => {
    if (side === 'right') return 'right-0 left-auto translate-x-0';
    return 'left-0 translate-x-0';
  };

  const getSubmenuOptions = (itemId: string) => {
    if (itemId === 'care') return careOptions;
    if (itemId === 'social') return socialOptions;
    return shopOptions;
  };

  const expandedSide =
    expandedButton && ['shop', 'care'].includes(expandedButton)
      ? 'left'
      : expandedButton === 'social'
        ? 'right'
        : null;

  const renderNavItem = (item: NavItem, side: 'left' | 'right') => {
    const gradient = gradientAt(item.gradientIndex);
    const active = isBottomActive(item) || expandedButton === item.id;

    return (
      <div key={item.id} className={`relative min-w-0 flex-1 ${expandedButton === item.id ? 'z-[120]' : ''}`}>
        <button
          type="button"
          onClick={() => {
            if (item.expandable) {
              closePetBuddy();
              setExpandedButton(expandedButton === item.id ? null : item.id);
            } else if (item.path) {
              closePetBuddy();
              navigate(item.path);
              setExpandedButton(null);
            }
          }}
          className={`flex w-full flex-col items-center justify-center gap-0 rounded-lg py-1 transition-colors duration-200 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-aqua/40 focus-visible:ring-inset ${
            active ? 'text-landing-aqua-dark' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span
            className={`flex h-6 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
              active && !item.expandable
                ? `bg-gradient-to-r ${gradient} text-white shadow-sm`
                : active && item.expandable
                  ? 'bg-landing-aqua/15 text-landing-aqua-dark'
                  : ''
            }`}
          >
            <item.icon size={18} strokeWidth={active ? 2.25 : 2} />
          </span>
          <span
            className={`mt-0.5 w-full truncate px-0.5 text-center text-[9px] font-medium leading-none ${
              active ? 'font-semibold text-landing-aqua-dark' : ''
            }`}
          >
            {item.label}
          </span>
        </button>

        {item.expandable && expandedButton === item.id && (
          <div
            className={`absolute bottom-full z-[120] mb-2 max-w-[calc(100vw-1rem)] min-w-[11.5rem] rounded-2xl border border-landing-aqua/20 bg-white/95 p-1.5 shadow-xl backdrop-blur-md ${popupAlignClass(item.id, side)}`}
          >
            {getSubmenuOptions(item.id).map((option) => {
              const optGradient = gradientAt(option.gradientIndex);
              const optActive = location.pathname === option.path;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (option.path) navigate(option.path);
                    setExpandedButton(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                    optActive
                      ? `bg-gradient-to-r ${optGradient} text-white shadow-sm`
                      : 'text-gray-700 hover:bg-landing-aqua/10'
                  }`}
                >
                  <option.icon size={18} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {expandedButton && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-[90] bg-black/20 md:bg-transparent"
          onClick={() => setExpandedButton(null)}
        />
      )}

      <div
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-[100] w-full max-w-[100dvw] overflow-visible border-t border-landing-aqua/20 bg-white/95 shadow-[0_-4px_24px_rgba(0,240,200,0.08)] backdrop-blur-md"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex h-[58px] w-full max-w-lg items-end overflow-visible px-1">
          <div
            className={`relative flex min-w-0 flex-1 items-end justify-around ${expandedSide === 'left' ? 'z-[130]' : ''}`}
          >
            {leftNavItems.map((item) => renderNavItem(item, 'left'))}
          </div>

          <PetBuddyNavTab onToggle={() => setExpandedButton(null)} menuOpen={!!expandedButton} />

          <div
            className={`relative flex min-w-0 flex-1 items-end justify-around ${expandedSide === 'right' ? 'z-[130]' : ''}`}
          >
            {rightNavItems.map((item) => renderNavItem(item, 'right'))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
