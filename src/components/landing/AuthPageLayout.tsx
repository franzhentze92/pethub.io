import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { PawPrint, Home, ArrowLeft } from 'lucide-react';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import { authHighlights, authPageCopy } from '@/data/authPageData';

interface AuthPageLayoutProps {
  variant: 'login' | 'register';
  children: React.ReactNode;
  footer?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}

export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  variant,
  children,
  footer,
  backTo = '/',
  backLabel = 'Volver al inicio',
}) => {
  const copy = authPageCopy[variant];
  const isRegister = variant === 'register';

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  return (
    <div className="h-dvh w-full flex flex-col lg:flex-row overflow-hidden bg-gray-50">
      {/* ── LEFT PANEL ── */}
      <div className={`relative shrink-0 overflow-hidden ${
        isRegister
          ? 'hidden lg:flex lg:w-[38%] xl:w-[36%] h-full flex-col'
          : 'hidden lg:flex lg:w-[44%] xl:w-[42%] h-full flex-col'
      }`}>
        <LandingAmbientBackground variant="hero" />
        <LandingPetDecorations preset="hero" />
        <div className="absolute inset-0 bg-landing-aqua" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 p-5 xl:p-8 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <Link
              to={backTo}
              className="group inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1.5 text-white text-xs hover:bg-white/25 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              {backLabel}
            </Link>
            <Link to="/" className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs">
              <Home className="w-3.5 h-3.5" />
              pethub.gt
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center py-4 min-h-0">
            <Badge className="mb-3 w-fit bg-white/20 text-white border-white/30 backdrop-blur-sm px-2.5 py-1 text-xs">
              <PawPrint className="w-3 h-3 mr-1 inline" />
              {copy.badge}
            </Badge>

            <h1 className={`font-bold text-white leading-tight mb-2 ${
              isRegister ? 'text-2xl xl:text-3xl' : 'text-3xl xl:text-4xl'
            }`}>
              {copy.title}{' '}
              <span className="text-landing-tropical">{copy.highlight}</span>
            </h1>

            <p className="text-white/85 text-xs xl:text-sm max-w-sm mb-4 xl:mb-6 leading-relaxed">
              {copy.subtitle}
            </p>

            <div className={`grid grid-cols-2 gap-2 max-w-sm ${isRegister ? 'gap-1.5' : 'gap-3'}`}>
              {authHighlights.map((item) => (
                <div
                  key={item.title}
                  className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg ${
                    isRegister ? 'p-2' : 'p-3'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 text-landing-tropical mb-1" />
                  <p className="text-white font-medium text-xs">{item.title}</p>
                  {!isRegister && (
                    <p className="text-white/70 text-[10px] mt-0.5 leading-relaxed">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/50 text-[10px] shrink-0">Plataforma pet-tech · Latinoamérica</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-hidden relative">
        <LandingPetDecorations preset="section" className="opacity-10 pointer-events-none hidden lg:block" />

        {/* Mobile top bar */}
        <div className="lg:hidden shrink-0 flex items-center justify-between px-4 py-3 bg-landing-aqua">
          <Link to={backTo} className="inline-flex items-center gap-1.5 text-white text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel}
          </Link>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className={`flex-1 min-h-0 flex flex-col justify-center overflow-hidden ${
          isRegister ? 'px-4 sm:px-6 lg:px-8 xl:px-10 py-3 lg:py-4' : 'px-4 sm:px-8 lg:px-12 py-6 lg:py-8'
        }`}>
          <div className={`relative w-full mx-auto min-h-0 ${
            isRegister ? 'max-w-2xl' : 'max-w-md lg:max-w-lg'
          }`}>
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden ${
              isRegister ? 'p-4 sm:p-5 lg:p-6' : 'p-6 md:p-8'
            }`}>
              {children}
              {footer && (
                <div className={`text-center ${isRegister ? 'mt-3 pt-3 border-t border-gray-100' : 'mt-6'}`}>
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const authInputClass =
  'pl-9 h-9 text-sm border-gray-200 rounded-lg focus:border-landing-aqua focus:ring-2 focus:ring-landing-aqua/20 transition-all';

export const authInputClassLg =
  'pl-10 h-11 text-sm border-gray-200 rounded-xl focus:border-landing-aqua focus:ring-2 focus:ring-landing-aqua/20 transition-all';

export const authLabelClass = 'text-xs font-medium text-gray-700';
