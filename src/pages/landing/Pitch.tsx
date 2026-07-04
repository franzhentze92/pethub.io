import React from 'react';
import {
  PawPrint, Heart, Store, Home, Users, TrendingUp, DollarSign,
  Target, Zap, Shield, BarChart3, Rocket, CheckCircle, Sparkles, Truck,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PitchSlideDeck, type PitchSlide } from '@/components/landing/PitchSlideDeck';
import { PitchVideoCarousel, PITCH_VIDEO_SOURCES } from '@/components/landing/PitchVideoCarousel';
import { PitchScreenshotCarousel } from '@/components/landing/PitchScreenshotCarousel';
import { PitchCoverVisual } from '@/components/landing/PitchCoverVisual';
import { HeroDashboardPreview } from '@/components/landing/HeroDashboardPreview';
import { publicPlatformRoles, publicEcosystemConnections } from '@/data/landingPlatformData';
import { pitchClientSlide, pitchProviderSlide, pitchShelterSlide } from '@/data/pitchClientData';
import { PITCH_PROVIDER_SCREENSHOTS, PITCH_SHELTER_SCREENSHOTS } from '@/data/pitchScreenshotData';
import type { PitchRoleSlideData } from '@/data/pitchClientData';
import { landingGradients } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

/* ── Slide layout helpers ── */

const SlideShell: React.FC<{
  children: React.ReactNode;
  bgClass?: string;
  dark?: boolean;
  className?: string;
}> = ({ children, bgClass = 'bg-gray-950', dark = true, className }) => (
  <div
    className={cn(
      'h-full w-full flex items-center justify-center',
      'px-8 sm:px-12 lg:px-16 xl:px-20',
      'py-8 sm:py-10 pb-24',
      'lg:pl-20',
      bgClass,
      dark ? 'text-white' : 'text-gray-900',
      className,
    )}
  >
    <div className="max-w-7xl w-full min-h-0 flex flex-col justify-center">{children}</div>
  </div>
);

const SlideTitle: React.FC<{ children: React.ReactNode; subtitle?: string; compact?: boolean }> = ({
  children, subtitle, compact,
}) => (
  <div className={cn(compact ? 'mb-4 lg:mb-5' : 'mb-8 lg:mb-10')}>
    <h2 className={cn(
      'font-bold leading-tight mb-2',
      compact ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl',
    )}>
      {children}
    </h2>
    {subtitle && (
      <p className={cn(
        'text-white/70 max-w-3xl',
        compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl',
      )}>
        {subtitle}
      </p>
    )}
  </div>
);

const ModuleGrid: React.FC<{
  modules: { icon: LucideIcon; title: string; description: string; tag?: string }[];
  accent: string;
  compact?: boolean;
  showTags?: boolean;
}> = ({ modules, accent, compact, showTags }) => (
  <div className={cn(
    'grid gap-2 lg:gap-3',
    compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  )}>
    {modules.map((mod) => (
      <div
        key={mod.title}
        className={cn(
          'flex gap-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors',
          compact ? 'p-2.5' : 'p-4 gap-3',
        )}
      >
        <div className={cn(
          'rounded-lg flex items-center justify-center shrink-0',
          compact ? 'w-8 h-8' : 'w-10 h-10',
          accent,
        )}>
          <mod.icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5', accent.includes('mango') || accent.includes('mint') || accent.includes('tropical') ? 'text-gray-900' : 'text-white')} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>{mod.title}</span>
            {mod.tag && (showTags || !compact) && (
              <span className={cn(
                'rounded bg-white/10 text-white/55 font-medium',
                compact ? 'text-[9px] px-1 py-px' : 'text-[10px] px-1.5 py-0.5',
              )}>
                {mod.tag}
              </span>
            )}
          </div>
          {!compact && (
            <p className="text-xs text-white/60 leading-relaxed">{mod.description}</p>
          )}
        </div>
      </div>
    ))}
  </div>
);

