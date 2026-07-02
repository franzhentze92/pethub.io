import React from 'react';
import { Link } from 'react-router-dom';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { FileText, Scale, AlertTriangle, CheckCircle, XCircle, ArrowLeft, Users, Shield } from 'lucide-react';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-landing-aqua to-landing-mango py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Scale className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Términos y Condiciones</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Términos de <span className="text-yellow-300">Servicio</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Estos términos rigen el uso de PetHub. 
              Por favor, léelos cuidadosamente antes de usar nuestra plataforma.
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

        {/* Terms Content */}
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
                  Bienvenido a PetHub. Estos Términos y Condiciones ("Términos") rigen tu uso de nuestra 
                  plataforma web y servicios relacionados (colectivamente, el "Servicio") operados por PetHub.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Al acceder o usar nuestro Servicio, aceptas estar sujeto a estos Términos. 
                  Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestro Servicio.
                </p>
              </div>

              {/* Acceptance */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Aceptación de los Términos</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Importante</h3>
                      <p className="text-yellow-700">
                        Al crear una cuenta, usar nuestros servicios o acceder a la plataforma, 
                        confirmas que has leído, entendido y aceptado estos Términos y Condiciones.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Description */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Users className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Descripción del Servicio
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-4">
                  PetHub es una plataforma integral para el cuidado de mascotas que ofrece:
                </p>
                <ul className="text-lg text-gray-600 space-y-2 mb-6">
                  <li>• Seguimiento de salud y ejercicio de mascotas</li>
                  <li>• Gestión de nutrición y recordatorios</li>
                  <li>• Conexión con veterinarios y proveedores de servicios</li>
                  <li>• Sistema de adopción responsable</li>
                  <li>• Marketplace de productos para mascotas</li>
                  <li>• Herramientas de análisis y reportes</li>
                </ul>
              </div>

              {/* User Accounts */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Cuentas de Usuario</h2>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Registro</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Debes proporcionar información precisa y actualizada</li>
                      <li>• Eres responsable de mantener la confidencialidad de tu cuenta</li>
                      <li>• Debes notificarnos inmediatamente sobre cualquier uso no autorizado</li>
                      <li>• Una persona no puede tener múltiples cuentas</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Responsabilidades</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Mantener tu información de contacto actualizada</li>
                      <li>• Usar la plataforma de manera responsable y legal</li>
                      <li>• No compartir tu cuenta con terceros</li>
                      <li>• Reportar contenido inapropiado o actividades sospechosas</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Acceptable Use */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Uso Aceptable</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Uso Permitido
                    </h3>
                    <ul className="text-green-700 space-y-2 text-sm">
                      <li>• Cuidar y gestionar información de tus mascotas</li>
                      <li>• Conectar con veterinarios y proveedores</li>
                      <li>• Compartir información médica con profesionales autorizados</li>
                      <li>• Usar herramientas de análisis para el bienestar animal</li>
                      <li>• Participar en la comunidad de adopción</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                      <XCircle className="w-5 h-5 mr-2" />
                      Uso Prohibido
                    </h3>
                    <ul className="text-red-700 space-y-2 text-sm">
                      <li>• Actividades ilegales o fraudulentas</li>
                      <li>• Spam, phishing o contenido malicioso</li>
                      <li>• Violación de derechos de propiedad intelectual</li>
                      <li>• Acoso, discriminación o contenido ofensivo</li>
                      <li>• Intentar acceder a cuentas de otros usuarios</li>
                      <li>• Uso comercial no autorizado</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Content and Data */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Contenido y Datos</h2>
                
                <div className="space-y-6">
                  <div className="bg-landing-aqua/10 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-landing-aqua-dark mb-3">Tu Contenido</h3>
                    <p className="text-landing-aqua-dark mb-3">
                      Mantienes todos los derechos sobre el contenido que subes a PetHub, incluyendo:
                    </p>
                    <ul className="text-landing-aqua-dark space-y-1 text-sm">
                      <li>• Fotos y videos de tus mascotas</li>
                      <li>• Información médica y de salud</li>
                      <li>• Comentarios y reseñas</li>
                      <li>• Datos de ejercicio y nutrición</li>
                    </ul>
                  </div>
                  
                  <div className="bg-landing-aqua/10 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-landing-aqua-dark mb-3">Licencia de Uso</h3>
                    <p className="text-landing-aqua-dark">
                      Al subir contenido, nos otorgas una licencia limitada para usar, almacenar y 
                      procesar tu contenido únicamente para proporcionar y mejorar nuestros servicios.
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy and Security */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Shield className="w-8 h-8 text-landing-aqua-dark mr-3" />
                  Privacidad y Seguridad
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-4">
                  Tu privacidad es importante para nosotros. Nuestro manejo de información personal 
                  se rige por nuestra Política de Privacidad, que forma parte integral de estos Términos.
                </p>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Medidas de Seguridad</h3>
                  <ul className="text-gray-600 space-y-2">
                    <li>• Encriptación de datos en tránsito y en reposo</li>
                    <li>• Acceso restringido a información personal</li>
                    <li>• Monitoreo continuo de seguridad</li>
                    <li>• Cumplimiento con estándares de protección de datos</li>
                  </ul>
                </div>
              </div>

              {/* Service Availability */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Disponibilidad del Servicio</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3">Sin Garantías</h3>
                  <p className="text-yellow-700">
                    Proporcionamos el servicio "tal como está" sin garantías de disponibilidad continua. 
                    Podemos experimentar interrupciones por mantenimiento, actualizaciones o circunstancias 
                    fuera de nuestro control.
                  </p>
                </div>
              </div>

              {/* Limitation of Liability */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Limitación de Responsabilidad</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">Exención de Responsabilidad</h3>
                  <p className="text-red-700 mb-3">
                    En la máxima medida permitida por la ley, PetHub no será responsable por:
                  </p>
                  <ul className="text-red-700 space-y-1 text-sm">
                    <li>• Daños indirectos, incidentales o consecuenciales</li>
                    <li>• Pérdida de datos o interrupción del negocio</li>
                    <li>• Decisiones médicas basadas en información de la plataforma</li>
                    <li>• Interacciones con terceros (veterinarios, proveedores)</li>
                  </ul>
                </div>
              </div>

              {/* Termination */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Terminación</h2>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Por tu Parte</h3>
                    <p className="text-gray-600">
                      Puedes terminar tu cuenta en cualquier momento eliminando tu perfil desde la configuración de la cuenta.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Por Nuestra Parte</h3>
                    <p className="text-gray-600">
                      Podemos suspender o terminar tu cuenta si violas estos Términos, 
                      proporcionas información falsa o por razones de seguridad.
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes to Terms */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Modificaciones</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Podemos modificar estos Términos ocasionalmente. Te notificaremos sobre cambios 
                  significativos a través de la plataforma o por correo electrónico. 
                  El uso continuado del servicio después de los cambios constituye aceptación de los nuevos términos.
                </p>
              </div>

              {/* Contact */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Contacto</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-lg text-gray-600 mb-4">
                    Si tienes preguntas sobre estos Términos y Condiciones, puedes contactarnos:
                  </p>
                  <ul className="text-gray-600 space-y-2">
                    <li><strong>Email:</strong> legal@pethub.com</li>
                    <li><strong>Dirección:</strong> Operaciones regionales — Latinoamérica</li>
                    <li><strong>Teléfono:</strong> +502 1234-5678</li>
                  </ul>
                </div>
              </div>

              {/* Governing Law */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Ley Aplicable</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Estos Términos se rigen por las leyes aplicables en la jurisdicción del usuario
                  dentro de Latinoamérica. Cualquier disputa se resolverá en los tribunales competentes
                  de dicha jurisdicción.
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
