/**
 * PetHub landing page color palette & reusable Tailwind class strings.
 *
 * aqua     #00F0C8 — teal brillante (primary)
 * mango    #FFB703 — mango dorado (accent cálido)
 * tropical #FDE74C — amarillo tropical (highlight)
 * mint     #38F9A0 — verde citrus / mint neón (secondary)
 * white    #FFFFFF — fondos y contraste
 */

/** Paleta sólida PetHub — rotar por índice en tarjetas, tabs, etc. */
export const landingPalette = [
  'bg-landing-aqua',
  'bg-landing-mint',
  'bg-landing-mango',
  'bg-landing-tropical',
] as const;

export const landingPaletteText = [
  'text-white',
  'text-gray-900',
  'text-gray-900',
  'text-gray-900',
] as const;

export const paletteAt = (index: number) =>
  landingPalette[index % landingPalette.length];

export const paletteTextAt = (index: number) =>
  landingPaletteText[index % landingPaletteText.length];

/** Superficies reutilizables — solo colores sólidos */
export const landingGradients = {
  primary: 'bg-landing-aqua',
  primaryHover: 'hover:bg-landing-aqua-dark',
  hero: 'bg-landing-aqua',
  heroBr: 'bg-landing-mango',
  pageBg: 'bg-gray-50',
  authBg: 'bg-landing-aqua/5',
  text: 'text-landing-aqua-dark',
} as const;

/** Colores sólidos para iconos / tabs — rota entre los 4 colores de marca */
export const landingFeatureGradients = [
  'bg-landing-aqua',
  'bg-landing-mint',
  'bg-landing-mango',
  'bg-landing-tropical',
  'bg-landing-aqua',
  'bg-landing-mint',
] as const;

export const landingCardThemes = [
  { bg: 'bg-landing-mint/10', border: 'border-landing-mint/20', icon: 'bg-landing-mint', check: 'text-landing-mint-dark' },
  { bg: 'bg-landing-aqua/10', border: 'border-landing-aqua/20', icon: 'bg-landing-aqua', check: 'text-landing-aqua-dark' },
  { bg: 'bg-landing-mango/10', border: 'border-landing-mango/20', icon: 'bg-landing-mango', check: 'text-landing-mango-dark' },
  { bg: 'bg-landing-tropical/25', border: 'border-landing-tropical/40', icon: 'bg-landing-tropical', check: 'text-landing-mango-dark' },
  { bg: 'bg-landing-aqua/10', border: 'border-landing-aqua/20', icon: 'bg-landing-aqua', check: 'text-landing-aqua-dark' },
  { bg: 'bg-landing-mint/10', border: 'border-landing-mint/20', icon: 'bg-landing-mint', check: 'text-landing-mint-dark' },
  { bg: 'bg-landing-mango/10', border: 'border-landing-mango/20', icon: 'bg-landing-mango', check: 'text-landing-mango-dark' },
  { bg: 'bg-landing-aqua/5', border: 'border-landing-aqua/15', icon: 'bg-landing-tropical', check: 'text-landing-aqua-dark' },
  { bg: 'bg-gray-50', border: 'border-gray-100', icon: 'bg-gray-600', check: 'text-gray-500' },
] as const;

/** Clases compartidas para botones CTA */
export const landingBtnPrimary =
  'bg-landing-aqua hover:bg-landing-aqua-dark text-white shadow-lg hover:shadow-xl transition-all duration-300';

/** Botón sólido aqua */
export const landingBtnSolid =
  'bg-landing-aqua hover:bg-landing-aqua-dark text-white shadow-sm hover:shadow-md transition-all duration-200';

/** Botón sólido mango (acciones secundarias / solicitar) */
export const landingBtnSolidMango =
  'bg-landing-mango hover:bg-landing-mango-dark text-gray-900 shadow-sm hover:shadow-md transition-all duration-200';

/** Fondos sólidos de iconos (rotar por índice en tarjetas sociales) */
export const landingSolidIconBgs = [
  'bg-landing-aqua text-white',
  'bg-landing-mint text-gray-900',
  'bg-landing-mango text-gray-900',
  'bg-landing-tropical text-gray-900',
] as const;

