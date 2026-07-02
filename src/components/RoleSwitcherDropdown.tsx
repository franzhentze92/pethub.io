import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, LogOut, User, UserRoundCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_OPTIONS, useRoleSwitcher } from '@/hooks/useRoleSwitcher';

interface RoleSwitcherDropdownProps {
  variant?: 'header' | 'default';
  className?: string;
}

const RoleSwitcherDropdown: React.FC<RoleSwitcherDropdownProps> = ({
  variant = 'header',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { userRole, currentRoleLabel, canSwitchRoles, handleRoleChange, handleSignOut, handleProfileClick } =
    useRoleSwitcher();

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 224;
    const margin = 8;
    let left = rect.right - menuWidth;
    if (left < margin) left = margin;
    if (left + menuWidth > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth - margin;
    }
    setMenuPosition({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: menuWidth,
      zIndex: 300,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (document.getElementById('role-switcher-portal')?.contains(target)) return;
      setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const triggerClassName =
    variant === 'header'
      ? cn(
          'relative flex items-center justify-center',
          'w-10 h-10 rounded-full',
          'bg-white/20 backdrop-blur-sm',
          'text-white hover:bg-white/30',
          'transition-colors active:scale-95',
          open && 'bg-white/30 ring-2 ring-white/40'
        )
      : cn(
          'relative flex items-center justify-center',
          'w-9 h-9 rounded-xl',
          'bg-white text-gray-700 border border-landing-aqua/25',
          'hover:bg-landing-aqua/10 hover:text-landing-aqua-dark',
          'shadow-sm transition-colors active:scale-95',
          open && 'bg-landing-aqua/10 text-landing-aqua-dark border-landing-aqua/40'
        );

  const dropdownMenu =
    open &&
    createPortal(
      <div
        id="role-switcher-portal"
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-white/95 backdrop-blur-md shadow-xl border border-landing-aqua/20'
        )}
        style={menuPosition}
      >
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol activo</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{currentRoleLabel}</p>
        </div>

        <div className="py-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              handleProfileClick();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-landing-aqua/10 hover:text-landing-aqua-dark transition-colors"
          >
            <User className="w-4 h-4 shrink-0" />
            Mi Perfil
          </button>

          {canSwitchRoles ? (
            ROLE_OPTIONS.map((option) => {
              const active = userRole === option.role;
              const Icon = option.icon;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!active) handleRoleChange(option.role);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-landing-aqua/15 text-landing-aqua-dark font-medium'
                      : 'text-gray-700 hover:bg-landing-aqua/10 hover:text-landing-aqua-dark'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {option.label}
                  </span>
                  {active && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-2 text-xs text-gray-500">
              Tu cuenta tiene un rol fijo y no puede cambiarse desde aquí.
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 py-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              handleSignOut();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>,
      document.body
    );

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Cambiar rol de usuario"
        aria-expanded={open}
        className={triggerClassName}
      >
        <UserRoundCog className="w-5 h-5" strokeWidth={2} />
      </button>
      {dropdownMenu}
    </div>
  );
};

export default RoleSwitcherDropdown;
