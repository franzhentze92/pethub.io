import React from 'react';
import {
  Building2, Calendar, Filter, Grid, Heart, MapPin, Megaphone,
  Package, PawPrint, Scissors, ShoppingBag, Store, TrendingUp, User,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { MobileTabStrip, type MobileTabItem } from '@/components/mobile/MobileTabStrip';
import PetJourneyOverview from '@/components/pet-journey/PetJourneyOverview';
import { EMPTY_JOURNEY_STATS } from '@/components/pet-journey/petJourneyAnalytics';
import { MARKETPLACE_PRODUCT_CATEGORIES } from '@/lib/productCategories';
import { landingFeatureGradients } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

const screenClass = 'p-3 md:p-4 space-y-3 min-h-[360px]';

const marketplaceTabs: MobileTabItem[] = [
  { id: 'products', label: 'Productos', shortLabel: 'Productos', icon: ShoppingBag, gradientIndex: 0 },
  { id: 'services', label: 'Servicios', shortLabel: 'Servicios', icon: Scissors, gradientIndex: 2 },
];

const journeyTabs: MobileTabItem[] = [
  { id: 'overview', label: 'Resumen', shortLabel: 'Resumen', icon: TrendingUp, gradientIndex: 0 },
  { id: 'timeline', label: 'Timeline', shortLabel: 'Timeline', icon: Calendar, gradientIndex: 2 },
];

const adoptionTabs: MobileTabItem[] = [
  { id: 'catalogo', label: 'Catálogo', shortLabel: 'Catálogo', icon: Heart, gradientIndex: 1 },
  { id: 'mis-publicaciones', label: 'Mis Publicaciones', shortLabel: 'Publicar', icon: Megaphone, gradientIndex: 5 },
  { id: 'albergues', label: 'Albergues', shortLabel: 'Albergues', icon: Building2, gradientIndex: 0 },
];

const providerTabs: MobileTabItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: Grid, gradientIndex: 0 },
  { id: 'profile', label: 'Perfil', shortLabel: 'Perfil', icon: User, gradientIndex: 1 },
  { id: 'store', label: 'Tienda', shortLabel: 'Tienda', icon: Store, gradientIndex: 2 },
  { id: 'orders', label: 'Pedidos', shortLabel: 'Pedidos', icon: ShoppingBag, gradientIndex: 3 },
];

/** Marketplace — misma estructura que la app, estado vacío real */
export const MarketplaceLandingScreen: React.FC = () => (
  <div className={screenClass}>
    <PageHeader
      title="Marketplace"
      subtitle="Encuentra servicios y productos para tu mascota"
      gradient="from-landing-aqua via-landing-mint to-landing-mango"
    />
    <MobileTabStrip tabs={marketplaceTabs} activeTab="products" onChange={() => {}} />
    <div className="grid grid-cols-4 gap-2">
      {MARKETPLACE_PRODUCT_CATEGORIES.map((category, index) => {
        const active = category.id === 'all';
        const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
        return (
          <div
            key={category.id}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 min-h-[44px]',
              active
                ? `bg-gradient-to-r ${gradient} text-white shadow-md`
                : 'bg-white/80 backdrop-blur-sm border border-white/60 text-gray-600 shadow-sm',
            )}
          >
            <category.icon size={18} className={active ? 'text-white' : 'text-landing-aqua-dark'} />
            <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">{category.label}</span>
          </div>
        );
      })}
    </div>
    <div className="text-center py-10 rounded-2xl bg-white/60 border border-white/60">
      <Package className="w-14 h-14 mx-auto mb-3 text-gray-300" />
      <h3 className="text-base font-semibold text-gray-700 mb-1">No hay productos disponibles</h3>
      <p className="text-gray-500 text-xs max-w-xs mx-auto px-2">
        Los proveedores aún no han agregado productos.
      </p>
    </div>
  </div>
);

