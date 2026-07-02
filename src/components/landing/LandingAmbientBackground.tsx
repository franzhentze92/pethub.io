import React from 'react';
import { PawPrint } from 'lucide-react';

interface LandingAmbientBackgroundProps {
  variant?: 'hero' | 'section' | 'dark';
  className?: string;
}

const pawPositions = [
  { top: '8%', left: '5%', size: 28, delay: '0s', opacity: 0.08 },
  { top: '15%', right: '8%', size: 36, delay: '2s', opacity: 0.06 },
  { top: '55%', left: '3%', size: 24, delay: '4s', opacity: 0.07 },
  { top: '70%', right: '4%', size: 32, delay: '1s', opacity: 0.05 },
  { top: '35%', left: '12%', size: 20, delay: '3s', opacity: 0.06 },
  { top: '80%', left: '18%', size: 26, delay: '5s', opacity: 0.05 },
];

export const LandingAmbientBackground: React.FC<LandingAmbientBackgroundProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const isDark = variant === 'dark';

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      {/* Tech grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)'
            : 'radial-gradient(circle at 1px 1px, rgba(0,240,200,0.12) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Gradient orbs */}
      <div className={`absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse-glow ${
        isDark ? 'bg-landing-aqua/10' : 'bg-landing-aqua/25'
      }`} />
      <div className={`absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full blur-3xl animate-pulse-glow ${
        isDark ? 'bg-landing-mango/10' : 'bg-landing-mango/20'
      }`} style={{ animationDelay: '2s' }} />
      <div className={`absolute -bottom-20 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl animate-pulse-glow ${
        isDark ? 'bg-landing-mint/10' : 'bg-landing-mint/20'
      }`} style={{ animationDelay: '4s' }} />

      {/* Flowing wave lines */}
      <svg className="absolute bottom-0 left-0 w-full h-32 opacity-20" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path
          d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z"
          fill="url(#waveGrad)"
          className="animate-float-slow"
        />
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F0C8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#38F9A0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFB703" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating paw prints — hero full, section/app subset */}
      {(variant === 'hero' || variant === 'section') &&
        pawPositions.slice(0, variant === 'hero' ? pawPositions.length : 4).map((paw, i) => (
        <div
          key={i}
          className="absolute animate-drift text-landing-aqua"
          style={{
            top: paw.top,
            left: paw.left,
            right: paw.right,
            opacity: paw.opacity,
            animationDelay: paw.delay,
            animationDuration: `${6 + i}s`,
          }}
        >
          <PawPrint style={{ width: paw.size, height: paw.size }} />
        </div>
      ))}

      {/* Connection nodes — hero full, section subtle */}
      {(variant === 'hero' || variant === 'section') && (
        <svg className={`absolute inset-0 w-full h-full ${variant === 'hero' ? 'opacity-[0.12]' : 'opacity-[0.07]'}`} xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="20%" x2="30%" y2="35%" stroke="#00F0C8" strokeWidth="1" strokeDasharray="4 4" className="animate-flow-line" />
          <line x1="70%" y1="15%" x2="90%" y2="40%" stroke="#38F9A0" strokeWidth="1" strokeDasharray="4 4" className="animate-flow-line" style={{ animationDelay: '0.5s' }} />
          <line x1="85%" y1="60%" x2="60%" y2="75%" stroke="#FFB703" strokeWidth="1" strokeDasharray="4 4" className="animate-flow-line" style={{ animationDelay: '1s' }} />
          <line x1="20%" y1="70%" x2="45%" y2="55%" stroke="#FDE74C" strokeWidth="1" strokeDasharray="4 4" className="animate-flow-line" style={{ animationDelay: '1.5s' }} />
          <circle cx="10%" cy="20%" r="3" fill="#00F0C8" />
          <circle cx="30%" cy="35%" r="2" fill="#38F9A0" />
          <circle cx="70%" cy="15%" r="3" fill="#FFB703" />
          <circle cx="90%" cy="40%" r="2" fill="#00F0C8" />
          <circle cx="85%" cy="60%" r="3" fill="#38F9A0" />
          <circle cx="60%" cy="75%" r="2" fill="#FDE74C" />
        </svg>
      )}
    </div>
  );
};
