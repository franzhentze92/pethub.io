import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle, PawPrint, ArrowRight, Heart, Search,
  MessageCircle, Clock, Mail, Phone, X,
} from 'lucide-react';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import {
  faqCategories, faqItems, searchFaqs,
} from '@/data/faqsPageData';

export const FAQs: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(
    () => searchFaqs(searchQuery, activeCategory),
    [searchQuery, activeCategory]
  );

  const activeCat = faqCategories.find((c) => c.id === activeCategory) ?? faqCategories[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* ── HERO ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <LandingAmbientBackground variant="hero" />
        <LandingPetDecorations preset="hero" />
        <div className="absolute inset-0 bg-landing-aqua" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 inline-flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Centro de ayuda
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Preguntas{' '}
            <span className="text-landing-tropical">frecuentes</span>
          </h1>

          <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
            {faqItems.length} respuestas organizadas por tema. Busca directamente o explora por categoría.
          </p>

          {/* Search in hero */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar pregunta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-10 h-14 text-base bg-white/95 backdrop-blur border-0 shadow-xl rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5">
              <PawPrint className="w-3.5 h-3.5 mr-1.5 inline" />
              {faqItems.length} preguntas
            </Badge>
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 mr-1.5 inline" />
              Respuesta en &lt;24h
            </Badge>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS + FAQS ── */}
      <section className="relative py-16 md:py-24">
        <LandingPetDecorations preset="section" className="opacity-30" />

        <div className="relative w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {faqCategories.map((cat) => {
              const count = cat.id === 'all'
                ? faqItems.length
                : faqItems.filter((f) => f.category === cat.id).length;
              if (cat.id !== 'all' && count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === cat.id
                      ? `${cat.gradient} ${cat.colorText} shadow-md`
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-landing-aqua/40 hover:text-landing-aqua-dark'
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeCategory === cat.id ? 'bg-white/25' : 'bg-gray-100'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active category header */}
          {activeCategory !== 'all' && (
            <div className={`rounded-xl p-5 md:p-6 mb-6 ${activeCat.gradient} ${activeCat.colorText} w-full`}>
              <div className="flex items-center gap-3">
                <activeCat.icon className="w-5 h-5" />
                <div>
                  <p className="font-semibold">{activeCat.label}</p>
                  <p className="text-sm text-white/80">{activeCat.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          {(searchQuery || activeCategory !== 'all') && (
            <p className="text-sm text-gray-500 mb-4">
              {filteredFaqs.length} resultado{filteredFaqs.length !== 1 ? 's' : ''}
              {searchQuery && <> para "<span className="font-medium text-gray-700">{searchQuery}</span>"</>}
            </p>
          )}

          {/* FAQ Accordion */}
          {filteredFaqs.length > 0 ? (
            <Accordion type="multiple" className="space-y-3 w-full">
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow px-4 md:px-6 border-b-0 overflow-hidden w-full"
                >
                  <AccordionTrigger className="hover:no-underline py-4 text-left gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-landing-aqua rounded-lg flex items-center justify-center shrink-0">
                        <faq.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm md:text-base leading-snug">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed pb-4 pl-12 text-sm md:text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No encontramos resultados</p>
              <p className="text-sm text-gray-400 mb-6">Prueba con otras palabras o explora otra categoría.</p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                Ver todas las preguntas
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── ENLACES RÁPIDOS ── */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <p className="text-center text-sm text-gray-500 mb-6">¿Buscas algo más específico?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Ver funcionalidades', href: '/features', desc: 'Catálogo completo de módulos' },
              { label: 'Ver precios', href: '/pricing', desc: 'Planes y comparativa' },
              { label: 'Contactar soporte', href: '/contact', desc: 'Formulario directo' },
            ].map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group p-4 rounded-xl border border-gray-100 hover:border-landing-aqua/30 hover:shadow-md transition-all text-center"
              >
                <p className="font-semibold text-gray-900 group-hover:text-landing-aqua-dark text-sm">{link.label}</p>
                <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SOPORTE ── */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <LandingPetDecorations preset="cta" />
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <div className="relative bg-landing-mango rounded-2xl p-8 md:p-12 overflow-hidden shadow-xl w-full">
            <div className="absolute inset-0 bg-black/10" />
            <LandingAmbientBackground variant="dark" className="opacity-20" />

            <div className="relative z-10 text-center">
              <Badge className="mb-5 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
                <Heart className="w-4 h-4 mr-2 inline" />
                Soporte personalizado
              </Badge>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                ¿No encontraste tu respuesta?
              </h2>
              <p className="text-white/85 mb-8 max-w-lg mx-auto">
                Nuestro equipo responde en menos de 24 horas. Escríbenos y te ayudamos.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link to="/contact">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-landing-aqua-dark hover:bg-gray-100 font-semibold shadow-lg">
                    <MessageCircle className="mr-2 w-5 h-5" />
                    Contactar soporte
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@pethub.gt
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +502 1234-5678
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
