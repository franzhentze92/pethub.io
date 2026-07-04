import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Heart, Target, Award, Globe, ArrowRight, Shield,
  PawPrint, CheckCircle, Star, Eye, MapPin, Sparkles,
  Lightbulb, Rocket, Mail, HandHeart, Leaf, Building2,
} from 'lucide-react';
import { landingBadge } from '@/lib/landingTheme';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';

const values = [
  {
    icon: Heart,
    title: 'Amor por los Animales',
    description: 'Cada decisión que tomamos — de producto a partnerships — nace del respeto genuino por el bienestar animal.',
    color: 'bg-landing-mango',
    bg: 'bg-landing-mango/10',
    iconText: 'text-gray-900',
  },
  {
    icon: Users,
    title: 'Comunidad',
    description: 'No construimos software en aislamiento: escuchamos a clientes, refugios y veterinarios para crecer juntos.',
    color: 'bg-landing-aqua',
    bg: 'bg-landing-aqua/10',
    iconText: 'text-white',
  },
  {
    icon: Lightbulb,
    title: 'Innovación con Propósito',
    description: 'Adoptamos tecnología solo cuando resuelve un problema real del cuidado animal en nuestra región.',
    color: 'bg-landing-mint',
    bg: 'bg-landing-mint/10',
    iconText: 'text-gray-900',
  },
  {
    icon: Shield,
    title: 'Responsabilidad',
    description: 'Transparencia, privacidad de datos y estándares éticos en cada relación con usuarios y aliados.',
    color: 'bg-landing-aqua',
    bg: 'bg-landing-aqua/10',
    iconText: 'text-white',
  },
];

const milestones = [
  {
    year: '2023',
    icon: Lightbulb,
    title: 'El problema',
    description: 'Vimos familias usando hojas de cálculo, WhatsApp y cuadernos para cuidar a sus mascotas. Refugios sin herramientas digitales. Negocios pet desconectados.',
    color: 'bg-landing-tropical',
    iconText: 'text-gray-900',
  },
  {
    year: '2024',
    icon: Rocket,
    title: 'PetHub nace',
    description: 'Fundamos PetHub con la convicción de que el cuidado animal en Latinoamérica merece una respuesta accesible y humana — respaldada por buena tecnología.',
    color: 'bg-landing-aqua',
    iconText: 'text-white',
  },
  {
    year: 'Hoy',
    icon: Sparkles,
    title: 'Creciendo con propósito',
    description: 'Seguimos construyendo al lado de nuestra comunidad, ampliando alianzas con refugios, clínicas y emprendedores pet en la región.',
    color: 'bg-landing-mango',
    iconText: 'text-gray-900',
  },
];

const commitments = [
  {
    icon: HandHeart,
    title: 'Adopción responsable',
    description: 'Apoyamos a refugios y familias en procesos de adopción seguros, con seguimiento y educación.',
  },
  {
    icon: Leaf,
    title: 'Impacto regional',
    description: 'Priorizamos soluciones pensadas para Latinoamérica — idioma, contexto y realidad del mercado pet en la región.',
  },
  {
    icon: Building2,
    title: 'Aliados de confianza',
    description: 'Trabajamos con veterinarios, tiendas y albergues verificados que comparten nuestros valores de calidad y ética.',
  },
];

const teamPrinciples = [
  'Escuchamos antes de construir',
  'Priorizamos el bienestar animal sobre las métricas',
  'Diseñamos para familias reales, no solo para demos',
  'Crecemos de forma sostenible y responsable',
];

