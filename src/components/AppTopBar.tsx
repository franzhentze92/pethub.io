import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, PawPrint, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsDropdown from './SettingsDropdown';
import { useNavigation } from '@/contexts/NavigationContext';
import { landingFeatureGradients } from '@/lib/landingTheme';

const quickLinks = [
  { label: 'Dashboard', path: '/dashboard', gradientIndex: 0 },
  { label: 'Tienda', path: '/marketplace/products', gradientIndex: 2 },
  { label: 'Adopción', path: '/adopcion', gradientIndex: 1 },
];

export const AppTopBar: React.FC = () => {
  const { isMobileMenuOpen, toggleMobileMenu } = useNavigation();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/marketplace/products' && location.pathname.startsWith('/marketplace'));

  return (
    <header className="sticky top-0 z-[70] bg-white/90 backdrop-blur-md border-b border-landing-aqua/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: menu + logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="shrink-0 p-2 rounded-xl text-gray-600 hover:text-landing-aqua-dark hover:bg-landing-aqua/10"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <Link to="/dashboard" className="flex items-center gap-2 group min-w-0">
            <div className="w-8 h-8 shrink-0 bg-gradient-to-r from-landing-aqua to-landing-mango rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 truncate group-hover:text-landing-aqua-dark transition-colors sm:inline">
              PetHub
            </span>
          </Link>
        </div>

        {/* Center: desktop quick links */}
        <nav className="hidden md:flex items-center gap-1">
          {quickLinks.map((link) => {
            const active = isActive(link.path);
            const gradient = landingFeatureGradients[link.gradientIndex % landingFeatureGradients.length];
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  active
                    ? `bg-gradient-to-r ${gradient} text-white shadow-sm`
                    : 'text-gray-600 hover:text-landing-aqua-dark hover:bg-landing-aqua/10'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: settings */}
        <div className="shrink-0 flex items-center gap-2">
          <SettingsDropdown variant="default" />
        </div>
      </div>
    </header>
  );
};

export default AppTopBar;
