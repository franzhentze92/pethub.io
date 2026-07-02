/**
 * PetHub landing page color palette & reusable Tailwind class strings.
 *
 * aqua     #00F0C8 — teal brillante (primary)
 * mango    #FFB703 — mango dorado (accent cálido)
 * tropical #FDE74C — amarillo tropical (highlight)
 * mint     #38F9A0 — verde citrus / mint neón (secondary)
 */

export const landingGradients = {
  /** Botones principales, logo, CTAs */
  primary: 'bg-gradient-to-r from-landing-aqua to-landing-mint',
  primaryHover: 'hover:from-landing-aqua-dark hover:to-landing-mint-dark',

  /** Secciones hero y banners */
  hero: 'bg-gradient-to-r from-landing-aqua to-landing-mango',
  heroBr: 'bg-gradient-to-br from-landing-aqua to-landing-mango',

  /** Fondos de página suaves */
  pageBg: 'bg-gradient-to-br from-gray-50 via-landing-aqua/5 to-landing-mint/10',
  authBg: 'bg-gradient-to-br from-landing-aqua/10 via-landing-mint/10 to-landing-tropical/20',

  /** Texto con gradiente */
  text: 'bg-gradient-to-r from-landing-aqua to-landing-mango bg-clip-text text-transparent',
} as const;

/** Combinaciones para iconos / tarjetas — rota entre los 4 colores */
export const landingFeatureGradients = [
  'from-landing-aqua to-landing-mint',
  'from-landing-mint to-landing-aqua',
  'from-landing-mango to-landing-tropical',
  'from-landing-tropical to-landing-mango',
  'from-landing-aqua to-landing-mango',
  'from-landing-mint to-landing-tropical',
] as const;

export const landingCardThemes = [
  { bg: 'bg-gradient-to-br from-landing-mint/10 to-landing-aqua/10', border: 'border-landing-mint/20', icon: 'from-landing-mint to-landing-aqua', check: 'text-landing-mint-dark' },
  { bg: 'bg-gradient-to-br from-landing-aqua/10 to-landing-mint/10', border: 'border-landing-aqua/20', icon: 'from-landing-aqua to-landing-mint', check: 'text-landing-aqua-dark' },
  { bg: 'bg-gradient-to-br from-landing-mango/10 to-landing-tropical/10', border: 'border-landing-mango/20', icon: 'from-landing-mango to-landing-tropical', check: 'text-landing-mango-dark' },
  { bg: 'bg-gradient-to-br from-landing-tropical/10 to-landing-mango/10', border: 'border-landing-tropical/30', icon: 'from-landing-tropical to-landing-mango', check: 'text-landing-mango-dark' },
  { bg: 'bg-gradient-to-br from-landing-aqua/10 to-landing-mango/10', border: 'border-landing-aqua/20', icon: 'from-landing-aqua to-landing-mango', check: 'text-landing-aqua-dark' },
  { bg: 'bg-gradient-to-br from-landing-mint/10 to-landing-tropical/10', border: 'border-landing-mint/20', icon: 'from-landing-mint to-landing-tropical', check: 'text-landing-mint-dark' },
  { bg: 'bg-gradient-to-br from-landing-mango/10 to-landing-mint/10', border: 'border-landing-mango/20', icon: 'from-landing-mango to-landing-mint', check: 'text-landing-mango-dark' },
  { bg: 'bg-gradient-to-br from-landing-aqua/5 to-landing-tropical/10', border: 'border-landing-aqua/15', icon: 'from-landing-aqua to-landing-tropical', check: 'text-landing-aqua-dark' },
  { bg: 'bg-gradient-to-br from-gray-50 to-slate-50', border: 'border-gray-100', icon: 'from-gray-500 to-slate-600', check: 'text-gray-500' },
] as const;

/** Clases compartidas para botones CTA */
export const landingBtnPrimary =
  'bg-gradient-to-r from-landing-aqua to-landing-mint hover:from-landing-aqua-dark hover:to-landing-mint-dark text-white shadow-lg hover:shadow-xl transition-all duration-300';

/** Botones sobre banners / PageHeader con gradiente */
export const landingHeaderActionBtn =
  'bg-white text-landing-aqua-dark font-semibold shadow-md hover:shadow-lg hover:bg-white/95 active:scale-[0.98] transition-all duration-200';

export const landingBtnHero =
  'bg-gradient-to-r from-landing-aqua to-landing-mango hover:from-landing-aqua-dark hover:to-landing-mango-dark text-white shadow-lg hover:shadow-xl transition-all duration-300';

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