export const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* ── HERO ── */}
      <section className="relative min-h-[65vh] flex items-center py-20 md:py-28 overflow-hidden">
        <LandingAmbientBackground variant="hero" />
        <LandingPetDecorations preset="hero" />
        <div className="absolute inset-0 bg-landing-aqua" />
        <div className="absolute inset-0 bg-black/15" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 inline-flex items-center gap-2">
            <PawPrint className="w-4 h-4" />
            Sobre PetHub
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Una plataforma latinoamericana{' '}
            <span className="text-landing-tropical">al servicio de las mascotas</span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto mb-8">
            Somos un equipo apasionado por el bienestar animal. Creamos PetHub porque creemos
            que las familias, refugios y negocios pet en Latinoamérica merecen mejores herramientas
            — y un ecosistema que los conecte con propósito.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5 backdrop-blur-sm">
              <MapPin className="w-3.5 h-3.5 mr-1.5 inline" />
              Latinoamérica
            </Badge>
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5 backdrop-blur-sm">
              <Heart className="w-3.5 h-3.5 mr-1.5 inline" />
              Bienestar animal
            </Badge>
            <Badge className="bg-white/15 text-white border-white/25 px-3 py-1.5 backdrop-blur-sm">
              <Users className="w-3.5 h-3.5 mr-1.5 inline" />
              Enfoque comunitario
            </Badge>
          </div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-white">
        <LandingPetDecorations preset="section" className="opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
                Quiénes somos
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Más que una plataforma — un movimiento regional
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  PetHub es una empresa de tecnología con enfoque latinoamericano, dedicada a mejorar
                  la vida de las mascotas y de quienes las cuidan. Nacimos de una observación
                  simple: el cuidado animal en la región estaba fragmentado, informal y
                  difícil de coordinar.
                </p>
                <p>
                  Nuestro equipo reúne experiencia en software, diseño y pasión por los animales.
                  Trabajamos cerca de familias, refugios y profesionales del sector pet para
                  entender sus necesidades reales — no las que asumimos desde un escritorio.
                </p>
                <p>
                  Hoy seguimos creciendo con los pies en la tierra: escuchando, iterando y
                  construyendo relaciones de confianza con nuestra comunidad.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-landing-aqua/20 rounded-3xl blur-2xl" />
              <div className="relative bg-landing-aqua/10 rounded-2xl p-8 md:p-10 border border-landing-aqua/20 shadow-lg">
                <blockquote className="text-lg md:text-xl text-gray-800 font-medium leading-relaxed italic mb-6">
                  "Creemos que cuando una comunidad tiene las herramientas correctas,
                  cada mascota tiene más oportunidades de una vida sana, feliz y amada."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-landing-aqua rounded-full flex items-center justify-center">
                    <PawPrint className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">El equipo PetHub</p>
                    <p className="text-sm text-gray-500">Latinoamérica · 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-landing-aqua/5">
        <LandingPetDecorations preset="section" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
              <Rocket className="w-3.5 h-3.5 mr-1.5 inline" />
              Nuestra historia
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Cómo llegamos hasta aquí
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Tres momentos que definieron quiénes somos como empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {milestones.map((m, i) => (
              <div key={i} className="relative group">
                {i < milestones.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-landing-aqua/40" />
                )}
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <m.icon className={`w-6 h-6 ${m.iconText}`} />
                    </div>
                    <span className="text-2xl font-black text-landing-aqua/30">{m.year}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{m.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISIÓN & VISIÓN ── */}
      <section className="relative py-20 md:py-28 bg-white overflow-hidden">
        <LandingPetDecorations preset="bento" className="opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            <div className="rounded-2xl p-8 md:p-10 bg-landing-aqua/10 border border-landing-aqua/20 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-landing-aqua rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Misión</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                Mejorar la calidad de vida de las mascotas en Latinoamérica,
                conectando a las personas y organizaciones que las cuidan a través de
                tecnología accesible, humana y confiable.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Queremos que ninguna familia sienta que cuidar bien a su mascota es
                complicado, costoso o solitario.
              </p>
            </div>

            <div className="rounded-2xl p-8 md:p-10 bg-gray-900 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-landing-aqua/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-landing-mango rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">Visión</h2>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Ser la empresa de referencia en Latinoamérica para el bienestar animal
                  digital — reconocida no solo por nuestra tecnología, sino por el impacto
                  real que generamos en familias, refugios y comunidades.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: Globe, text: 'Presencia en Latinoamérica' },
                    { icon: Award, text: 'Reconocidos por impacto social pet' },
                    { icon: Heart, text: 'Aliado de confianza del sector animal' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                      <item.icon className="w-4 h-4 text-landing-aqua shrink-0" />
                      <span className="text-sm text-gray-300">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALORES ── */}
      <section className="relative py-20 md:py-28 bg-white overflow-hidden">
        <LandingPetDecorations preset="section" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
              <Star className="w-3.5 h-3.5 mr-1.5 inline" />
              Nuestros valores
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Lo que nos define como empresa
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Estos principios guían cómo trabajamos, a quién elegimos como aliado y qué decisiones tomamos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((value, i) => (
              <div
                key={i}
                className={`group rounded-2xl p-6 ${value.bg} border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`w-14 h-14 ${value.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                  <value.icon className={`w-7 h-7 ${value.iconText}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPROMISO SOCIAL ── */}
      <section className="relative py-20 md:py-28 bg-gray-900 overflow-hidden">
        <LandingAmbientBackground variant="dark" className="opacity-40" />
        <LandingPetDecorations preset="dark" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-landing-aqua mb-3">
              Compromiso
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Más allá del software
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              PetHub existe para generar impacto real en la vida de mascotas y personas — no solo para vender licencias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {commitments.map((item, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 bg-landing-mint rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO TRABAJAMOS ── */}
      <section className="relative py-20 md:py-28 bg-white overflow-hidden">
        <LandingPetDecorations preset="bento" className="opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className={`mb-4 px-4 py-2 ${landingBadge}`}>
                Nuestra cultura
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Cómo trabajamos en PetHub
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                Somos un equipo pequeño y enfocado. Cada persona en PetHub comparte
                una obsesión: que nuestra plataforma realmente ayude — no que impresione
                en una presentación.
              </p>
              <ul className="space-y-4">
                {teamPrinciples.map((principle, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-landing-mint-dark shrink-0 mt-0.5" />
                    <span className="text-gray-700">{principle}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Región', value: 'LATAM', sub: 'enfoque regional' },
                { label: 'Enfoque', value: 'Bienestar', sub: 'animal primero' },
                { label: 'Modelo', value: 'Comunidad', sub: 'crecemos juntos' },
                { label: 'Fundada', value: '2024', sub: 'crecimiento continuo' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-landing-aqua/10 rounded-2xl p-5 border border-landing-aqua/15 text-center"
                >
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-xl font-bold text-landing-aqua-dark">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 md:py-28 bg-landing-tropical overflow-hidden">
        <LandingPetDecorations preset="cta" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
            <Heart className="w-4 h-4 mr-2 inline" />
            Conversemos
          </Badge>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ¿Quieres conocernos mejor?
          </h2>
          <p className="text-lg text-white/85 mb-10 max-w-xl mx-auto">
            Ya sea que quieras colaborar, ser aliado o simplemente saber más sobre
            lo que hacemos — nos encantaría escucharte.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button size="lg" className="w-full sm:w-auto bg-white text-landing-aqua-dark hover:bg-gray-100 text-lg px-8 py-4 h-auto shadow-lg font-semibold">
                <Mail className="mr-2 w-5 h-5" />
                Contactar al equipo
              </Button>
            </Link>
            <Link to="/features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-landing-aqua-dark text-lg px-8 py-4 h-auto font-semibold bg-white/10 backdrop-blur-sm">
                Ver la plataforma
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
