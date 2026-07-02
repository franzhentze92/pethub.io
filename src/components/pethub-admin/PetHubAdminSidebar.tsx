import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PETHUB_ADMIN_SECTIONS } from '@/config/pethubAdminSections';

const PetHubAdminSidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'home',
      label: 'Inicio',
      icon: LayoutDashboard,
      path: '/pethub-admin',
    },
    ...PETHUB_ADMIN_SECTIONS.map((section) => ({
      id: section.id,
      label: section.title,
      icon: section.icon,
      path: section.path,
    })),
  ];

  return (
    <div
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-700 shadow-lg transition-all duration-300',
        isExpanded ? 'w-64' : 'w-16',
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-16 flex-shrink-0 items-center justify-center border-b border-gray-200">
        {isExpanded ? (
          <div className="flex items-center gap-2 px-4">
            <Shield className="h-6 w-6 text-landing-aqua-dark" />
            <span className="text-lg font-bold text-gray-900">PetHub Admin</span>
          </div>
        ) : (
          <Shield className="h-6 w-6 text-landing-aqua-dark" />
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === '/pethub-admin'
                ? location.pathname === '/pethub-admin'
                : location.pathname === item.path;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                    active
                      ? 'bg-landing-aqua/10 text-landing-aqua-dark shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'scale-110')} />
                  {isExpanded && (
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  )}
                  {!isExpanded && (
                    <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2 text-sm text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {item.label}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={() => navigate('/ajustes')}
          className={cn(
            'flex w-full items-center gap-2 text-xs text-gray-500 transition-colors hover:text-gray-800',
            !isExpanded && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4" />
          {isExpanded && <span>Volver a la app</span>}
        </button>
      </div>
    </div>
  );
};

export default PetHubAdminSidebar;
