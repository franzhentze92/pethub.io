import React, { useMemo } from 'react';
import {
  Activity,
  Bell,
  Bone,
  Footprints,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Package,
  PawPrint,
  ShoppingBag,
  Stethoscope,
  Store,
  Syringe,
  Utensils,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const HUB_CENTER = { x: 50, y: 50 };
const ICON_RADIUS = 45;
const LABEL_RADIUS = 52;
/** Radio del “cuerpo” desde donde salen los tentáculos */
const BODY_RADIUS = 15;

function tentaclePath(
  endX: number,
  endY: number,
  wiggle: number,
): string {
  const cx = HUB_CENTER.x;
  const cy = HUB_CENTER.y;
  const dx = endX - cx;
  const dy = endY - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const sx = cx + ux * BODY_RADIUS;
  const sy = cy + uy * BODY_RADIUS;

  const c1x = cx + dx * 0.28 + nx * wiggle;
  const c1y = cy + dy * 0.28 + ny * wiggle;
  const c2x = cx + dx * 0.68 - nx * wiggle * 0.45;
  const c2y = cy + dy * 0.68 - ny * wiggle * 0.45;

  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}`;
}

/** Puntos “ventosas” a lo largo del brazo */
function suckerPoints(angleDeg: number, radii: number[]) {
  return radii.map((r) => polarToPercent(angleDeg, r));
}

type HubNode = {
  id: string;
  label: string;
  Icon: LucideIcon;
  angle: number;
  accent?: string;
};

/** 16 módulos — cada 22.5° para que no se peguen las etiquetas */
const ORBIT_NODES: HubNode[] = [
  { id: 'nutrition', label: 'Nutrición', Icon: Utensils, angle: -90, accent: 'from-landing-mango/35 to-landing-tropical/25' },
  { id: 'vaccines', label: 'Vacunas', Icon: Syringe, angle: -67.5, accent: 'from-landing-mint/30 to-landing-aqua/20' },
  { id: 'vet', label: 'Veterinaria', Icon: Stethoscope, angle: -45, accent: 'from-landing-aqua/35 to-landing-mint/25' },
  { id: 'petroom', label: 'Pet Room', Icon: PawPrint, angle: -22.5, accent: 'from-landing-aqua/30 to-landing-mango/20' },
  { id: 'exercise', label: 'Ejercicio', Icon: Activity, angle: 0, accent: 'from-landing-mint/35 to-landing-aqua/25' },
  { id: 'trace', label: 'Trazabilidad', Icon: Footprints, angle: 22.5, accent: 'from-landing-mint/30 to-landing-tropical/20' },
  { id: 'adoption', label: 'Adopción', Icon: Heart, angle: 45, accent: 'from-pink-400/30 to-landing-mango/25' },
  { id: 'parejas', label: 'Parejas', Icon: Users, angle: 67.5, accent: 'from-landing-mint/30 to-landing-aqua/20' },
  { id: 'market', label: 'Marketplace', Icon: ShoppingBag, angle: 90, accent: 'from-landing-mango/35 to-landing-tropical/25' },
  { id: 'orders', label: 'Órdenes', Icon: Package, angle: 112.5, accent: 'from-landing-aqua/25 to-landing-mint/20' },
  { id: 'reminders', label: 'Alertas', Icon: Bell, angle: 135, accent: 'from-landing-aqua/30 to-landing-mint/20' },
  { id: 'journey', label: 'Pet Journey', Icon: PawPrint, angle: 157.5, accent: 'from-landing-aqua/35 to-landing-mango/25' },
  { id: 'shelter', label: 'Refugios', Icon: Home, angle: 180, accent: 'from-violet-400/25 to-landing-aqua/20' },
  { id: 'lost', label: 'Perdidas', Icon: MapPin, angle: 202.5, accent: 'from-orange-400/25 to-landing-mango/20' },
  { id: 'petbot', label: 'PetBot', Icon: MessageCircle, angle: 225, accent: 'from-landing-mango/30 to-landing-tropical/20' },
  { id: 'stores', label: 'Tiendas', Icon: Store, angle: 247.5, accent: 'from-landing-mango/25 to-landing-aqua/15' },
];

const RING_LABELS = [
  { label: 'Cuidado', angle: -90, radius: 58 },
  { label: 'Paseos', angle: 0, radius: 58 },
  { label: 'Tienda', angle: 90, radius: 58 },
  { label: 'Comunidad', angle: 180, radius: 58 },
];

const FLOAT_BADGES = [
  { label: '🐾 Gestión pet', className: 'border-landing-mango/50 bg-landing-mango/15 text-landing-tropical', style: { top: '5%', left: '4%' } },
  { label: 'Salud · Paseos · Comidas', className: 'border-landing-mint/50 bg-landing-mint/12 text-landing-mint', style: { top: '8%', right: '3%' } },
  { label: 'Dueño · Proveedor · Refugio', className: 'border-landing-aqua/40 bg-landing-aqua/10 text-landing-aqua', style: { bottom: '6%', left: '3%' } },
  { label: 'Latinoamérica', className: 'border-white/25 bg-white/8 text-white/85', style: { bottom: '9%', right: '4%' } },
] as const;

const AMBIENT_PAWS = [
  { left: '12%', top: '18%', size: 14, rotate: -20, opacity: 0.12 },
  { left: '82%', top: '28%', size: 18, rotate: 15, opacity: 0.1 },
  { left: '18%', top: '78%', size: 16, rotate: 35, opacity: 0.11 },
  { left: '78%', top: '72%', size: 12, rotate: -10, opacity: 0.09 },
];

function polarToPercent(angleDeg: number, radiusPct: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: HUB_CENTER.x + radiusPct * Math.cos(rad),
    top: HUB_CENTER.y + radiusPct * Math.sin(rad),
  };
}

const WaveBars: React.FC = () => (
  <div className="flex items-end gap-[3px] h-4" aria-hidden>
    {[5, 9, 12, 8, 11].map((h, i) => (
      <span
        key={i}
        className="w-[3px] rounded-full bg-gradient-to-t from-landing-mango to-landing-tropical animate-pulse"
        style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
      />
    ))}
  </div>
);

const MiniDogSvg: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 64 40" className={className} style={style} fill="none" aria-hidden>
    <ellipse cx="28" cy="22" rx="18" ry="10" fill="#FFB703" opacity="0.9" />
    <circle cx="44" cy="16" r="9" fill="#FFB703" />
    <ellipse cx="51" cy="17" rx="5" ry="4" fill="#E6A503" />
    <circle cx="46" cy="14" r="1.5" fill="#374151" />
    <ellipse cx="38" cy="8" rx="4" ry="6" fill="#E6A503" transform="rotate(-12 38 8)" />
    <path d="M36 24 Q44 27 50 24" stroke="#00F0C8" strokeWidth="2" strokeLinecap="round" />
    <circle cx="43" cy="26" r="2" fill="#00F0C8" />
  </svg>
);

const MiniCatSvg: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 56 36" className={className} style={style} fill="none" aria-hidden>
    <ellipse cx="26" cy="20" rx="16" ry="9" fill="#38F9A0" opacity="0.9" />
    <circle cx="40" cy="15" r="8" fill="#38F9A0" />
    <polygon points="34,5 37,12 31,11" fill="#2DD98A" />
    <polygon points="44,5 47,11 41,12" fill="#2DD98A" />
    <ellipse cx="37" cy="14" rx="1.5" ry="2" fill="#374151" />
    <ellipse cx="43" cy="14" rx="1.5" ry="2" fill="#374151" />
  </svg>
);

export const HeroVisual: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const layout = useMemo(
    () =>
      ORBIT_NODES.map((node, index) => ({
        ...node,
        iconPos: polarToPercent(node.angle, ICON_RADIUS),
        labelPos: polarToPercent(node.angle, LABEL_RADIUS),
        wiggle: (index % 2 === 0 ? 1 : -1) * (4 + (index % 5) * 1.2),
        tentaclePath: '',
        suckers: suckerPoints(node.angle, [24, 33, 40]),
      })).map((node) => ({
        ...node,
        tentaclePath: tentaclePath(node.iconPos.left, node.iconPos.top, node.wiggle),
      })),
    [],
  );

  return (
    <div className={cn(
      'relative w-full mx-auto',
      compact ? 'max-w-[min(360px,42vw)]' : 'max-w-2xl lg:max-w-none lg:ml-auto',
    )}>
      <div
        className={cn(
          'absolute rounded-[2.5rem] bg-gradient-to-br from-landing-mango/20 via-landing-aqua/20 to-landing-mint/15 blur-3xl opacity-80',
          compact ? '-inset-4' : '-inset-6',
        )}
        aria-hidden
      />

      <div
        className={cn(
          'relative w-full aspect-square rounded-[1.85rem] border border-landing-mango/15 bg-gradient-to-br from-[#12100e] via-[#0d1218] to-[#0a100d] shadow-[0_28px_90px_-12px_rgba(255,183,3,0.15),0_0_60px_-20px_rgba(0,240,200,0.2)] overflow-hidden',
          compact ? 'max-h-[min(380px,46vh)]' : 'max-h-[min(580px,92vw)]',
        )}
        role="img"
        aria-label="Centro de gestión pet PetHub con módulos de salud, adopción y marketplace"
      >
        {AMBIENT_PAWS.map((paw, i) => (
          <PawPrint
            key={i}
            className="absolute text-landing-mango pointer-events-none"
            style={{
              left: paw.left,
              top: paw.top,
              width: paw.size,
              height: paw.size,
              transform: `rotate(${paw.rotate}deg)`,
              opacity: paw.opacity,
            }}
            strokeWidth={1.5}
            aria-hidden
          />
        ))}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[55%] rounded-full bg-landing-mango/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-landing-aqua/10 blur-2xl animate-pulse-glow" />

        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,183,3,0.08) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {FLOAT_BADGES.filter((badge) => !compact || !('bottom' in badge.style)).map((badge) => (
          <div
            key={badge.label}
            className={cn(
              'absolute z-40 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold border backdrop-blur-md animate-drift max-w-[42%] truncate',
              badge.className,
            )}
            style={badge.style}
          >
            {badge.label}
          </div>
        ))}

        <div className="absolute top-3 right-3 z-40 flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-[#12100e]/90 border border-landing-mango/25 backdrop-blur-md shadow-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-landing-mango/30 to-landing-tropical/20 flex items-center justify-center border border-landing-mango/30">
            <span className="text-base leading-none" aria-hidden>🐶</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold text-white leading-none">PetBot</p>
            <p className="text-[8px] text-landing-mango/80">Tu asistente pet</p>
          </div>
          <WaveBars />
        </div>

        <MiniDogSvg className="absolute bottom-5 left-5 w-14 h-9 opacity-40 animate-float" style={{ animationDuration: '5s' }} />
        <MiniCatSvg className="absolute bottom-6 right-16 w-12 h-8 opacity-35 animate-float" style={{ animationDelay: '1s', animationDuration: '6s' }} />

        <div className="absolute inset-[9%] sm:inset-[8%]">
          <div className="relative w-full h-full">
            {[58, 72, 86, 100].map((size, i) => (
              <div
                key={size}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed pointer-events-none"
                style={{
                  width: `${size}%`,
                  height: `${size}%`,
                  borderColor: i % 2 === 0 ? 'rgba(255,183,3,0.15)' : 'rgba(0,240,200,0.12)',
                  animation: `spin ${42 + i * 8}s linear infinite ${i % 2 === 1 ? 'reverse' : 'normal'}`,
                }}
                aria-hidden
              />
            ))}

            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-landing-mango/20 pointer-events-none"
              style={{ width: '30%', height: '30%' }}
              aria-hidden
            />

            {/* Tentáculos — brazos orgánicos desde la tarjeta central a cada módulo */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
              <defs>
                <radialGradient id="mantleGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFB703" stopOpacity="0.35" />
                  <stop offset="55%" stopColor="#00F0C8" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#00F0C8" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="tentacleGrad" x1="50%" y1="50%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFB703" stopOpacity="0.85" />
                  <stop offset="45%" stopColor="#38F9A0" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#00F0C8" stopOpacity="0.35" />
                </linearGradient>
                <filter id="tentacleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.45" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Cuerpo / manto del pulpo */}
              <ellipse cx="50" cy="50" rx="17" ry="15.5" fill="url(#mantleGrad)" className="animate-pulse" style={{ animationDuration: '4s' }} />
              <ellipse cx="50" cy="50" rx="14" ry="12.5" fill="none" stroke="#FFB703" strokeOpacity="0.2" strokeWidth="0.4" />

              {layout.map((node, index) => (
                <g key={`tentacle-${node.id}`}>
                  {/* Glow grueso */}
                  <path
                    d={node.tentaclePath}
                    fill="none"
                    stroke="url(#tentacleGrad)"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                    opacity="0.18"
                    filter="url(#tentacleGlow)"
                  />
                  {/* Brazo principal */}
                  <path
                    d={node.tentaclePath}
                    fill="none"
                    stroke="url(#tentacleGrad)"
                    strokeWidth="0.32"
                    strokeLinecap="round"
                    strokeDasharray="1.2 1.8"
                    opacity="0.72"
                    className="hero-tentacle-flow"
                    style={{ animationDelay: `${index * 0.15}s`, animationDuration: `${2.6 + (index % 6) * 0.25}s` }}
                  />
                  {/* Ventosas */}
                  {node.suckers.map((s, si) => (
                    <circle
                      key={si}
                      cx={s.left}
                      cy={s.top}
                      r={0.55 - si * 0.08}
                      fill="#FFB703"
                      fillOpacity={0.25 - si * 0.05}
                      stroke="#00F0C8"
                      strokeWidth="0.08"
                      strokeOpacity="0.35"
                    />
                  ))}
                  {/* Pulso de datos recorriendo el brazo */}
                  <circle r="0.45" fill="#38F9A0" opacity="0.95">
                    <animateMotion
                      dur={`${2.2 + (index % 5) * 0.35}s`}
                      repeatCount="indefinite"
                      path={node.tentaclePath}
                    />
                  </circle>
                </g>
              ))}
            </svg>

            {RING_LABELS.map(({ label, angle, radius }) => {
              const pos = polarToPercent(angle, radius);
              return (
                <div
                  key={label}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-widest text-landing-mango/30 pointer-events-none z-[6]"
                  style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                >
                  {label}
                </div>
              );
            })}

            {/* Iconos — z-10, conectados visualmente al extremo del tentáculo */}
            {layout.map((node, index) => {
              const Icon = node.Icon;
              return (
                <div
                  key={`icon-${node.id}`}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${node.iconPos.left}%`, top: `${node.iconPos.top}%` }}
                >
                  {/* Punto de conexión del tentáculo */}
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-landing-aqua/40 blur-[1px] animate-pulse"
                    aria-hidden
                  />
                  <div
                    className={cn(
                      'relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-md transition-all duration-300',
                      'border border-landing-mango/20 bg-[#1a1510]/85',
                      'group-hover:border-landing-mango/50 group-hover:shadow-[0_0_16px_rgba(255,183,3,0.25)] animate-float',
                    )}
                    style={{ animationDelay: `${index * 0.2}s`, animationDuration: '4.8s' }}
                  >
                    {node.accent && (
                      <div className={cn('absolute inset-0 rounded-xl bg-gradient-to-br opacity-50', node.accent)} />
                    )}
                    <Icon className="relative z-10 w-3.5 h-3.5 sm:w-4 sm:h-4 text-landing-aqua" strokeWidth={2} />
                  </div>
                </div>
              );
            })}

            {/* Etiquetas — en anillo exterior, separadas del icono */}
            {layout.map((node) => (
              <div
                key={`label-${node.id}`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${node.labelPos.left}%`, top: `${node.labelPos.top}%` }}
              >
                <span className="text-[7px] sm:text-[8px] font-semibold text-white/70 whitespace-nowrap px-1.5 py-px rounded-full bg-[#1a1510]/95 border border-landing-mango/12 shadow-sm">
                  {node.label}
                </span>
              </div>
            ))}

            {/* Tarjeta central = cuerpo del pulpo */}
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <div className="relative w-[32%] min-w-[124px] max-w-[190px] pointer-events-auto animate-float-slow">
                {/* Raíces de tentáculos visibles bajo la tarjeta */}
                <div
                  className="absolute -inset-3 rounded-full bg-gradient-to-br from-landing-mango/20 via-landing-aqua/10 to-landing-mint/15 blur-md -z-10 animate-pulse"
                  style={{ animationDuration: '3.5s' }}
                  aria-hidden
                />
                <div className="rounded-2xl border-2 border-landing-mango/40 bg-[#14110e]/95 backdrop-blur-xl shadow-[0_0_50px_rgba(255,183,3,0.18),0_0_80px_rgba(0,240,200,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden ring-2 ring-landing-aqua/10">
                  <div className="h-1 w-full bg-gradient-to-r from-landing-mango via-landing-aqua to-landing-mint" />
                  <div className="p-2.5 sm:p-3">
                    <div className="flex flex-col items-center text-center mb-2">
                      <div className="relative mb-1.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-landing-mango to-landing-tropical flex items-center justify-center border-2 border-white/15 shadow-lg shadow-landing-mango/20">
                          <PawPrint className="w-5 h-5 text-[#1a1008]" strokeWidth={2.5} />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none" aria-hidden>🐾</span>
                      </div>
                      <p className="text-[8px] uppercase tracking-[0.15em] text-landing-mango font-bold">PetHub</p>
                      <h3 className="text-[11px] sm:text-xs font-bold text-white leading-tight mt-0.5">
                        Tu mascota, al centro
                      </h3>
                      <p className="text-[8px] text-white/45 mt-0.5 leading-snug">Salud · paseos · adopción · tienda</p>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {['Dueño', 'Proveedor', 'Refugio'].map((r) => (
                        <span
                          key={r}
                          className="flex-1 text-center text-[7px] sm:text-[8px] font-semibold py-0.5 rounded bg-landing-mango/10 border border-landing-mango/20 text-landing-tropical/90 truncate"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <div className="mb-1.5">
                      <div className="flex justify-between text-[7px] sm:text-[8px] text-white/40 mb-0.5">
                        <span>Módulos pet</span>
                        <span className="text-landing-mint font-bold">{ORBIT_NODES.length}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-landing-mango to-landing-aqua" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      {[
                        { emoji: '🩺', label: 'Salud' },
                        { emoji: '🛒', label: 'Tienda' },
                        { emoji: '❤️', label: 'Adopción' },
                        { emoji: '🏠', label: 'Refugio' },
                      ].map(({ emoji, label }) => (
                        <span
                          key={label}
                          className="text-[7px] sm:text-[8px] font-medium text-center py-0.5 rounded bg-white/[0.04] border border-white/10 text-white/55 flex items-center justify-center gap-0.5"
                        >
                          <span aria-hidden>{emoji}</span> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Bone className="absolute top-[14%] left-[6%] w-5 h-5 text-landing-mango/25 rotate-45 animate-drift pointer-events-none" aria-hidden />
      </div>

      <style>{`
        @keyframes hero-tentacle-flow {
          to { stroke-dashoffset: -12; }
        }
        .hero-tentacle-flow {
          animation: hero-tentacle-flow 2.8s linear infinite;
        }
      `}</style>
    </div>
  );
};
