import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PawPrint, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import { landingBtnHero } from '@/lib/landingTheme';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import { RoleBenefitsExplorer } from '@/components/landing/RoleBenefitsExplorer';
import { HowItWorksFlow } from '@/components/landing/HowItWorksFlow';
import {
  getRoleBenefitProfile,
  roleLabels,
  type PublicFeatureRole,
} from '@/data/featuresPageData';
import { publicPlatformRoles } from '@/data/landingPlatformData';

export const Features: React.FC = () => {
  const [activeRole, setActiveRole] = useState<PublicFeatureRole>('client');
  const profile = getRoleBenefitProfile(activeRole);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* ── HERO ── */}
      <section className="relative min-h-[60vh] flex items-center py-20 md:py-28 overflow-hidden">
        <LandingAmbientBackground variant="hero" />
        <LandingPetDecorations preset="hero" />
        <div className="absolute inset-0 bg-gradient-to-br from-landing-aqua/90 via-landing-mint/85 to-landing-mango/90" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 inline-flex items-center gap-2">
            <PawPrint className="w-4 h-4" />
            Dueño · Proveedor · Refugio
          </Badge>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {publicPlatformRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveRole(role.id as PublicFeatureRole)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeRole === role.id
                    ? 'bg-white text-landing-aqua-dark shadow-lg scale-105'
                    : 'bg-white/15 text-white border border-white/25 hover:bg-white/25'
                }`}
              >
                {roleLabels[role.id as PublicFeatureRole]}
              </button>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.2)]">
            {profile.heroTitleLead}
            <span className="text-landing-tropical">{profile.heroTitleAccent}</span>
          </h1>

          <p className="text-lg md:text-xl text-white font-medium leading-relaxed max-w-2xl mx-auto mb-8 [text-shadow:0_1px_4px_rgba(0,0,0,0.25)]">
            {profile.heroSubtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {profile.outcomes.slice(0, 3).map((outcome) => (
              <Badge key={outcome.title} className="bg-white/15 text-white border-white/25 px-3 py-1.5 backdrop-blur-sm text-xs max-w-[220px] text-left whitespace-normal">
                {outcome.title}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS POR ROL ── */}
      <RoleBenefitsExplorer activeRoleId={activeRole} onRoleChange={setActiveRole} />

      {/* ── CÓMO EMPEZAR ── */}
      <HowItWorksFlow />

      {/* ── CTA ── */}
      <section className="relative py-20 md:py-28 bg-gradient-to-r from-landing-aqua to-landing-mango overflow-hidden">
        <LandingPetDecorations preset="cta" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
            <Zap className="w-4 h-4 mr-2 inline" />
            {roleLabels[activeRole]}
          </Badge>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]">
            ¿Listo para empezar?
          </h2>
          <p className="text-lg text-white font-medium mb-10 max-w-xl mx-auto [text-shadow:0_1px_3px_rgba(0,0,0,0.2)]">
            {profile.ctaHint}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/register">
              <Button size="lg" className={`w-full sm:w-auto ${landingBtnHero} text-lg px-8 py-4 h-auto font-semibold`}>
                Crear Cuenta Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-landing-aqua-dark text-lg px-8 py-4 h-auto font-semibold bg-white/10 backdrop-blur-sm">
                Ver planes
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {['Plataforma gratis', 'Sin tarjeta', 'Elige tu perfil al registrarte'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-white/95 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
