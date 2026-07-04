import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { publicPlatformRoles, type PlatformModule, type PublicRoleId } from '@/data/landingPlatformData';
import { landingBadge } from '@/lib/landingTheme';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import { RoleScreenshotCarousel } from '@/components/landing/RoleScreenshotCarousel';

export const PlatformRolesExplorer: React.FC = () => {
  const [activeRoleId, setActiveRoleId] = useState<PublicRoleId>(publicPlatformRoles[0].id);
  const [hoveredModule, setHoveredModule] = useState<PlatformModule | null>(null);

  const activeRole = publicPlatformRoles.find((r) => r.id === activeRoleId) ?? publicPlatformRoles[0];
  const featuredModule = hoveredModule ?? activeRole.modules[0];

  const featuredCard = (
    <div className={`rounded-2xl p-5 md:p-6 ${activeRole.gradient} ${activeRole.colorText} shadow-lg transition-all duration-300`}>
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
          <p className="text-sm opacity-85 mt-1 leading-relaxed">{featuredModule.description}</p>
        </div>
      </div>
    </div>
  );

  const modulesGrid = (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
      {activeRole.modules.map((mod) => (
        <button
          key={mod.title}
          onMouseEnter={() => setHoveredModule(mod)}
          onFocus={() => setHoveredModule(mod)}
          onClick={() => setHoveredModule(mod)}
          className={`group text-left rounded-xl p-3.5 border transition-all duration-200 ${
            featuredModule.title === mod.title
              ? 'border-landing-aqua bg-landing-aqua/10 shadow-md scale-[1.02]'
              : 'border-gray-200 bg-white hover:border-landing-aqua/40 hover:shadow-md'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg ${activeRole.gradient} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
            <mod.icon className={`w-4 h-4 ${activeRole.colorText}`} />
          </div>
          <p className="text-xs font-semibold text-gray-900 leading-tight">{mod.title}</p>
        </button>
      ))}
    </div>
  );

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-landing-aqua/5 pointer-events-none" />
      <LandingPetDecorations preset="section" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-14">
          <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
            Interfaz real de la plataforma
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Una experiencia para{' '}
            <span className="text-landing-mint-dark">
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
                  ? `${role.gradient} ${role.colorText} shadow-lg scale-105`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {role.shortLabel}
            </button>
          ))}
        </div>

        <div key={activeRoleId} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Mobile / tablet: módulos arriba, carrusel abajo */}
          <div className="lg:hidden space-y-4 max-w-xl mx-auto">
            {featuredCard}
            {modulesGrid}
            <div className="flex justify-center pt-2">
              <RoleScreenshotCarousel
                roleId={activeRoleId}
                activeDotClass={activeRole.gradient}
              />
            </div>
          </div>

          {/* Desktop: carrusel centrado verticalmente con la grilla de módulos */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-10 xl:gap-x-14 lg:gap-y-4 lg:items-center">
            <div className="lg:col-start-2 lg:row-start-1">
              {featuredCard}
            </div>

            <div className="lg:col-start-1 lg:row-start-2 flex items-center justify-end pr-4 xl:pr-8">
              <RoleScreenshotCarousel
                roleId={activeRoleId}
                activeDotClass={activeRole.gradient}
              />
            </div>

            <div className="lg:col-start-2 lg:row-start-2">
              {modulesGrid}
            </div>
          </div>

          <ul className="mt-8 lg:mt-10 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {activeRole.highlights.map((h, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeRole.gradient}`} />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
