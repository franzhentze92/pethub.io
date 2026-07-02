import React from 'react';
import { PawPrint, Heart, Bone } from 'lucide-react';

const floatItemsApp = [
  { x: '4%', y: '18%', delay: 0, type: 'heart' as const, color: 'text-landing-mango' },
  { x: '94%', y: '35%', delay: 1.5, type: 'ball' as const, color: 'bg-landing-mint' },
  { x: '8%', y: '72%', delay: 3, type: 'bone' as const, color: 'text-landing-aqua' },
];

export type DecorationPreset = 'hero' | 'section' | 'cta' | 'bento' | 'dark' | 'app';

interface LandingPetDecorationsProps {
  preset?: DecorationPreset;
  className?: string;
}

/* ── SVG mascotas ── */

const RunningDogSvg: React.FC<{ className?: string }> = ({ className = 'w-20 h-12' }) => (
  <svg viewBox="0 0 100 56" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cola */}
    <path
      d="M8 22 Q0 10 6 4"
      stroke="#E6A503"
      strokeWidth="3"
      strokeLinecap="round"
      className="origin-[8px_22px] animate-tail-wag"
    />
    {/* Cuerpo */}
    <ellipse cx="42" cy="30" rx="26" ry="14" fill="#FFB703" />
    <ellipse cx="42" cy="32" rx="20" ry="8" fill="#FDE74C" opacity="0.5" />
    {/* Cabeza */}
    <circle cx="68" cy="22" r="13" fill="#FFB703" />
    {/* Hocico */}
    <ellipse cx="78" cy="24" rx="7" ry="5" fill="#E6A503" />
    <circle cx="80" cy="22" r="2" fill="#374151" />
    {/* Oreja */}
    <ellipse cx="62" cy="12" rx="6" ry="9" fill="#E6A503" transform="rotate(-15 62 12)" />
    {/* Ojo */}
    <circle cx="70" cy="19" r="2.5" fill="#374151" />
    {/* Patas — animadas */}
    <rect x="28" y="38" width="5" height="14" rx="2.5" fill="#E6A503" className="origin-[30px_38px] animate-leg-run" />
    <rect x="40" y="38" width="5" height="14" rx="2.5" fill="#E6A503" className="origin-[42px_38px] animate-leg-run" style={{ animationDelay: '0.1s' }} />
    <rect x="52" y="38" width="5" height="14" rx="2.5" fill="#E6A503" className="origin-[54px_38px] animate-leg-run" style={{ animationDelay: '0.05s' }} />
    <rect x="62" y="38" width="5" height="12" rx="2.5" fill="#E6A503" className="origin-[64px_38px] animate-leg-run" style={{ animationDelay: '0.15s' }} />
    {/* Collar tech */}
    <path d="M58 30 Q68 34 76 30" stroke="#00F0C8" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="67" cy="33" r="3" fill="#00F0C8" />
  </svg>
);

const RunningCatSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-10' }) => (
  <svg viewBox="0 0 80 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cola arqueada */}
    <path d="M6 20 Q0 8 12 6 Q20 4 18 14" stroke="#38F9A0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Cuerpo */}
    <ellipse cx="38" cy="26" rx="22" ry="11" fill="#38F9A0" />
    {/* Cabeza */}
    <circle cx="58" cy="20" r="11" fill="#38F9A0" />
    {/* Orejas puntiagudas */}
    <polygon points="50,8 54,16 46,14" fill="#2DD98A" />
    <polygon points="62,8 66,14 58,16" fill="#2DD98A" />
    {/* Ojos */}
    <ellipse cx="54" cy="19" rx="2" ry="2.5" fill="#374151" />
    <ellipse cx="62" cy="19" rx="2" ry="2.5" fill="#374151" />
    {/* Nariz */}
    <polygon points="60,22 62,24 58,24" fill="#FFB703" />
    {/* Patas */}
    <rect x="26" y="32" width="4" height="12" rx="2" fill="#2DD98A" className="origin-[28px_32px] animate-leg-run" />
    <rect x="36" y="32" width="4" height="12" rx="2" fill="#2DD98A" className="origin-[38px_32px] animate-leg-run" style={{ animationDelay: '0.12s' }} />
    <rect x="48" y="32" width="4" height="11" rx="2" fill="#2DD98A" className="origin-[50px_32px] animate-leg-run" style={{ animationDelay: '0.06s' }} />
    <rect x="56" y="32" width="4" height="11" rx="2" fill="#2DD98A" className="origin-[58px_32px] animate-leg-run" style={{ animationDelay: '0.18s' }} />
  </svg>
);

/* ── Huellas que aparecen y desaparecen ── */