export const solidIconBgAt = (index: number) =>
  landingSolidIconBgs[index % landingSolidIconBgs.length];

/** Tarjetas de estadísticas sin gradiente (páginas planas Cuidado / Social) */
export const landingSolidCardThemes = [
  { bg: 'bg-landing-mint/10', border: 'border-landing-mint/25', icon: 'text-landing-mint-dark' },
  { bg: 'bg-landing-aqua/10', border: 'border-landing-aqua/25', icon: 'text-landing-aqua-dark' },
  { bg: 'bg-landing-tropical/25', border: 'border-landing-tropical/40', icon: 'text-landing-mango-dark' },
  { bg: 'bg-landing-mango/10', border: 'border-landing-mango/30', icon: 'text-landing-mango-dark' },
  { bg: 'bg-landing-aqua/5', border: 'border-landing-aqua/15', icon: 'text-landing-aqua-dark' },
  { bg: 'bg-landing-mint/5', border: 'border-landing-mint/20', icon: 'text-landing-mint-dark' },
] as const;

export const solidCardThemeAt = (index: number) =>
  landingSolidCardThemes[index % landingSolidCardThemes.length];

/** Botón sólido mint (páginas Cuidado) */
export const landingBtnSolidMint =
  'bg-landing-mint hover:bg-landing-mint-dark text-gray-900 shadow-sm hover:shadow-md transition-all duration-200';

/** Acento para páginas planas (Ajustes = tropical, Social = mango, Cuidado = mint, Tienda = aqua) */
export type PlainPageAccent = 'aqua' | 'mango' | 'mint' | 'tropical' | 'rainbow';

/** Botón sólido tropical (cuarto color de la paleta) */
export const landingBtnSolidTropical =
  'bg-landing-tropical hover:bg-landing-tropical-dark text-gray-900 shadow-sm hover:shadow-md transition-all duration-200';

/** Rota botones sólidos entre los 4 colores PetHub */
export const landingBtnSolidVariants = [
  landingBtnSolid,
  landingBtnSolidMint,
  landingBtnSolidMango,
  landingBtnSolidTropical,
] as const;

export const landingBtnSolidAt = (index: number) =>
  landingBtnSolidVariants[index % landingBtnSolidVariants.length];

/** Franja decorativa con los 4 colores sólidos de marca */
export const pethubRainbowEdge =
  'bg-landing-aqua';

/** Barras superiores sólidas para tarjetas */
export const landingSolidTopBars = [
  'bg-landing-aqua',
  'bg-landing-mint',
  'bg-landing-mango',
  'bg-landing-tropical',
] as const;

export const solidTopBarAt = (index: number) =>
  landingSolidTopBars[index % landingSolidTopBars.length];

/** Tabs activos del dashboard — un color distinto por pestaña */
export const dashboardTabActiveClasses = [
  'data-[state=active]:bg-landing-aqua data-[state=active]:text-white',
  'data-[state=active]:bg-landing-mint data-[state=active]:text-gray-900',
  'data-[state=active]:bg-landing-mango data-[state=active]:text-gray-900',
  'data-[state=active]:bg-landing-tropical data-[state=active]:text-gray-900',
] as const;

export const dashboardTabActiveAt = (index: number) =>
  dashboardTabActiveClasses[index % dashboardTabActiveClasses.length];

export const plainPageAccentBtn: Record<PlainPageAccent, string> = {
  aqua: landingBtnSolid,
  mango: landingBtnSolidMango,
  mint: landingBtnSolidMint,
  tropical: landingBtnSolidTropical,
  rainbow: landingBtnSolid,
};

export const plainPageAccentHeader: Record<PlainPageAccent, string> = {
  aqua: 'bg-landing-aqua shadow-md',
  mango: 'bg-landing-mango shadow-md',
  mint: 'bg-landing-mint shadow-md',
  tropical: 'bg-landing-tropical shadow-md',
  rainbow: 'bg-white shadow-sm',
};

