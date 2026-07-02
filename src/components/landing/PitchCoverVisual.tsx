import React from 'react';
import {
  PawPrint, Heart, Store, Home, ShoppingBag, Stethoscope,
  Utensils, Activity, Users, Bell, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  {
    id: 'client',
    label: 'Dueño',
    sub: 'Cuidado & vida pet',
    Icon: PawPrint,
    angle: -90,
    radius: 38,
    gradient: 'from-landing-aqua to-landing-mint',
    glow: 'shadow-landing-aqua/30',
  },
  {
    id: 'provider',
    label: 'Proveedor',
    sub: 'Negocio & ventas',
    Icon: Store,
    angle: 30,
    radius: 38,
    gradient: 'from-landing-mango to-landing-tropical',
    glow: 'shadow-landing-mango/30',
  },
  {
    id: 'shelter',
    label: 'Refugio',
    sub: 'Adopción & impacto',
    Icon: Home,
    angle: 150,
    radius: 38,
    gradient: 'from-landing-mint to-landing-aqua',
    glow: 'shadow-landing-mint/30',
  },
] as const;

const ORBIT_MODULES = [
  { Icon: Stethoscope, angle: 0 },
  { Icon: Utensils, angle: 40 },
  { Icon: Activity, angle: 80 },
  { Icon: ShoppingBag, angle: 120 },
  { Icon: Heart, angle: 160 },
  { Icon: Users, angle: 200 },
  { Icon: Bell, angle: 240 },
  { Icon: Package, angle: 280 },
];

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
  };
}

function arcPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const cx = 50 + (mx - 50) * 0.35;
  const cy = 50 + (my - 50) * 0.35;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

const FLOAT_TAGS = [
  { text: '16+ módulos', style: { top: '6%', left: '5%' }, color: 'border-landing-aqua/40 bg-landing-aqua/10 text-landing-aqua' },
  { text: 'Pet-tech LATAM', style: { top: '10%', right: '4%' }, color: 'border-landing-mango/40 bg-landing-mango/10 text-landing-mango' },
  { text: 'Salud · Tienda · Adopción', style: { bottom: '8%', left: '4%' }, color: 'border-landing-mint/40 bg-landing-mint/10 text-landing-mint' },
] as const;

