import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { publicPlatformRoles, type PlatformModule, type PublicRoleId } from '@/data/landingPlatformData';
import { landingBadge } from '@/lib/landingTheme';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import { RoleScreenPreviewFrame } from '@/components/landing/RoleDashboardPreview';

const FEATURED_MODULES_COUNT = 6;

export const PlatformRolesExplorer: React.FC = () => {
  const [activeRoleId, setActiveRoleId] = useState<PublicRoleId>(publicPlatformRoles[0].id);
  const [hoveredModule, setHoveredModule] = useState<PlatformModule | null>(null);

  const activeRole = publicPlatformRoles.find((r) => r.id === activeRoleId) ?? publicPlatformRoles[0];
  const featuredModules = activeRole.modules.slice(0, FEATURED_MODULES_COUNT);
  const featuredModule = hoveredModule ?? featuredModules[0];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-landing-aqua/5 via-transparent to-landing-mint/5 pointer-events-none" />
      <LandingPetDecorations preset="section" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-14">
          <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
            Interfaz real de la plataforma
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Una experiencia para{' '}
            <span className="bg-gradient-to-r from-landing-aqua to-landing-mango bg-clip-text text-transparent">
              cada perfil
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Adopción, tienda, trazabilidad y más — pantallas reales de PetHub según tu rol.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-10">
          {publicPlatformRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => { setActiveRoleId(role.id); setHoveredModule(null); }}
              className={`px-4 md:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeRoleId === role.id
                  ? `bg-gradient-to-r ${role.gradient} text-white shadow-lg scale-105`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {role.shortLabel}
            </button>
          ))}
        </div>

        <div
          key={activeRoleId}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="lg:col-span-3 order-2 lg:order-1">
            <RoleScreenPreviewFrame roleId={activeRole.id} maxHeight="460px" />

            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {activeRole.highlights.map((h, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${activeRole.gradient}`} />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
            <div className={`rounded-2xl p-5 md:p-6 bg-gradient-to-br ${activeRole.gradient} text-white shadow-lg transition-all duration-300`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <featuredModule.icon className="w-6 h-6" />
                </div>
                <div>
                  {featuredModule.tag && (
                    <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                      {featuredModule.tag}
                    </span>
                  )}
                  <h4 className="text-xl font-bold mt-1">{featuredModule.title}</h4>
                  <p className="text-sm text-white/85 mt-1 leading-relaxed">{featuredModule.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {featuredModules.map((mod, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setHoveredModule(mod)}
                  onFocus={() => setHoveredModule(mod)}
                  onClick={() => setHoveredModule(mod)}
                  className={`group text-left rounded-xl p-3.5 border transition-all duration-200 ${
                    featuredModule.title === mod.title
                      ? 'border-landing-aqua bg-landing-aqua/10 shadow-md scale-[1.02]'
                      : 'border-gray-200 bg-white hover:border-landing-aqua/40 hover:shadow-md'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeRole.gradient} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <mod.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{mod.title}</p>
                </button>
              ))}
            </div>

            {activeRole.modules.length > FEATURED_MODULES_COUNT && (
              <p className="text-[11px] text-gray-400 text-center">
                +{activeRole.modules.length - FEATURED_MODULES_COUNT} módulos más
              </p>
            )}

            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Explora los módulos de {activeRole.shortLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
