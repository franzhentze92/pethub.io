import React from 'react';
import { PawPrint } from 'lucide-react';
import { publicPlatformRoles, publicEcosystemConnections } from '@/data/landingPlatformData';
import { LandingPetDecorations } from './LandingPetDecorations';

const nodePositions: Record<string, { x: number; y: number; label: string }> = {
  client: { x: 50, y: 15, label: 'Dueño' },
  provider: { x: 85, y: 70, label: 'Proveedor' },
  shelter: { x: 15, y: 70, label: 'Refugio' },
};

export const EcosystemDiagram: React.FC = () => {
  return (
    <section className="relative py-20 md:py-28 bg-gradient-to-b from-white to-landing-aqua/5 overflow-hidden">
      <LandingPetDecorations preset="section" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-landing-aqua-dark mb-3">
              Conexiones en vivo
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo fluye a través de{' '}
              <span className="bg-gradient-to-r from-landing-aqua to-landing-mango bg-clip-text text-transparent">
                un solo hub
              </span>
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Dueños compran a proveedores, refugios conectan adoptantes y todo se sincroniza
              en tiempo real dentro de PetHub.
            </p>

            <div className="space-y-3">
              {publicEcosystemConnections.map((conn, i) => {
                const fromRole = publicPlatformRoles.find((r) => r.id === conn.from);
                const toRole = publicPlatformRoles.find((r) => r.id === conn.to);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-landing-aqua/30 transition-all"
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md bg-gradient-to-r ${fromRole?.gradient ?? ''} text-white`}>
                        {fromRole?.shortLabel}
                      </span>
                      <span className="text-landing-aqua text-sm">→</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md bg-gradient-to-r ${toRole?.gradient ?? ''} text-white`}>
                        {toRole?.shortLabel}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">{conn.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative aspect-square max-w-md mx-auto w-full">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {publicEcosystemConnections.map((conn, i) => {
                const from = nodePositions[conn.from];
                const to = nodePositions[conn.to];
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={50}
                    y2={50}
                    stroke="url(#lineGrad)"
                    strokeWidth="0.3"
                    strokeDasharray="1 1"
                    className="animate-flow-line"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                );
              })}
              {publicEcosystemConnections.map((conn, i) => {
                const to = nodePositions[conn.to];
                if (!to) return null;
                return (
                  <line
                    key={`out-${i}`}
                    x1={50}
                    y1={50}
                    x2={to.x}
                    y2={to.y}
                    stroke="url(#lineGrad)"
                    strokeWidth="0.3"
                    strokeDasharray="1 1"
                    opacity="0.5"
                    className="animate-flow-line"
                    style={{ animationDelay: `${i * 0.3 + 0.5}s` }}
                  />
                );
              })}

              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00F0C8" />
                  <stop offset="100%" stopColor="#FFB703" />
                </linearGradient>
                <radialGradient id="hubGrad">
                  <stop offset="0%" stopColor="#00F0C8" />
                  <stop offset="100%" stopColor="#38F9A0" />
                </radialGradient>
              </defs>

              <circle cx="50" cy="50" r="8" fill="url(#hubGrad)" className="animate-pulse-glow" />
              <circle cx="50" cy="50" r="11" fill="none" stroke="#00F0C8" strokeWidth="0.2" opacity="0.4" className="animate-pulse-glow" />

              {publicPlatformRoles.map((role) => {
                const pos = nodePositions[role.id];
                if (!pos) return null;
                return (
                  <g key={role.id}>
                    <circle cx={pos.x} cy={pos.y} r="5" fill="white" stroke="#00F0C8" strokeWidth="0.4" />
                    <text
                      x={pos.x}
                      y={pos.y + 9}
                      textAnchor="middle"
                      fontSize="3"
                      fill="#374151"
                      fontWeight="600"
                    >
                      {pos.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-landing-aqua to-landing-mint flex items-center justify-center shadow-xl animate-pulse-glow">
                <PawPrint className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
