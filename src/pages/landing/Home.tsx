import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, CheckCircle, Heart, Play,
} from 'lucide-react';
import { landingBtnHero, landingBadge } from '@/lib/landingTheme';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import { LiveStatsMarquee } from '@/components/landing/LiveStatsMarquee';
import { PlatformRolesExplorer } from '@/components/landing/PlatformRolesExplorer';
import { HowItWorksFlow } from '@/components/landing/HowItWorksFlow';
import { EcosystemDiagram } from '@/components/landing/EcosystemDiagram';
import { PlatformHighlights } from '@/components/landing/PlatformHighlights';
import { platformRoles, publicPlatformRoles } from '@/data/landingPlatformData';

export const Home: React.FC = () => {
  const totalModules = platformRoles.reduce((acc, r) => acc + r.modules.length, 0);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <section className="relative min-h-0 flex items-center pt-6 pb-10 md:pt-8 md:pb-14 overflow-hidden">
        <LandingAmbientBackground variant="hero" />
        <LandingPetDecorations preset="hero" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-8 lg:gap-10 xl:gap-12 items-center">
            <div className="text-left order-2 lg:order-1">
              <Badge variant="secondary" className={`mb-6 px-4 py-2 text-sm font-medium ${landingBadge} inline-flex items-center gap-2`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-landing-aqua opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-landing-aqua" />
                </span>
                Plataforma pet-tech en Latinoamérica
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] font-bold text-gray-900 mb-6 leading-[1.1]">
                Todo lo que tu mascota necesita,{' '}
                <span className="text-landing-aqua-dark">
                  en una sola app
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
                Cuida su salud, agenda recordatorios, encuentra servicios y mantén toda su
                información organizada con ayuda de IA.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Link to="/register">
                  <Button size="lg" className={`w-full sm:w-auto ${landingBtnHero} text-base px-7 py-3 h-auto font-semibold`}>
                    Comenzar Gratis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/features">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-gray-300 hover:border-landing-aqua text-gray-700 hover:text-landing-aqua-dark text-base px-7 py-3 h-auto font-semibold">
                    <Play className="mr-2 w-4 h-4" />
                    Ver módulos
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-gray-500 mb-6 max-w-md leading-relaxed">
                Con{' '}
                <span className="font-semibold text-landing-aqua-dark">PetBuddy</span>
                , tu mascota tiene un asistente de cuidado siempre activo.
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {['Plataforma gratis', 'Sin tarjeta', 'Cliente · Proveedor · Refugio'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-landing-mint-dark shrink-0" />
                    <span className="text-sm text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative w-full max-w-2xl mx-auto lg:max-w-none lg:ml-auto">
                <div
                  className="absolute -inset-4 rounded-[2rem] bg-landing-aqua/15 blur-2xl opacity-70"
                  aria-hidden
                />
                <img
                  src="/hero-image.png"
                  alt="Mascotas conectadas en el ecosistema PetHub"
                  className="relative w-full h-auto rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,240,200,0.2)]"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <LiveStatsMarquee />
      <PlatformRolesExplorer />
      <HowItWorksFlow />
      <EcosystemDiagram />
      <PlatformHighlights />

      <section className="py-16 md:py-24 bg-landing-mango relative overflow-hidden">
        <LandingAmbientBackground variant="dark" className="opacity-40" />
        <LandingPetDecorations preset="cta" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Heart className="w-4 h-4 text-white" />
            <span className="text-white font-medium text-sm">Únete al ecosistema pet-tech</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            ¿Listo para empezar?
          </h2>
          <p className="text-lg md:text-xl text-white/85 mb-10 max-w-2xl mx-auto">
            Regístrate gratis como cliente, proveedor o refugio y accede a tu experiencia PetHub en segundos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto bg-white text-landing-aqua-dark hover:bg-gray-100 text-lg px-8 py-4 h-auto shadow-lg font-semibold">
                Crear Cuenta Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-landing-aqua-dark text-lg px-8 py-4 h-auto font-semibold bg-white/10 backdrop-blur-sm">
                Hablar con ventas
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              { value: String(publicPlatformRoles.length), label: 'Perfiles públicos' },
              { value: `${totalModules}+`, label: 'Módulos' },
              { value: '100%', label: 'Gratis' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-white/70 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
