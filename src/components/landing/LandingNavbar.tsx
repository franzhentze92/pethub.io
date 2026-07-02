import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, PawPrint, Heart, MessageCircle, Zap, HelpCircle, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { landingBtnHero, landingBtnOutline } from '@/lib/landingTheme';

export const LandingNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Inicio', href: '/', icon: PawPrint },
    { name: 'Nosotros', href: '/about', icon: Heart },
    { name: 'Características', href: '/features', icon: Zap },
    { name: 'Pitch', href: '/pitch', icon: Presentation },
    { name: 'FAQ', href: '/faqs', icon: HelpCircle },
    { name: 'Contacto', href: '/contact', icon: MessageCircle },
  ];

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (active: boolean) =>
    active
      ? 'text-landing-aqua-dark bg-landing-aqua/10 shadow-sm'
      : 'text-gray-600 hover:text-landing-aqua-dark hover:bg-landing-aqua/10 hover:shadow-sm';

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-landing-aqua/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-landing-aqua to-landing-mango rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-landing-aqua-dark transition-colors duration-300">PetHub</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${navLinkClass(isActive(item.href))}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/login">
              <Button variant="outline" className={`${landingBtnOutline} font-medium`}>
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button className={`${landingBtnHero} transform hover:-translate-y-0.5 font-medium`}>
                Registrarse
                <Badge className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5">Gratis</Badge>
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/95 backdrop-blur-sm border-t border-landing-aqua/20">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${navLinkClass(isActive(item.href))}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <div className="pt-4 space-y-4">
              <Link to="/login" className="block">
                <Button variant="outline" className={`w-full ${landingBtnOutline} font-medium`}>
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register" className="block mt-4">
                <Button className={`w-full ${landingBtnHero} font-medium`}>
                  Registrarse
                  <Badge className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5">Gratis</Badge>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
