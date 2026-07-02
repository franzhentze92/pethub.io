import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROLE_OPTIONS, useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { cn } from '@/lib/utils';

interface SettingsDropdownProps {
  className?: string;
  variant?: 'gradient' | 'default';
}

const MENU_WIDTH = 224;

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ className = '', variant = 'gradient' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRoleSubmenu, setShowRoleSubmenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userRole, canSwitchRoles, handleRoleChange, handleSignOut } = useRoleSwitcher();

  const isAdmin = user?.email === 'admin@pethubgt.com' || userRole === 'admin';
  const isDelivery = user?.email === 'delivery@pehtubgt.com' || userRole === 'delivery';

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const margin = 8;
    let left = rect.right - MENU_WIDTH;

    if (left < margin) left = margin;
    if (left + MENU_WIDTH > viewportWidth - margin) {
      left = viewportWidth - MENU_WIDTH - margin;
    }

    setMenuPosition({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: MENU_WIDTH,
      zIndex: 300,
    });
  }, []);

  useEffect(() => {
    if (!showDropdown) return;

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [showDropdown, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (document.getElementById('settings-dropdown-portal')?.contains(target)) return;

      setShowDropdown(false);
      setShowRoleSubmenu(false);
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const closeDropdown = () => {
    setShowDropdown(false);
    setShowRoleSubmenu(false);
  };

  const handleProfileClick = () => {
    closeDropdown();

    if (isAdmin) {
      navigate('/ajustes');
      return;
    }

    if (isDelivery || userRole === 'delivery') {
      navigate('/delivery/profile');
      return;
    }

    switch (userRole) {
      case 'client':
        navigate('/ajustes');
        break;
      case 'provider':
        navigate('/provider', { state: { activeTab: 'profile' } });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('providerDashboardTabChange', { detail: 'profile' }));
        }, 100);
        break;
      case 'shelter':
        navigate('/shelter-dashboard', { state: { activeTab: 'profile' } });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('shelterDashboardTabChange', { detail: 'profile' }));
        }, 100);
        break;
      default:
        navigate('/ajustes');
    }
  };

  const roleOptions = ROLE_OPTIONS.map((option) => ({
    ...option,
    onClick: () => {
      closeDropdown();
      handleRoleChange(option.role);
    },
  }));

  const baseMenuItems = [
    { icon: User, label: 'Mi Perfil', onClick: handleProfileClick },
    {
      icon: Settings,
      label: 'Cambiar de Rol',
      hasSubmenu: true,
      onClick: () => setShowRoleSubmenu((prev) => !prev),
    },
    {
      icon: LogOut,
      label: 'Cerrar Sesión',
      onClick: () => {
        closeDropdown();
        handleSignOut();
      },
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50',
    },
  ];

  const menuItems = !canSwitchRoles
    ? baseMenuItems.filter((item) => item.label !== 'Cambiar de Rol')
    : baseMenuItems;

  const buttonClassName =
    variant === 'gradient'
      ? 'bg-white/20 text-white border-white/40 hover:bg-white/30 hover:text-white backdrop-blur-sm p-2 rounded-xl'
      : 'bg-white text-gray-700 border-landing-aqua/25 hover:bg-landing-aqua/10 hover:text-landing-aqua-dark hover:border-landing-aqua/40 p-2 rounded-xl shadow-sm';

  const dropdownMenu =
    showDropdown &&
    createPortal(
      <div
        id="settings-dropdown-portal"
        className="rounded-xl bg-white/95 backdrop-blur-md shadow-xl border border-landing-aqua/20 overflow-hidden"
        style={menuPosition}
      >
        <div className="py-2">
          {menuItems.map((item, index) => (
            <div key={index}>
              <button
                type="button"
                onClick={item.hasSubmenu ? item.onClick : item.onClick}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-landing-aqua/10 hover:text-landing-aqua-dark transition-colors',
                  item.className
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.hasSubmenu && (
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform', showRoleSubmenu && 'rotate-180')}
                  />
                )}
              </button>

              {item.hasSubmenu && showRoleSubmenu && (
                <div className="bg-landing-aqua/5 border-y border-landing-aqua/10 py-1">
                  {roleOptions.map((roleOption, roleIndex) => (
                    <button
                      key={roleIndex}
                      type="button"
                      onClick={roleOption.onClick}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 pl-11 text-sm text-gray-700 hover:bg-landing-aqua/10 hover:text-landing-aqua-dark transition-colors',
                        userRole === roleOption.role && 'bg-landing-aqua/15 text-landing-aqua-dark font-medium'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <roleOption.icon className="w-4 h-4 shrink-0" />
                        <span>{roleOption.label}</span>
                      </div>
                      {userRole === roleOption.role && (
                        <span className="text-xs text-landing-aqua-dark font-medium">Actual</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>,
      document.body
    );

  return (
    <div className={cn('relative settings-dropdown', className)} ref={triggerRef}>
      <Button
        type="button"
        onClick={() => {
          setShowDropdown((prev) => !prev);
          if (showDropdown) setShowRoleSubmenu(false);
        }}
        variant="outline"
        size="sm"
        className={buttonClassName}
        aria-label="Configuración y roles"
        aria-expanded={showDropdown}
      >
        <Settings className="w-4 h-4" />
      </Button>
      {dropdownMenu}
    </div>
  );
};

export default SettingsDropdown;