interface PawStep {
  x: string;
  y: string;
  rotate: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const buildPawTrail = (count: number, baseY: number, startX: number, stepX: number): PawStep[] =>
  Array.from({ length: count }, (_, i) => ({
    x: `${startX + i * stepX}%`,
    y: `${baseY + (i % 2 === 0 ? 0 : 4)}%`,
    rotate: i % 2 === 0 ? -20 : 20,
    delay: i * 0.9,
    duration: 5 + (i % 3),
    color: i % 3 === 0 ? 'text-landing-aqua' : i % 3 === 1 ? 'text-landing-mint' : 'text-landing-mango',
    size: 22 + (i % 3) * 4,
  }));

const PawTrail: React.FC<{ steps: PawStep[]; className?: string }> = ({ steps, className = '' }) => (
  <div className={`absolute inset-0 ${className}`}>
    {steps.map((step, i) => (
      <PawPrint
        key={i}
        className={`absolute animate-paw-fade ${step.color}`}
        style={{
          left: step.x,
          top: step.y,
          width: step.size,
          height: step.size,
          transform: `rotate(${step.rotate}deg)`,
          animationDelay: `${step.delay}s`,
          animationDuration: `${step.duration}s`,
        }}
      />
    ))}
  </div>
);

/* ── Mascota corriendo ── */

const RunningPet: React.FC<{
  pet: 'dog' | 'cat';
  top: string;
  duration?: string;
  /** Segundos de offset en el ciclo. Usar valores negativos para escalonar sin pausa inicial. */
  delay?: string;
  reverse?: boolean;
  slow?: boolean;
}> = ({ pet, top, duration, delay = '0s', reverse = false, slow = false }) => (
  <div
    className={`absolute will-change-transform ${reverse ? 'animate-run-across-reverse' : slow ? 'animate-run-across-slow' : 'animate-run-across'}`}
    style={{ top, animationDelay: delay, animationDuration: duration }}
  >
    <div className="animate-dog-bob">
      {pet === 'dog' ? (
        <RunningDogSvg className="w-16 h-10 md:w-24 md:h-14 drop-shadow-lg" />
      ) : (
        <RunningCatSvg className="w-14 h-9 md:w-20 md:h-12 drop-shadow-md" />
      )}
    </div>
  </div>
);

/* ── Elementos flotantes ── */

const FloatingElements: React.FC<{ items: { x: string; y: string; delay: number; type: 'heart' | 'bone' | 'ball'; color: string }[] }> = ({ items }) => (
  <>
    {items.map((item, i) => (
      <div
        key={i}
        className="absolute animate-float-rise"
        style={{ left: item.x, top: item.y, animationDelay: `${item.delay}s`, animationDuration: `${5 + i}s` }}
      >
        {item.type === 'heart' && <Heart className={`w-5 h-5 ${item.color} fill-current opacity-40`} />}
        {item.type === 'bone' && <Bone className={`w-6 h-6 ${item.color} opacity-35`} />}
        {item.type === 'ball' && (
          <div className={`w-5 h-5 rounded-full ${item.color} opacity-40 animate-ball-bounce shadow-sm`} />
        )}
      </div>
    ))}
  </>
);

/* ── Pelota de tenis rebotando ── */

const TennisBall: React.FC<{ left: string; bottom: string; delay?: string }> = ({ left, bottom, delay = '0s' }) => (
  <div
    className="absolute animate-ball-bounce"
    style={{ left, bottom, animationDelay: delay }}
  >
    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-landing-tropical shadow-md relative overflow-hidden opacity-50">
      <div className="absolute inset-0 rounded-full border-2 border-white/40" style={{ clipPath: 'ellipse(50% 30% at 50% 50%)' }} />
      <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full opacity-60">
        <path d="M5 20 Q20 5 35 20" stroke="white" strokeWidth="2" fill="none" />
        <path d="M5 20 Q20 35 35 20" stroke="white" strokeWidth="2" fill="none" />
      </svg>
    </div>
  </div>
);

/* ── Presets por sección ── */

const heroTrail1 = buildPawTrail(10, 82, 5, 9);
const heroTrail2 = buildPawTrail(8, 88, 15, 10);
const sectionTrail = buildPawTrail(6, 90, 10, 14);
const ctaTrail = buildPawTrail(12, 85, 2, 8);

const floatItemsHero = [
  { x: '8%', y: '20%', delay: 0, type: 'heart' as const, color: 'text-landing-mango' },
  { x: '92%', y: '30%', delay: 2, type: 'bone' as const, color: 'text-landing-aqua' },
  { x: '85%', y: '70%', delay: 4, type: 'ball' as const, color: 'bg-landing-mint' },
  { x: '5%', y: '55%', delay: 1.5, type: 'ball' as const, color: 'bg-landing-mango' },
  { x: '75%', y: '12%', delay: 3, type: 'heart' as const, color: 'text-landing-mint' },
];

const floatItemsSection = [
  { x: '3%', y: '40%', delay: 0, type: 'heart' as const, color: 'text-landing-aqua' },
  { x: '96%', y: '60%', delay: 2.5, type: 'bone' as const, color: 'text-landing-mango' },
  { x: '90%', y: '15%', delay: 1, type: 'ball' as const, color: 'bg-landing-tropical' },
];

const floatItemsCta = [
  { x: '10%', y: '60%', delay: 0, type: 'heart' as const, color: 'text-white' },
  { x: '88%', y: '25%', delay: 1.5, type: 'heart' as const, color: 'text-white' },
  { x: '5%', y: '20%', delay: 3, type: 'bone' as const, color: 'text-white/60' },
  { x: '92%', y: '75%', delay: 2, type: 'ball' as const, color: 'bg-white/30' },
];

export const LandingPetDecorations: React.FC<LandingPetDecorationsProps> = ({
  preset = 'section',
  className = '',
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      {/* ── HERO ── */}
      {preset === 'hero' && (
        <>
          <PawTrail steps={heroTrail1} />
          <PawTrail steps={heroTrail2} className="opacity-60" />
          <RunningPet pet="dog" top="80%" delay="0s" duration="20s" />
          <RunningPet pet="cat" top="22%" delay="-13s" duration="26s" reverse slow />
          <FloatingElements items={floatItemsHero} />
          <TennisBall left="12%" bottom="8%" delay="0s" />
          <TennisBall left="78%" bottom="12%" delay="1s" />
        </>
      )}

      {/* ── SECTION (roles, ecosystem) ── */}
      {preset === 'section' && (
        <>
          <PawTrail steps={sectionTrail} className="opacity-50" />
          <RunningPet pet="cat" top="92%" delay="-10s" duration="26s" />
          <RunningPet pet="dog" top="8%" delay="-7s" duration="20s" reverse />
          <FloatingElements items={floatItemsSection} />
          <TennisBall left="85%" bottom="5%" delay="0.5s" />
        </>
      )}

      {/* ── BENTO GRID ── */}
      {preset === 'bento' && (
        <>
          <PawTrail steps={buildPawTrail(5, 95, 20, 15)} className="opacity-30" />
          <RunningPet pet="dog" top="96%" delay="-8s" duration="22s" slow />
          <div className="absolute top-[15%] right-[4%] animate-float-slow opacity-20">
            <PawPrint className="w-16 h-16 text-landing-mint rotate-12" />
          </div>
          <div className="absolute bottom-[20%] left-[3%] animate-drift opacity-15">
            <PawPrint className="w-20 h-20 text-landing-aqua -rotate-12" />
          </div>
          <TennisBall left="6%" bottom="15%" />
          <TennisBall left="90%" bottom="20%" delay="0.8s" />
        </>
      )}

      {/* ── CTA ── */}
      {preset === 'cta' && (
        <>
          <PawTrail steps={ctaTrail} className="opacity-40" />
          <RunningPet pet="dog" top="70%" delay="0s" duration="16s" />
          <RunningPet pet="cat" top="25%" delay="-12s" duration="24s" reverse />
          <FloatingElements items={floatItemsCta} />
        </>
      )}

      {/* ── APP (dashboard / ajustes — sutil) ── */}
      {preset === 'app' && (
        <>
          <div className="absolute top-[10%] right-[5%] animate-float-slow opacity-[0.18]">
            <PawPrint className="w-12 h-12 text-landing-mint rotate-12" />
          </div>
          <div className="absolute top-[38%] left-[3%] animate-drift opacity-[0.14]" style={{ animationDuration: '8s' }}>
            <PawPrint className="w-9 h-9 text-landing-aqua -rotate-12" />
          </div>
          <div className="absolute top-[62%] right-[8%] animate-float-rise opacity-[0.12]" style={{ animationDelay: '2s' }}>
            <PawPrint className="w-11 h-11 text-landing-mango rotate-[25deg]" />
          </div>
          <FloatingElements items={floatItemsApp} />
          <TennisBall left="82%" bottom="22%" delay="0.4s" />
        </>
      )}

      {/* ── DARK (how it works) ── */}
      {preset === 'dark' && (
        <>
          <PawTrail
            steps={buildPawTrail(7, 88, 8, 12).map((s) => ({
              ...s,
              color: 'text-landing-aqua/40',
            }))}
            className="opacity-30"
          />
          <RunningPet pet="dog" top="90%" delay="-14s" duration="28s" slow />
          <div className="absolute top-1/4 left-[5%] animate-float-rise" style={{ animationDelay: '1s' }}>
            <Heart className="w-4 h-4 text-landing-aqua/30 fill-landing-aqua/20" />
          </div>
          <div className="absolute top-1/3 right-[8%] animate-float-rise" style={{ animationDelay: '3s' }}>
            <Bone className="w-5 h-5 text-landing-mango/25" />
          </div>
        </>
      )}
    </div>
  );
};

export { RunningDogSvg, RunningCatSvg, PawTrail, RunningPet };