export const PitchCoverVisual: React.FC = () => (
  <div className="relative w-full max-w-lg mx-auto lg:max-w-none lg:ml-auto">
    <div
      className="absolute -inset-8 rounded-full bg-gradient-to-br from-landing-aqua/25 via-landing-mint/10 to-landing-mango/20 blur-3xl opacity-70"
      aria-hidden
    />

    <div
      className="relative aspect-square w-full max-h-[min(480px,85vw)] rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0a0f14] via-[#0d1218] to-[#080c10] shadow-[0_32px_80px_-16px_rgba(0,240,200,0.2),0_0_60px_-20px_rgba(255,183,3,0.15)] overflow-hidden"
      role="img"
      aria-label="Ecosistema PetHub conectando dueños, proveedores y refugios"
    >
      {/* Grid de fondo */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,240,200,0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />

      {/* Anillos orbitales */}
      {[28, 42, 56].map((r, i) => (
        <div
          key={r}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed pointer-events-none"
          style={{
            width: `${r * 2}%`,
            height: `${r * 2}%`,
            borderColor: i === 1 ? 'rgba(0,240,200,0.18)' : 'rgba(255,183,3,0.1)',
            animation: `spin ${30 + i * 12}s linear infinite ${i % 2 ? 'reverse' : 'normal'}`,
          }}
          aria-hidden
        />
      ))}

      {/* Tags flotantes */}
      {FLOAT_TAGS.map((tag) => (
        <div
          key={tag.text}
          className={cn(
            'absolute z-30 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold border backdrop-blur-md animate-drift',
            tag.color,
          )}
          style={tag.style}
        >
          {tag.text}
        </div>
      ))}

      {/* SVG: arcos de conexión + partículas */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="pitchArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0C8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#38F9A0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFB703" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="pitchCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F0C8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00F0C8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="18" fill="url(#pitchCoreGlow)" className="animate-pulse" />

        {ROLES.map((role, i) => {
          const end = polar(role.angle, role.radius);
          const path = arcPath({ x: 50, y: 50 }, end);
          return (
            <g key={role.id}>
              <path
                d={path}
                fill="none"
                stroke="url(#pitchArcGrad)"
                strokeWidth="0.35"
                strokeDasharray="2 2"
                opacity="0.5"
                className="pitch-arc-flow"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
              <circle r="0.6" fill="#38F9A0">
                <animateMotion dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" path={path} />
              </circle>
            </g>
          );
        })}

        {/* Triángulo sutil entre roles */}
        <polygon
          points={ROLES.map((r) => {
            const p = polar(r.angle, r.radius);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="#FFB703"
          strokeOpacity="0.08"
          strokeWidth="0.3"
        />
      </svg>

      {/* Módulos en órbita interior */}
      <div
        className="absolute inset-[18%] animate-spin"
        style={{ animationDuration: '60s', animationTimingFunction: 'linear' }}
        aria-hidden
      >
        {ORBIT_MODULES.map(({ Icon, angle }) => {
          const pos = polar(angle, 50);
          return (
            <div
              key={angle}
              className="absolute w-7 h-7 sm:w-8 sm:h-8 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center animate-spin"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                animationDuration: '60s',
                animationDirection: 'reverse',
              }}
            >
              <Icon className="w-3.5 h-3.5 text-landing-aqua/70" strokeWidth={2} />
            </div>
          );
        })}
      </div>

      {/* Nodos de rol */}
      {ROLES.map((role, i) => {
        const pos = polar(role.angle, role.radius);
        const Icon = role.Icon;
        return (
          <div
            key={role.id}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-float"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '5s',
            }}
          >
            <div
              className={cn(
                'relative p-3 sm:p-3.5 rounded-2xl border border-white/15 bg-[#12181f]/90 backdrop-blur-md shadow-xl',
                role.glow,
              )}
            >
              <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br mb-2', role.gradient)}>
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-white leading-none">{role.label}</p>
              <p className="text-[8px] sm:text-[9px] text-white/45 mt-0.5 whitespace-nowrap">{role.sub}</p>
            </div>
          </div>
        );
      })}

      {/* Núcleo central PetHub */}
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <div className="relative animate-float-slow">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-landing-aqua/30 to-landing-mango/20 blur-xl animate-pulse" aria-hidden />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-landing-aqua via-landing-mint to-landing-mango p-[3px] shadow-[0_0_40px_rgba(0,240,200,0.35)]">
            <div className="w-full h-full rounded-full bg-[#0d1218] flex flex-col items-center justify-center border border-white/10">
              <PawPrint className="w-9 h-9 sm:w-10 sm:h-10 text-landing-aqua mb-0.5" strokeWidth={2.5} />
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-white/80 uppercase">PetHub</span>
            </div>
          </div>
          {/* Pulso exterior */}
          <div className="absolute inset-0 rounded-full border-2 border-landing-aqua/30 animate-ping" style={{ animationDuration: '3s' }} aria-hidden />
        </div>
      </div>

      {/* Mascotas decorativas */}
      <span className="absolute bottom-[18%] right-[12%] text-2xl opacity-30 animate-float" style={{ animationDelay: '1s' }} aria-hidden>🐕</span>
      <span className="absolute top-[20%] left-[10%] text-xl opacity-25 animate-float" style={{ animationDelay: '0.3s' }} aria-hidden>🐈</span>
    </div>

    <style>{`
      @keyframes pitch-arc-flow {
        to { stroke-dashoffset: -8; }
      }
      .pitch-arc-flow {
        animation: pitch-arc-flow 2s linear infinite;
      }
    `}</style>
  </div>
);