/** Texto legible sobre el header sólido de cada acento */
export const plainPageAccentHeaderForeground: Record<PlainPageAccent, string> = {
  aqua: 'text-white',
  mango: 'text-gray-900',
  mint: 'text-gray-900',
  tropical: 'text-gray-900',
  rainbow: 'text-gray-900',
};

export const plainPageAccentTabActive: Record<PlainPageAccent, string> = {
  aqua: 'bg-landing-aqua text-white shadow-sm',
  mango: 'bg-landing-mango text-gray-900 shadow-sm',
  mint: 'bg-landing-mint text-gray-900 shadow-sm',
  tropical: 'bg-landing-tropical text-gray-900 shadow-sm',
  rainbow: 'bg-landing-aqua text-white shadow-sm',
};

export const plainPageAccentTabInactiveHover: Record<PlainPageAccent, string> = {
  aqua: 'hover:border-landing-aqua/40 hover:text-landing-aqua-dark',
  mango: 'hover:border-landing-mango/40 hover:text-landing-mango-dark',
  mint: 'hover:border-landing-mint/40 hover:text-landing-mint-dark',
  tropical: 'hover:border-landing-tropical/50 hover:text-landing-mango-dark',
  rainbow: 'hover:border-landing-aqua/40 hover:text-landing-aqua-dark',
};

export const plainPageAccentOutlineBtn: Record<PlainPageAccent, string> = {
  aqua: 'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10',
  mango: 'border-landing-mango/30 text-landing-mango-dark hover:bg-landing-mango/10',
  mint: 'border-landing-mint/30 text-landing-mint-dark hover:bg-landing-mint/10',
  tropical: 'border-landing-tropical/40 text-landing-mango-dark hover:bg-landing-tropical/15',
  rainbow: 'border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10',
};

/** Clases utilitarias para UI plana según acento de sección */
export const plainPageAccentUi = (accent: PlainPageAccent) => {
  const map = {
    aqua: {
      text: 'text-landing-aqua-dark',
      iconBg: 'bg-landing-aqua text-white',
      bgLight: 'bg-landing-aqua/10',
      bgSoft: 'bg-landing-aqua/5',
      border: 'border-landing-aqua/30',
      borderLight: 'border-landing-aqua/20',
      borderActive: 'border-landing-aqua/50',
      hoverBg: 'hover:bg-landing-aqua/10 active:bg-landing-aqua/15',
      badge: 'bg-landing-aqua/20 text-landing-aqua-dark border-landing-aqua/30',
      iconMuted: 'text-landing-aqua/40',
    },
    mango: {
      text: 'text-landing-mango-dark',
      iconBg: 'bg-landing-mango text-gray-900',
      bgLight: 'bg-landing-mango/10',
      bgSoft: 'bg-landing-mango/5',
      border: 'border-landing-mango/30',
      borderLight: 'border-landing-mango/20',
      borderActive: 'border-landing-mango/50',
      hoverBg: 'hover:bg-landing-mango/10 active:bg-landing-mango/15',
      badge: 'bg-landing-mango/20 text-landing-mango-dark border-landing-mango/30',
      iconMuted: 'text-landing-mango/40',
    },
    mint: {
      text: 'text-landing-mint-dark',
      iconBg: 'bg-landing-mint text-gray-900',
      bgLight: 'bg-landing-mint/10',
      bgSoft: 'bg-landing-mint/5',
      border: 'border-landing-mint/30',
      borderLight: 'border-landing-mint/20',
      borderActive: 'border-landing-mint/50',
      hoverBg: 'hover:bg-landing-mint/10 active:bg-landing-mint/15',
      badge: 'bg-landing-mint/20 text-landing-mint-dark border-landing-mint/30',
      iconMuted: 'text-landing-mint/40',
    },
    tropical: {
      text: 'text-landing-mango-dark',
      iconBg: 'bg-landing-tropical text-gray-900',
      bgLight: 'bg-landing-tropical/20',
      bgSoft: 'bg-landing-tropical/10',
      border: 'border-landing-tropical/40',
      borderLight: 'border-landing-tropical/30',
      borderActive: 'border-landing-tropical/50',
      hoverBg: 'hover:bg-landing-tropical/15 active:bg-landing-tropical/25',
      badge: 'bg-landing-tropical/30 text-landing-mango-dark border-landing-tropical/40',
      iconMuted: 'text-landing-tropical/50',
    },
    rainbow: {
      text: 'text-landing-aqua-dark',
      iconBg: 'bg-landing-aqua text-white',
      bgLight: 'bg-landing-aqua/10',
      bgSoft: 'bg-landing-aqua/5',
      border: 'border-landing-aqua/30',
      borderLight: 'border-landing-aqua/20',
      borderActive: 'border-landing-aqua/50',
      hoverBg: 'hover:bg-landing-aqua/10 active:bg-landing-aqua/15',
      badge: 'bg-landing-aqua/20 text-landing-aqua-dark border-landing-aqua/30',
      iconMuted: 'text-landing-aqua/40',
    },
  } as const;
  return map[accent];
};

