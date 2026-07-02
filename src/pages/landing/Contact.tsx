import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle, PawPrint, Send, CheckCircle, Heart,
  MapPin, Clock, ArrowRight, HelpCircle, Globe,
} from 'lucide-react';
import { landingBadge, landingBtnHero } from '@/lib/landingTheme';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';
import {
  contactChannels, inquiryTypes, officeHours,
  supportHighlights,
} from '@/data/contactPageData';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  company: '',
  inquiryType: '',
};

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData(initialForm);
    }, 3000);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* ── HERO ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <LandingAmbientBackground variant="hero" />
        <LandingPetDecorations preset="hero" />
        <div className="absolute inset-0 bg-gradient-to-br from-landing-aqua/90 via-landing-mint/85 to-landing-mango/90" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 inline-flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Centro de contacto
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Hablemos de tu{' '}
            <span className="text-landing-tropical">mascota</span>
          </h1>

          <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
            Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de 24 horas.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 mr-1.5 inline" />
              Respuesta en &lt;24h
            </Badge>
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5">
              <PawPrint className="w-3.5 h-3.5 mr-1.5 inline" />
              Soporte en español
            </Badge>
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5">
              <Heart className="w-3.5 h-3.5 mr-1.5 inline" />
              Atención personalizada
            </Badge>
          </div>
        </div>
      </section>

      {/* ── CANALES DE CONTACTO ── */}
      <section className="relative py-12 md:py-16 -mt-8 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactChannels.map((channel) => {
              const Wrapper = channel.href ? 'a' : 'div';
              const wrapperProps = channel.href
                ? { href: channel.href, className: 'block group' }
                : { className: 'group' };

              return (
                <Wrapper key={channel.title} {...wrapperProps}>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 p-5 text-center h-full hover:-translate-y-1">
                    <div className={`w-12 h-12 bg-gradient-to-br ${channel.gradient} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                      <channel.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm mb-2">{channel.title}</p>
                    {channel.details.map((detail) => (
                      <p key={detail} className="text-xs text-gray-500 leading-relaxed">{detail}</p>
                    ))}
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FORMULARIO + MAPA ── */}
      <section className="relative py-12 md:py-20">
        <LandingPetDecorations preset="section" className="opacity-25" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className={`mb-4 ${landingBadge} px-4 py-2`}>
              <Send className="w-4 h-4 mr-2 inline" />
              Envíanos un mensaje
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Formulario de contacto
            </h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              Completa los campos y nos pondremos en contacto contigo pronto.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form — 3 cols */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 md:p-8">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-landing-mint to-landing-aqua rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Mensaje enviado!</h3>
                    <p className="text-gray-600">
                      Gracias por contactarnos. Te responderemos en menos de 24 horas.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          placeholder="Tu nombre"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="tu@email.com"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+502 1234-5678"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Empresa / Refugio</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          placeholder="Opcional"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="inquiryType">Tipo de consulta *</Label>
                      <Select
                        value={formData.inquiryType}
                        onValueChange={(v) => handleSelectChange('inquiryType', v)}
                        required
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Selecciona el tipo de consulta" />
                        </SelectTrigger>
                        <SelectContent>
                          {inquiryTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="subject">Asunto *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        placeholder="Resumen de tu consulta"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Mensaje *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={5}
                        placeholder="Describe tu consulta en detalle..."
                        className="mt-1.5 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      className={`w-full ${landingBtnHero} text-base py-6 h-auto font-semibold`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar mensaje
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Sidebar — 2 cols */}
            <div className="lg:col-span-2 space-y-5">
              {/* Cobertura regional */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-landing-aqua-dark" />
                    <p className="font-semibold text-gray-900 text-sm">Cobertura regional</p>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-landing-mint/10 via-white to-landing-aqua/10">
                  <div className="rounded-xl border border-landing-aqua/20 bg-white/80 p-5 text-center">
                    <Globe className="w-10 h-10 mx-auto mb-3 text-landing-aqua-dark" />
                    <p className="font-semibold text-gray-900">Latinoamérica</p>
                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                      PetHub está pensado para dueños, proveedores y refugios en toda la región.
                      Escríbenos desde tu país — te respondemos en español.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-landing-mango-dark" />
                  <p className="font-semibold text-gray-900 text-sm">Horarios de atención</p>
                </div>
                <div className="space-y-2">
                  {officeHours.map((row) => (
                    <div
                      key={row.day}
                      className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm"
                    >
                      <span className="text-gray-600">{row.day}</span>
                      <span className={row.open ? 'font-medium text-gray-900' : 'font-medium text-red-400'}>
                        {row.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS ── */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportHighlights.map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-xl border border-gray-100 hover:border-landing-aqua/30 hover:shadow-md transition-all"
              >
                <div className={`w-9 h-9 bg-gradient-to-br ${item.gradient} rounded-lg flex items-center justify-center mb-3`}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ CTA ── */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <LandingPetDecorations preset="cta" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-r from-landing-aqua to-landing-mango rounded-2xl p-8 md:p-12 overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-black/10" />
            <LandingAmbientBackground variant="dark" className="opacity-20" />

            <div className="relative z-10 text-center">
              <Badge className="mb-5 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
                <HelpCircle className="w-4 h-4 mr-2 inline" />
                ¿Buscas respuesta rápida?
              </Badge>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Revisa nuestras preguntas frecuentes
              </h2>
              <p className="text-white/85 mb-8 max-w-lg mx-auto">
                35+ respuestas organizadas por categoría. Tal vez ya está ahí lo que necesitas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/faqs">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-landing-aqua-dark hover:bg-gray-100 font-semibold shadow-lg">
                    <HelpCircle className="mr-2 w-5 h-5" />
                    Ver FAQ
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-landing-aqua-dark font-semibold bg-white/10 backdrop-blur-sm"
                  >
                    Explorar funcionalidades
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
