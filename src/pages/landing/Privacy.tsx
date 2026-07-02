import React from 'react';
import { Link } from 'react-router-dom';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Shield, Lock, Eye, Database, UserCheck, FileText, ArrowLeft } from 'lucide-react';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-landing-aqua to-landing-mango py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Shield className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Política de Privacidad</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Tu <span className="text-yellow-300">Privacidad</span> es Nuestra Prioridad
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              En PetHub, protegemos y respetamos tu información personal. 
              Conoce cómo recopilamos, usamos y protegemos tus datos.
            </p>
          </div>
        </section>

        {/* Back to Home */}
        <section className="py-8 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-landing-aqua-dark hover:text-landing-mango-dark font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio
            </Link>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              
              {/* Last Updated */}
              <div className="bg-landing-aqua/10 border-l-4 border-landing-aqua p-4 mb-8">
                <p className="text-landing-aqua-dark">
                  <strong>Última actualización:</strong> 15 de enero de 2024
                </p>
              </div>

              {/* Introduction */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileText className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Introducción
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-4">
                  En PetHub, valoramos tu confianza y nos comprometemos a proteger tu información personal. 
                  Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos 
                  tu información cuando utilizas nuestra plataforma.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Al usar PetHub, aceptas las prácticas descritas en esta política. 
                  Si no estás de acuerdo con alguna parte de esta política, por favor no uses nuestros servicios.
                </p>
              </div>

              {/* Information We Collect */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Database className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Información que Recopilamos
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Información Personal</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Nombre completo</li>
                      <li>• Dirección de correo electrónico</li>
                      <li>• Número de teléfono</li>
                      <li>• Dirección física (opcional)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Información de Mascotas</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Nombre y datos básicos</li>
                      <li>• Historial médico</li>
                      <li>• Fotos y videos</li>
                      <li>• Información de ejercicio y nutrición</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Información Técnica</h3>
                  <ul className="text-gray-600 space-y-2">
                    <li>• Dirección IP y ubicación aproximada</li>
                    <li>• Tipo de navegador y dispositivo</li>
                    <li>• Páginas visitadas y tiempo de uso</li>
                    <li>• Cookies y tecnologías similares</li>
                  </ul>
                </div>
              </div>

              {/* How We Use Information */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Eye className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Cómo Usamos tu Información
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-landing-aqua/15 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-landing-aqua-dark text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Proporcionar Servicios</h3>
                      <p className="text-gray-600">Para ofrecerte las funcionalidades de la plataforma, incluyendo el seguimiento de salud, recordatorios y conectarte con veterinarios.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-landing-aqua/15 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-landing-aqua-dark text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Comunicación</h3>
                      <p className="text-gray-600">Para enviarte actualizaciones importantes, recordatorios de citas veterinarias y notificaciones sobre el cuidado de tus mascotas.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-landing-aqua/15 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-landing-aqua-dark text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Mejora del Servicio</h3>
                      <p className="text-gray-600">Para analizar el uso de la plataforma y mejorar nuestras funcionalidades y experiencia de usuario.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-landing-aqua/15 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-landing-aqua-dark text-sm font-bold">4</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Seguridad</h3>
                      <p className="text-gray-600">Para proteger tu cuenta y detectar actividades fraudulentas o no autorizadas.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Lock className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Protección de Datos
                </h2>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold text-green-800 mb-3">Medidas de Seguridad</h3>
                  <ul className="text-green-700 space-y-2">
                    <li>• Encriptación SSL/TLS para todas las comunicaciones</li>
                    <li>• Almacenamiento seguro en servidores protegidos</li>
                    <li>• Acceso restringido solo a personal autorizado</li>
                    <li>• Copias de seguridad regulares y seguras</li>
                    <li>• Monitoreo continuo de seguridad</li>
                  </ul>
                </div>
                
                <p className="text-lg text-gray-600 leading-relaxed">
                  Implementamos medidas técnicas y organizativas apropiadas para proteger tu información 
                  personal contra acceso no autorizado, alteración, divulgación o destrucción.
                </p>
              </div>

              {/* Your Rights */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <UserCheck className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Tus Derechos
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-landing-aqua/10 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-landing-aqua-dark mb-3">Acceso y Corrección</h3>
                    <p className="text-landing-aqua-dark">Puedes acceder, actualizar o corregir tu información personal en cualquier momento desde tu cuenta.</p>
                  </div>
                  
                  <div className="bg-landing-aqua/10 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-landing-aqua-dark mb-3">Eliminación</h3>
                    <p className="text-landing-aqua-dark">Puedes solicitar la eliminación de tu cuenta y datos personales en cualquier momento.</p>
                  </div>
                  
                  <div className="bg-landing-aqua/10 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-landing-aqua-dark mb-3">Portabilidad</h3>
                    <p className="text-landing-aqua-dark">Puedes solicitar una copia de tus datos en un formato estructurado y legible.</p>
                  </div>
                  
                  <div className="bg-landing-aqua/10 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-landing-aqua-dark mb-3">Oposición</h3>
                    <p className="text-landing-aqua-dark">Puedes oponerte al procesamiento de tus datos para fines de marketing.</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Contacto</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-lg text-gray-600 mb-4">
                    Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tu información, 
                    puedes contactarnos:
                  </p>
                  <ul className="text-gray-600 space-y-2">
                    <li><strong>Email:</strong> privacidad@pethub.com</li>
                    <li><strong>Dirección:</strong> Operaciones regionales — Latinoamérica</li>
                    <li><strong>Teléfono:</strong> +502 1234-5678</li>
                  </ul>
                </div>
              </div>

              {/* Changes */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Cambios a esta Política</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre 
                  cambios significativos a través de la plataforma o por correo electrónico. 
                  Te recomendamos revisar esta política periódicamente.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>
      
      <LandingFooter />
    </div>
  );
};