/** Pet Journey — mismo componente real, estado vacío sin datos de ejemplo */
export const PetJourneyLandingScreen: React.FC = () => {
  const formatPrice = (amount: number, currency: string = 'GTQ') =>
    `${currency === 'GTQ' ? 'Q' : '$'}${amount.toFixed(2)}`;

  return (
    <div className={screenClass}>
      <PageHeader
        title="Pet Journey"
        subtitle="Historial completo de actividades, cuidado y gastos"
      >
        <MapPin className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
      </PageHeader>
      <MobileSectionCard>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-lg shrink-0 bg-gradient-to-r',
                landingFeatureGradients[0],
              )}
            >
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">Tu mascota</h2>
              <p className="text-sm text-gray-500">Registra el perfil para comenzar el journey</p>
            </div>
          </div>
        </div>
      </MobileSectionCard>
      <MobileTabStrip tabs={journeyTabs} activeTab="overview" onChange={() => {}} columns={2} />
      <PetJourneyOverview
        pet={{
          id: 'landing-empty',
          name: 'Tu mascota',
          created_at: new Date().toISOString(),
          image_url: null,
        }}
        stats={EMPTY_JOURNEY_STATS}
        events={[]}
        formatPrice={formatPrice}
      />
    </div>
  );
};

/** Adopción — catálogo vacío, mismo copy que la app */
export const AdopcionCatalogLandingScreen: React.FC = () => (
  <div className={screenClass}>
    <div className="space-y-1">
      <h1 className="text-xl font-bold text-gray-900">Adopción</h1>
      <p className="text-sm text-gray-500">Encuentra tu compañero perfecto</p>
    </div>
    <MobileTabStrip tabs={adoptionTabs} activeTab="catalogo" onChange={() => {}} rowSizes={[3]} />
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 rounded-xl border border-landing-aqua/30 text-landing-aqua-dark px-3 py-2 min-h-[40px] text-sm bg-white/60">
        <Filter className="w-4 h-4 shrink-0" />
        Filtros
      </div>
      <span className="text-xs font-medium text-gray-600 whitespace-nowrap bg-white/60 px-3 py-2 rounded-full">
        0 disponibles
      </span>
    </div>
    <div className="text-center py-12">
      <PawPrint className="w-16 h-16 mx-auto mb-3 text-gray-300" />
      <h3 className="text-base font-semibold text-gray-600 mb-1">No hay mascotas disponibles</h3>
      <p className="text-gray-500 text-xs">Intenta ajustar los filtros de búsqueda</p>
    </div>
  </div>
);

/** Proveedor — estado inicial sin perfil configurado */
export const ProviderLandingScreen: React.FC = () => (
  <div className={screenClass}>
    <PageHeader
      title="Dashboard Proveedor"
      subtitle="Configura tu perfil para comenzar"
      gradient="from-landing-aqua via-landing-mint to-landing-mango"
    />
    <MobileTabStrip tabs={providerTabs} activeTab="dashboard" onChange={() => {}} />
    <MobileSectionCard className="p-8 text-center">
      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <h3 className="text-base font-semibold text-gray-700 mb-1">Configura tu perfil</h3>
      <p className="text-gray-500 text-xs max-w-xs mx-auto">
        Para comenzar a usar el dashboard, necesitas configurar tu perfil de proveedor.
      </p>
    </MobileSectionCard>
  </div>
);

/** Refugio — mis publicaciones vacías */
export const ShelterLandingScreen: React.FC = () => (
  <div className={screenClass}>
    <div className="space-y-1">
      <h1 className="text-xl font-bold text-gray-900">Adopción</h1>
      <p className="text-sm text-gray-500">Encuentra tu compañero perfecto</p>
    </div>
    <MobileTabStrip tabs={adoptionTabs} activeTab="mis-publicaciones" onChange={() => {}} rowSizes={[3]} />
    <MobileSectionCard className="p-8 text-center">
      <Megaphone className="w-12 h-12 text-landing-aqua/30 mx-auto mb-3" />
      <h3 className="text-base font-bold text-gray-900 mb-1">Sin publicaciones</h3>
      <p className="text-xs text-gray-500 max-w-xs mx-auto">
        Publica una de tus mascotas para que otras personas puedan adoptarla.
      </p>
    </MobileSectionCard>
  </div>
);