const RoleSlideWithVideos: React.FC<{
  role: PitchRoleSlideData;
  icon: React.ReactNode;
  highlightClass: string;
  accentBg: string;
  accentText: string;
  videos?: string[];
  images?: string[];
  showModuleTags?: boolean;
}> = ({
  role,
  icon,
  highlightClass,
  accentBg,
  accentText,
  videos = PITCH_VIDEO_SOURCES,
  images,
  showModuleTags,
}) => (
  <SlideShell bgClass="bg-gray-950">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center h-full">
      <div className="min-w-0">
        <div className="flex items-center gap-4 mb-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', accentBg, accentText)}>
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold">{role.label}</h2>
            <p className="text-sm text-white/60 leading-snug">{role.tagline}</p>
          </div>
        </div>
        <ModuleGrid modules={role.modules} accent={accentBg} compact showTags={showModuleTags} />
        <div className="flex flex-wrap gap-2 mt-4">
          {role.highlights.map((h) => (
            <span key={h} className={cn('flex items-center gap-1.5 text-xs', highlightClass)}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {h}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center lg:justify-end py-2">
        {images?.length ? (
          <PitchScreenshotCarousel images={images} />
        ) : (
          <PitchVideoCarousel videos={videos} />
        )}
      </div>
    </div>
  </SlideShell>
);


const pitchSlides: PitchSlide[] = [
  /* 1 — Portada */
  {
    id: 'cover',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl', landingGradients.primary)}>
                <PawPrint className="w-8 h-8 text-white" />
              </div>
              <Badge className="bg-white/10 text-white border-white/20 text-sm px-3 py-1">
                Pitch Deck 2025
              </Badge>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 leading-[1.05]">
              <span className="text-landing-aqua">
                PetHub
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/80 font-light mb-6">
              El ecosistema que conecta todo el mundo pet
            </p>
            <p className="text-white/60 text-lg max-w-lg">
              Plataforma pet-tech integral para clientes, proveedores y refugios en Latinoamérica.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PitchCoverVisual />
          </div>
        </div>
      </SlideShell>
    ),
  },

  /* 2 — Introducción al ecosistema */
  {
    id: 'intro',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle compact subtitle="Una sola plataforma que unifica salud, comercio y comunidad pet.">
          ¿Qué es PetHub?
        </SlideTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 xl:gap-14 items-center min-h-0">
          <div className="space-y-4 text-white/75 text-base sm:text-lg leading-relaxed lg:pr-4">
            <p>
              PetHub es un <strong className="text-white">ecosistema digital</strong> que conecta a clientes de mascotas,
              proveedores de productos y servicios, y refugios/albergues en una experiencia unificada.
            </p>
            <p>
              A diferencia de apps fragmentadas (solo adopción, solo veterinaria, solo tienda),
              PetHub integra <strong className="text-landing-aqua">trazabilidad 360°</strong>, marketplace,
              adopción, salud y comunidad en un solo lugar.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Salud & Bienestar', 'Marketplace', 'Adopción', 'Comunidad', 'Analytics'].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-white/10 text-xs sm:text-sm text-white/80 border border-white/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center items-center min-h-0 py-2 lg:py-4">
            <HeroDashboardPreview compact />
          </div>
        </div>
      </SlideShell>
    ),
  },

  /* 3 — Tres roles */
  {
    id: 'roles',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle
          compact
          subtitle="Cada perfil accede a una experiencia especializada dentro del mismo ecosistema."
        >
          Tres roles, un ecosistema
        </SlideTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 xl:gap-10 items-start min-h-0">
          {/* Tarjetas de rol */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
            {publicPlatformRoles.map((role) => (
              <div
                key={role.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center hover:bg-white/10 transition-all"
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg',
                  role.gradient,
                  role.colorText,
                )}>
                  {role.id === 'client' && <PawPrint className="w-6 h-6" />}
                  {role.id === 'provider' && <Store className="w-6 h-6" />}
                  {role.id === 'shelter' && <Home className="w-6 h-6" />}
                </div>
                <h3 className="text-base font-bold mb-1">{role.label}</h3>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{role.tagline}</p>
              </div>
            ))}
          </div>

          {/* Conexiones del ecosistema */}
          <div className="flex flex-col justify-center min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-landing-mango/70 mb-3">
              Conexiones en vivo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              {publicEcosystemConnections.map((conn, i) => {
                const fromRole = publicPlatformRoles.find((r) => r.id === conn.from);
                const toRole = publicPlatformRoles.find((r) => r.id === conn.to);
                return (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', fromRole?.gradient, fromRole?.colorText)}>
                        {fromRole?.shortLabel}
                      </span>
                      <span className="text-landing-aqua text-xs">→</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', toRole?.gradient, toRole?.colorText)}>
                        {toRole?.shortLabel}
                      </span>
                    </div>
                    <span className="text-xs text-white/55 leading-snug">{conn.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SlideShell>
    ),
  },

  /* 4 — Rol Cliente */
  {
    id: 'client',
    content: (
      <RoleSlideWithVideos
        role={pitchClientSlide}
        icon={<PawPrint className="w-6 h-6 text-white" />}
        highlightClass="text-landing-aqua"
        accentBg="bg-landing-aqua"
        accentText="text-white"
        showModuleTags
      />
    ),
  },

  /* 5 — Rol Proveedor */
  {
    id: 'provider',
    content: (
      <RoleSlideWithVideos
        role={pitchProviderSlide}
        icon={<Store className="w-6 h-6 text-white" />}
        highlightClass="text-landing-mango"
        accentBg="bg-landing-mango"
        accentText="text-gray-900"
        images={PITCH_PROVIDER_SCREENSHOTS}
        showModuleTags
      />
    ),
  },

  /* 6 — Rol Albergue */
  {
    id: 'shelter',
    content: (
      <RoleSlideWithVideos
        role={pitchShelterSlide}
        icon={<Home className="w-6 h-6 text-white" />}
        highlightClass="text-landing-mint"
        accentBg="bg-landing-mint"
        accentText="text-gray-900"
        images={PITCH_SHELTER_SCREENSHOTS}
        showModuleTags
      />
    ),
  },

  /* 7 — Valor día a día */
  {
    id: 'daily-value',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle subtitle="PetHub resuelve problemas reales cada día para cada actor del ecosistema.">
          Impacto en el día a día
        </SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: PawPrint,
              role: 'Cliente de mascota',
              color: 'bg-landing-aqua',
              iconText: 'text-white',
              items: [
                'Recordatorios automáticos de comida, vacunas y citas',
                'Historial médico y nutricional en un solo lugar',
                'Comprar productos y agendar servicios sin salir de la app',
                'Adoptar, reportar mascotas perdidas y conectar con la comunidad',
              ],
            },
            {
              icon: Store,
              role: 'Proveedor',
              color: 'bg-landing-mango',
              iconText: 'text-gray-900',
              items: [
                'Catálogo digital con gestión de stock y precios',
                'Calendario de citas y reservas automatizado',
                'Panel de ingresos, analytics y reputación en tiempo real',
                'Acceso directo a clientes del ecosistema PetHub',
              ],
            },
            {
              icon: Home,
              role: 'Refugio / Albergue',
              color: 'bg-landing-mint',
              iconText: 'text-gray-900',
              items: [
                'Publicar mascotas en adopción con perfiles detallados',
                'Gestionar solicitudes y dar seguimiento post-adopción',
                'Chat directo con adoptantes interesados',
                'Estadísticas de impacto y adopciones exitosas',
              ],
            },
          ].map((block) => (
            <div key={block.role} className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', block.color, block.iconText)}>
                <block.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg mb-3">{block.role}</h3>
              <ul className="space-y-2">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-white/70">
                    <Zap className="w-4 h-4 text-landing-tropical shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },

  /* 8 — Beneficios */
  {
    id: 'benefits',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle subtitle="Ventajas competitivas que posicionan a PetHub como líder regional.">
          Beneficios clave
        </SlideTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Target, title: 'Todo en uno', desc: 'Salud, marketplace, adopción y comunidad integrados — sin apps fragmentadas.' },
            { icon: Shield, title: 'Trazabilidad 360°', desc: 'Historial completo por mascota: nutrición, ejercicio, veterinaria y recordatorios.' },
            { icon: Users, title: 'Red conectada', desc: 'Clientes, proveedores y refugios interactúan en un ecosistema real, no aislado.' },
            { icon: BarChart3, title: 'Datos accionables', desc: 'Analytics para clientes, proveedores y refugios con métricas de negocio e impacto.' },
            { icon: Zap, title: 'Time-to-value rápido', desc: 'Registro por rol y onboarding guiado — operativo en minutos, no semanas.' },
            { icon: TrendingUp, title: 'Escalable regional', desc: 'Arquitectura SaaS multi-rol lista para expansión en Centroamérica y LATAM.' },
          ].map((b) => (
            <div key={b.title} className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-landing-aqua/30 transition-colors">
              <b.icon className="w-8 h-8 text-landing-aqua mb-3" />
              <h3 className="font-bold mb-1">{b.title}</h3>
              <p className="text-sm text-white/60">{b.desc}</p>
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },

  /* 9 — Modelo de negocio */
  {
    id: 'business-model',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle
          compact
          subtitle="Plataforma 100% gratuita para clientes, proveedores y refugios. Los ingresos vienen del marketplace, la logística y servicios B2B."
        >
          Modelo de negocio
        </SlideTitle>

        <div className="mb-4 lg:mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-landing-mint/15 border border-landing-mint/30 text-landing-mint text-xs sm:text-sm font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Sin suscripciones — acceso gratuito para todos los usuarios
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <div className="space-y-3">
            {[
              {
                title: 'Comisión marketplace',
                desc: 'Fee del 3–5% sobre cada venta de productos y servicios realizada en la plataforma.',
                pct: '45%',
                accent: 'text-landing-aqua',
              },
              {
                title: 'Cuota de delivery',
                desc: '~Q15 por entrega. Pedidos del día anterior se consolidan en una sola ruta al día siguiente.',
                pct: '35%',
                accent: 'text-landing-mango',
              },
              {
                title: 'Publicidad y destacados',
                desc: 'Anuncios segmentados y posiciones destacadas en el marketplace para proveedores y marcas.',
                pct: '12%',
                accent: 'text-landing-mint',
              },
              {
                title: 'Partnerships B2B',
                desc: 'Alianzas con veterinarias, marcas pet, refugios institucionales y distribuidores.',
                pct: '8%',
                accent: 'text-landing-tropical',
              },
            ].map((stream) => (
              <div key={stream.title} className="flex gap-3 p-3 lg:p-4 rounded-xl bg-white/5 border border-white/10">
                <div className={cn('text-xl lg:text-2xl font-bold w-12 shrink-0 tabular-nums', stream.accent)}>
                  {stream.pct}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm lg:text-base">{stream.title}</h3>
                  <p className="text-xs lg:text-sm text-white/60 leading-relaxed mt-0.5">{stream.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-4 lg:p-5 rounded-2xl bg-landing-aqua/20 border border-white/10">
              <DollarSign className="w-8 h-8 text-landing-mango mb-3" />
              <h3 className="text-lg lg:text-xl font-bold mb-3">Unit Economics</h3>
              <div className="space-y-2.5 text-white/80 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Comisión por venta</span>
                  <span className="font-semibold text-landing-aqua">3–5%</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Cuota de delivery</span>
                  <span className="font-semibold text-landing-mango">~Q15</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Modelo logístico</span>
                  <span className="font-semibold text-right text-xs sm:text-sm">Ruta única D+1</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo para el usuario</span>
                  <span className="font-bold text-landing-mint">Q0 — Gratis</span>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-5 rounded-2xl bg-white/5 border border-white/10">
              <Truck className="w-7 h-7 text-landing-aqua mb-2" />
              <h3 className="font-bold text-sm lg:text-base mb-2">Logística consolidada</h3>
              <p className="text-xs lg:text-sm text-white/60 leading-relaxed">
                Cada día se recogen todos los pedidos del día anterior y se entregan en una sola ruta optimizada.
                Esto reduce costos operativos y hace rentable la cuota fija de ~Q15 por entrega.
              </p>
            </div>
          </div>
        </div>
      </SlideShell>
    ),
  },

  /* 10 — Costos */
  {
    id: 'costs',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle
          compact
          subtitle="MVP desarrollado por el fundador. La inversión principal es operativa: logística y arranque comercial."
        >
          Inversión y costos
        </SlideTitle>

        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-landing-aqua/15 border border-landing-aqua/30 text-landing-aqua text-xs sm:text-sm font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Plataforma ya construida — inversión enfocada en operación
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <div>
            <h3 className="text-base lg:text-lg font-bold mb-3 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-landing-aqua" />
              Inversión inicial
            </h3>
            <div className="space-y-2">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-2">Ya invertido (fundador)</p>
              {[
                { item: 'Desarrollo plataforma (Cursor)', amount: '~$300 USD' },
                { item: 'Producto funcional en producción', amount: '✓' },
              ].map((row) => (
                <div key={row.item} className="flex justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/8">
                  <span className="text-white/70 text-sm">{row.item}</span>
                  <span className="font-semibold text-sm text-landing-mint">{row.amount}</span>
                </div>
              ))}

              <p className="text-xs text-white/50 uppercase tracking-wide mb-2 mt-4">Inversión requerida</p>
              {[
                {
                  item: 'Van usada (delivery + transporte a citas)',
                  amount: 'Q50,000',
                  note: 'Entrega de productos y traslado de mascotas a servicios',
                },
              ].map((row) => (
                <div key={row.item} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between mb-1">
                    <span className="text-white/80 text-sm font-medium">{row.item}</span>
                    <span className="font-bold text-landing-mango">{row.amount}</span>
                  </div>
                  <p className="text-xs text-white/50">{row.note}</p>
                </div>
              ))}

              <div className="flex justify-between p-3 lg:p-4 rounded-xl bg-landing-aqua/20 border border-landing-aqua/30 font-bold mt-2">
                <span className="text-sm lg:text-base">Capital a levantar</span>
                <span className="text-landing-aqua text-lg">Q50,000</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base lg:text-lg font-bold mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-landing-mango" />
              Costos mensuales (operación)
            </h3>
            <div className="space-y-2">
              {[
                { item: 'Gasolina — ruta delivery (D+1)', amount: 'Q5,000' },
                { item: 'Repartidor / delivery guy', amount: 'Q4,000' },
                { item: 'Marketing (1 persona)', amount: 'Q6,000' },
                { item: 'Contingencia', amount: 'Q1,500' },
              ].map((row) => (
                <div key={row.item} className="flex justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-white/75 text-xs sm:text-sm">{row.item}</span>
                  <span className="font-semibold text-sm tabular-nums">{row.amount}</span>
                </div>
              ))}
              <div className="flex justify-between p-3 lg:p-4 rounded-xl bg-white/10 border border-white/20 font-bold">
                <span className="text-sm lg:text-base">Burn rate mensual</span>
                <span className="text-landing-mango text-lg">Q16,500</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 mt-2">
                <div className="flex items-start gap-2">
                  <Truck className="w-5 h-5 text-landing-aqua shrink-0 mt-0.5" />
                  <p className="text-xs text-white/55 leading-relaxed">
                    Un solo vehículo cubre la ruta diaria de entregas y el traslado de mascotas
                    a citas de servicios agendadas en la plataforma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SlideShell>
    ),
  },

  /* 11 — Proyecciones financieras */
  {
    id: 'projections',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <SlideTitle
          compact
          subtitle="Escenarios para cubrir el burn de Q16,500/mes con comisión (3–5%) + delivery (~Q15/pedido)."
        >
          Proyecciones y break-even
        </SlideTitle>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Burn mensual', value: 'Q16,500', sub: 'Costo operativo fijo' },
            { label: 'Break-even', value: '~24 pedidos/día', sub: 'Ticket prom. Q200 · comisión 4%' },
            { label: 'Ingreso por pedido', value: '~Q23', sub: 'Q8 comisión + Q15 delivery' },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[10px] text-white/50 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-lg lg:text-xl font-bold text-landing-aqua tabular-nums">{kpi.value}</p>
              <p className="text-[10px] text-white/40">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] mb-3">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/15 bg-white/5">
                <th className="py-2 px-2 lg:px-3 text-white/60 font-medium text-[10px] uppercase">Escenario</th>
                <th className="py-2 px-2 text-center text-white/60 text-[10px] uppercase">Pedidos/día</th>
                <th className="py-2 px-2 text-center text-white/60 text-[10px] uppercase">Ticket prom.</th>
                <th className="py-2 px-2 text-center text-landing-aqua text-[10px] uppercase">Comisión 4%</th>
                <th className="py-2 px-2 text-center text-landing-mango text-[10px] uppercase">Delivery</th>
                <th className="py-2 px-2 text-center text-white/60 text-[10px] uppercase">Ingresos/mes</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase">Margen</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {[
                {
                  name: 'Arranque',
                  ordersDay: '15',
                  ticket: 'Q150',
                  commission: 'Q2,700',
                  delivery: 'Q6,750',
                  revenue: 'Q9,450',
                  margin: '-Q7,050',
                  marginClass: 'text-red-400',
                },
                {
                  name: 'Break-even',
                  ordersDay: '24',
                  ticket: 'Q200',
                  commission: 'Q5,760',
                  delivery: 'Q10,800',
                  revenue: 'Q16,560',
                  margin: '~Q0',
                  marginClass: 'text-landing-tropical',
                },
                {
                  name: 'Base',
                  ordersDay: '40',
                  ticket: 'Q250',
                  commission: 'Q12,000',
                  delivery: 'Q18,000',
                  revenue: 'Q30,000',
                  margin: '+Q13,500',
                  marginClass: 'text-landing-mint',
                },
                {
                  name: 'Objetivo',
                  ordersDay: '55',
                  ticket: 'Q300',
                  commission: 'Q19,800',
                  delivery: 'Q24,750',
                  revenue: 'Q44,550',
                  margin: '+Q28,050',
                  marginClass: 'text-landing-aqua',
                },
              ].map((row) => (
                <tr key={row.name} className="border-b border-white/8 last:border-0">
                  <td className="py-2 px-2 lg:px-3 font-semibold text-white/90">{row.name}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.ordersDay}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.ticket}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.commission}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.delivery}</td>
                  <td className="py-2 px-2 text-center tabular-nums font-medium">{row.revenue}</td>
                  <td className={cn('py-2 px-2 text-center tabular-nums font-semibold', row.marginClass)}>
                    {row.margin}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] sm:text-xs text-white/45 leading-relaxed">
          Cálculo mensual (30 días): ingreso = (pedidos/día × ticket × 4%) + (pedidos/día × Q15 delivery).
          Con comisión al 3% el break-even sube a ~26 pedidos/día; al 5% baja a ~22 pedidos/día (ticket Q200).
          Servicios agendados sin delivery suman solo comisión y mejoran el margen.
        </p>
      </SlideShell>
    ),
  },

  /* 12 — Cierre */
  {
    id: 'closing',
    content: (
      <SlideShell bgClass="bg-gray-950">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center max-w-6xl mx-auto py-2">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="w-14 h-14 rounded-2xl bg-landing-aqua flex items-center justify-center mb-4 shadow-lg shadow-landing-aqua/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              El futuro del cuidado pet{' '}
              <span className="text-landing-mango">
                empieza hoy
              </span>
            </h2>

            <p className="text-sm sm:text-base text-white/70 mb-5 leading-relaxed max-w-md">
              PetHub es la infraestructura digital que conecta clientes, proveedores y refugios
              en un solo ecosistema pet. Estamos listos para escalar en Latinoamérica.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
              {['Producto funcional', '3 roles integrados', 'Mercado en crecimiento', 'Modelo escalable'].map((item) => (
                <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs">
                  <Heart className="w-3.5 h-3.5 text-landing-mango shrink-0" />
                  {item}
                </span>
              ))}
            </div>

            <div className="w-full p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-lg sm:text-xl font-semibold text-white/90 mb-1">¡Gracias por su tiempo!</p>
              <p className="text-sm text-white/60 leading-relaxed">
                Conversemos sobre inversión, partnerships y el futuro de PetHub.
              </p>
              <p className="mt-2 text-landing-aqua font-medium text-sm">contacto@pethub.gt · pethub.gt</p>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -inset-4 bg-landing-aqua/20 rounded-3xl blur-2xl opacity-70" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl ring-1 ring-white/10 max-w-md w-full">
              <img
                src="/pethub-staff.png"
                alt="Equipo PetHub con camisas de la marca"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-black/60 pointer-events-none" />
              <p className="absolute bottom-3 left-4 text-xs font-medium text-white/80">El equipo detrás de PetHub</p>
            </div>
          </div>
        </div>
      </SlideShell>
    ),
  },
];

export const Pitch: React.FC = () => (
  <PitchSlideDeck slides={pitchSlides} />
);
