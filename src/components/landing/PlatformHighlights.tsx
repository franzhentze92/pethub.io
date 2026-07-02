import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { platformHighlightCategories } from '@/data/landingPlatformData';
import { landingBadge } from '@/lib/landingTheme';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';

export const PlatformHighlights: React.FC = () => {
  const totalItems = platformHighlightCategories.reduce((n, c) => n + c.items.length, 0);

  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      <LandingPetDecorations preset="bento" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
            <Zap className="w-3.5 h-3.5 mr-1.5 inline" />
            {totalItems} capacidades clave
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Todo lo esencial,{' '}
            <span className="bg-gradient-to-r from-landing-aqua to-landing-mango bg-clip-text text-transparent">
              sin abrumar
            </span>
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Las funciones que definen PetHub — organizadas por área. Explora el catálogo completo en Funcionalidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {platformHighlightCategories.map((category) => (
            <div
              key={category.title}
              className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50/80 to-white p-5 md:p-6 shadow-sm hover:shadow-lg hover:border-landing-aqua/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-1 w-10 rounded-full bg-gradient-to-r ${category.gradient}`} />
                <h3 className="font-bold text-gray-900">{category.title}</h3>
              </div>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div key={item.title} className="flex items-start gap-3 group">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/features">
            <Button variant="outline" className="border-2 border-gray-200 hover:border-landing-aqua hover:text-landing-aqua-dark font-semibold">
              Ver catálogo completo de módulos
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
