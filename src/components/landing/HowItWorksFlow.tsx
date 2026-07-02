import React from 'react';
import { howItWorksSteps } from '@/data/landingPlatformData';
import { LandingAmbientBackground } from './LandingAmbientBackground';
import { LandingPetDecorations } from './LandingPetDecorations';

export const HowItWorksFlow: React.FC = () => {
  return (
    <section className="relative py-20 md:py-28 bg-gray-950 overflow-hidden">
      <LandingAmbientBackground variant="dark" />
      <LandingPetDecorations preset="dark" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-landing-aqua mb-3">
            Cómo funciona
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            De registro a ecosistema completo
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Cuatro pasos para entender cómo PetHub conecta a todos los actores del mundo pet.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-landing-aqua via-landing-mint to-landing-mango opacity-30" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {howItWorksSteps.map((step, i) => (
              <div
                key={i}
                className="relative group"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-landing-aqua/30 transition-all duration-300 hover:-translate-y-1 h-full">
                  {/* Step number */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mango flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-3xl font-black text-white/10 group-hover:text-landing-aqua/30 transition-colors">
                      {step.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow connector (mobile/tablet) */}
                {i < howItWorksSteps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-2 text-landing-aqua/40">
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