/** Texto activo en tabs internos de modales */
export const plainModalTabTriggerActive: Record<PlainPageAccent, string> = {
  aqua: 'data-[state=active]:text-landing-aqua-dark',
  mango: 'data-[state=active]:text-landing-mango-dark',
  mint: 'data-[state=active]:text-landing-mint-dark',
  tropical: 'data-[state=active]:text-landing-mango-dark',
  rainbow: 'data-[state=active]:text-landing-aqua-dark',
};

/** Clases reutilizables para modales con acento plano */
export const plainModalAccentClasses = (accent: PlainPageAccent) => {
  const ui = plainPageAccentUi(accent);
  return {
    ui,
    btn: plainPageAccentBtn[accent],
    outlineBtn: plainPageAccentOutlineBtn[accent],
    dialogBorder: ui.borderLight,
    header: `border-b ${ui.bgLight} ${ui.borderLight}`,
    iconBadge: `flex h-9 w-9 items-center justify-center rounded-xl shadow-md ${ui.iconBg}`,
    tabList: `grid w-full p-1 rounded-xl border h-auto gap-1 ${ui.bgLight} ${ui.border}`,
    tabTrigger: `rounded-lg text-gray-600 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 text-xs sm:text-sm ${plainModalTabTriggerActive[accent]}`,
    infoBanner: `rounded-xl border p-4 ${ui.border} ${ui.bgSoft}`,
    sectionCard: `rounded-xl border bg-white shadow-sm ${ui.borderLight}`,
    footer: `border-t bg-gray-50/80 ${ui.borderLight}`,
  };
};

/** Rutas Ajustes (header amarillo tropical + fondo blanco) */
export const settingsPagePaths = ['/ajustes', '/pet-hub-blueprint'] as const;

export const isSettingsPage = (pathname: string) =>
  (settingsPagePaths as readonly string[]).includes(pathname);

/** Dashboard cliente — fondo blanco + header arcoíris */
export const isDashboardPage = (pathname: string) => pathname === '/dashboard';

/** Botones del header móvil según superficie (gradiente, aqua, mango, mint, rainbow) */
export type HeaderSurface = PlainPageAccent | 'gradient';

export const plainPageHeaderActionBtn = (surface: HeaderSurface): string => {
  if (surface === 'gradient') {
    return 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm';
  }
  if (surface === 'rainbow') {
    return 'bg-gray-100 text-gray-900 hover:bg-gray-200';
  }
  return 'bg-white/50 text-gray-900 hover:bg-white/70 backdrop-blur-sm shadow-sm';
};

export const plainPageHeaderActionBtnActiveRing = (surface: HeaderSurface): string => {
  if (surface === 'gradient') {
    return 'bg-white/30 ring-2 ring-white/40';
  }
  if (surface === 'rainbow') {
    return 'ring-2 ring-landing-aqua/30 bg-gray-200';
  }
  return 'bg-white/70 ring-2 ring-white/60';
};

/** Rutas del hub Cuidado (header mint + fondo blanco) */
export const carePagePaths = [
  '/feeding-schedules',
  '/trazabilidad',
  '/veterinaria',
  '/recordatorios',
  '/meal-journal',
  '/adventure-log',
  '/health-journal',
  '/pet-reminders',
] as const;

export const isCarePage = (pathname: string) =>
  (carePagePaths as readonly string[]).includes(pathname);

