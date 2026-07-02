import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'Gratuito',
      price: '0',
      period: 'por siempre',
      description: 'Perfecto para comenzar con el cuidado básico de tus mascotas.',
      features: [
        'Hasta 2 mascotas',
        'Trazabilidad básica',
        'Acceso al marketplace',
        'Soporte por email',
        'Funcionalidades básicas de adopción'
      ],
      popular: false,
      color: 'from-gray-500 to-gray-600'
    },
    {
      name: 'Premium',
      price: '29',
      period: 'por mes',
      description: 'Ideal para familias con múltiples mascotas que quieren análisis avanzados.',
      features: [
        'Hasta 10 mascotas',
        'Trazabilidad completa (Física, Nutricional, Veterinaria)',
        'Análisis y estadísticas avanzadas',
        'Recordatorios personalizados',
        'Soporte prioritario',
        'Acceso a veterinarios verificados',
        'Historial médico completo',
        'Exportación de datos'
      ],
      popular: true,
      color: 'from-landing-aqua to-landing-mint'
    },
    {
      name: 'Profesional',
      price: '79',
      period: 'por mes',
      description: 'Para veterinarios y proveedores de servicios que quieren gestionar múltiples clientes.',
      features: [
        'Mascotas ilimitadas',
        'Todas las funcionalidades Premium',
        'Panel de gestión profesional',
        'Reportes y analytics avanzados',
        'API de integración',
        'Soporte 24/7',
        'Capacitación personalizada',
        'White-label disponible'
      ],
      popular: false,
      color: 'from-landing-aqua to-landing-mint'
    }
  ];

  const features = [
    {
      title: 'Trazabilidad Completa',
      free: 'Básica',
      premium: 'Completa',
      professional: 'Avanzada'
    },
    {
      title: 'Número de Mascotas',
      free: '2',
      premium: '10',
      professional: 'Ilimitadas'
    },
    {
      title: 'Análisis y Reportes',
      free: 'Básicos',
      premium: 'Avanzados',
      professional: 'Profesionales'
    },
    {
      title: 'Soporte',
      free: 'Email',
      premium: 'Prioritario',
      professional: '24/7'
    },
    {
      title: 'Integración API',
      free: 'No',
      premium: 'No',
      professional: 'Sí'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-landing-aqua to-landing-mint py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Planes y Precios
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades. 
            Todos los planes incluyen acceso completo a la plataforma.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Elige tu Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comienza gratis y actualiza cuando necesites más funcionalidades.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 ${
                  plan.popular ? 'ring-2 ring-landing-aqua scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-landing-aqua to-landing-mint text-white px-4 py-2">
                      Más Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-landing-mint-dark mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6">
                                         <Link to={plan.name === 'Gratuito' ? '/app' : '/contact'}>
                       <Button 
                         className="w-full bg-landing-aqua-dark hover:bg-landing-aqua text-white text-lg py-3"
                       >
                         {plan.name === 'Gratuito' ? 'Comenzar Gratis' : 'Elegir Plan'}
                         <ArrowRight className="ml-2 w-4 h-4" />
                       </Button>
                     </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comparación de Funcionalidades
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Compara detalladamente lo que incluye cada plan.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Funcionalidad</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Gratuito</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Premium</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Profesional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {features.map((feature, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {feature.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {feature.free}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {feature.premium}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {feature.professional}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Preguntas sobre Precios
            </h2>
            <p className="text-xl text-gray-600">
              Resolvemos las dudas más comunes sobre nuestros planes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿Puedo cambiar de plan en cualquier momento?
                </h3>
                <p className="text-gray-600">
                  Sí, puedes actualizar o degradar tu plan en cualquier momento. 
                  Los cambios se aplican inmediatamente.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿La plataforma es gratis?
                </h3>
                <p className="text-gray-600">
                  Sí. PetHub es gratis para registrarte y usar. No hay período de prueba ni tarjeta
                  de crédito requerida para empezar.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿Qué métodos de pago aceptan?
                </h3>
                <p className="text-gray-600">
                  Aceptamos tarjetas de crédito/débito, transferencias bancarias 
                  y pagos móviles. Todos los pagos son seguros y encriptados.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿Ofrecen descuentos para organizaciones?
                </h3>
                <p className="text-gray-600">
                  Sí, ofrecemos descuentos especiales para albergues, 
                  clínicas veterinarias y organizaciones sin fines de lucro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-landing-aqua to-landing-mint">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            ¿Listo para Comenzar?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Únete a miles de familias que ya confían en PetHub para 
            el cuidado de sus mascotas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
                         <Link to="/register">
               <Button size="lg" className="bg-white text-landing-aqua-dark hover:bg-gray-100 text-lg px-8 py-3">
                 Crear Cuenta Gratis
                 <ArrowRight className="ml-2 w-5 h-5" />
               </Button>
             </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-landing-aqua-dark text-lg px-8 py-3">
                Contactar Ventas
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
