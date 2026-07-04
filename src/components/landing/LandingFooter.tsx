import React from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-3 md:mb-4">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-landing-aqua rounded-lg flex items-center justify-center">
                <PawPrint className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold">PetHub</span>
            </div>
            <p className="text-gray-300 mb-3 md:mb-4 max-w-md text-sm md:text-base">
              La plataforma integral para el cuidado y bienestar de tus mascotas.
            </p>
            <div className="flex space-x-3 md:space-x-4">
              <a href="#" className="text-gray-400 hover:text-landing-aqua transition-colors">
                <Facebook className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-landing-aqua transition-colors">
                <Twitter className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-landing-mango transition-colors">
                <Instagram className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-landing-mint transition-colors">
                <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold mb-3 md:mb-4 text-landing-aqua">Enlaces</h3>
            <ul className="space-y-1 md:space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-landing-aqua transition-colors text-xs md:text-sm">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-landing-aqua transition-colors text-xs md:text-sm">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-gray-300 hover:text-landing-aqua transition-colors text-xs md:text-sm">
                  Características
                </Link>
              </li>
              <li>
                <Link to="/faqs" className="text-gray-300 hover:text-landing-aqua transition-colors text-xs md:text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-landing-aqua transition-colors text-xs md:text-sm">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-3 md:mb-4 text-landing-mango">Contacto</h3>
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-3 h-3 md:w-4 md:h-4 text-landing-aqua" />
                <span className="text-gray-300 text-xs md:text-sm">info@pethub.gt</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-3 h-3 md:w-4 md:h-4 text-landing-mango" />
                <span className="text-gray-300 text-xs md:text-sm">+502 1234-5678</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-6 md:mt-8 pt-4 md:pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-xs md:text-sm text-center md:text-left">
              © 2024 PetHub. Todos los derechos reservados.
            </p>
            <div className="flex space-x-4 md:space-x-6 mt-3 md:mt-0">
              <Link to="/privacy" className="text-gray-400 hover:text-landing-aqua text-xs md:text-sm transition-colors">
                Privacidad
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-landing-aqua text-xs md:text-sm transition-colors">
                Términos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