/** Rutas Tienda / Marketplace / Órdenes (header aqua + fondo blanco) */
export const marketplacePagePaths = [
  '/marketplace',
  '/marketplace/products',
  '/marketplace/services',
  '/marketplace/favorites',
  '/client-orders',
  '/cart',
  '/my-subscriptions',
] as const;

export const isMarketplacePage = (pathname: string) =>
  (marketplacePagePaths as readonly string[]).includes(pathname) ||
  pathname.startsWith('/marketplace/');

/** Resuelve el acento de página plana según la ruta actual */
export const resolvePlainPageAccent = (pathname: string): PlainPageAccent | null => {
  if (isDashboardPage(pathname)) return 'rainbow';

  const socialPlainPages = ['/adopcion', '/parejas', '/paseos', '/mascotas-perdidas'];
  if (socialPlainPages.includes(pathname) || pathname.startsWith('/shelter/')) return 'mango';
  if (isCarePage(pathname)) return 'mint';
  if (isMarketplacePage(pathname)) return 'aqua';
  if (isSettingsPage(pathname)) return 'tropical';

  return null;
};

/** Tabs principales del dashboard proveedor */
export type ProviderDashboardMainTab = 'dashboard' | 'profile' | 'store' | 'orders';

export const providerMainTabAccent: Record<ProviderDashboardMainTab, PlainPageAccent> = {
  dashboard: 'rainbow',
  profile: 'tropical',
  store: 'aqua',
  orders: 'mango',
};

/** Sub-tabs dentro de Tienda y Pedidos */
export const providerSubTabAccent: Record<string, PlainPageAccent> = {
  products: 'aqua',
  services: 'mint',
  orders: 'mango',
  appointments: 'mint',
  reviews: 'tropical',
};

/** Acento plano según tab + sub-tab activos del proveedor */
export const resolveProviderDashboardAccent = (
  activeTab: string,
  activeSubTab = '',
): PlainPageAccent => {
  if (activeTab === 'store' && activeSubTab) {
    return providerSubTabAccent[activeSubTab] ?? providerMainTabAccent.store;
  }
  if (activeTab === 'orders' && activeSubTab) {
    return providerSubTabAccent[activeSubTab] ?? providerMainTabAccent.orders;
  }
  return providerMainTabAccent[activeTab as ProviderDashboardMainTab] ?? 'aqua';
};

/** Tabs del dashboard albergue */
export type ShelterDashboardTab = 'dashboard' | 'profile' | 'pets' | 'quotes' | 'media' | 'add-pet';

export const shelterTabAccent: Record<ShelterDashboardTab, PlainPageAccent> = {
  dashboard: 'rainbow',
  profile: 'tropical',
  pets: 'mango',
  quotes: 'aqua',
  media: 'mint',
  'add-pet': 'mango',
};

/** Acento plano según tab activo del albergue */
export const resolveShelterDashboardAccent = (activeTab: string): PlainPageAccent =>
  shelterTabAccent[activeTab as ShelterDashboardTab] ?? 'mango';

/** Botones sobre banners / PageHeader sólidos */
export const landingHeaderActionBtn =
  'bg-white text-landing-aqua-dark font-semibold shadow-md hover:shadow-lg hover:bg-white/95 active:scale-[0.98] transition-all duration-200';

export const landingBtnHero =
  'bg-landing-aqua hover:bg-landing-aqua-dark text-white shadow-lg hover:shadow-xl transition-all duration-300';

export const landingBtnOutline =
  'text-landing-aqua-dark hover:text-white border-landing-aqua hover:bg-landing-aqua transition-all duration-300';

export const landingBadge =
  'bg-landing-aqua/15 text-landing-aqua-dark border-landing-aqua/30';

/** Colores para gráficos Recharts */
export const landingChartColors = {
  aqua: '#00F0C8',
  mint: '#38F9A0',
  mango: '#FFB703',
  tropical: '#FDE74C',
} as const;

export const landingChartPalette = [
  landingChartColors.aqua,
  landingChartColors.mint,
  landingChartColors.mango,
  landingChartColors.tropical,
] as const;
