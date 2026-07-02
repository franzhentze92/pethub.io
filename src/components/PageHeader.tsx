import React from 'react';
import NotificationBell from './NotificationBell';
import RoleSwitcherDropdown from './RoleSwitcherDropdown';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  gradient?: string;
  children?: React.ReactNode;
  showNotifications?: boolean;
  showSettings?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  gradient = "from-landing-aqua via-landing-mint to-landing-mango",
  children,
  showNotifications = false,
  showSettings = false,
}) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${gradient} rounded-2xl p-4 md:p-6 text-white shadow-lg`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-black/5 to-black/20" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl md:text-2xl font-bold leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.25)]">{title}</h2>
          <p className="text-white text-sm mt-1 leading-snug font-medium [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">{subtitle}</p>
        </div>
        {(showNotifications || children || showSettings) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pt-0.5">
            {showNotifications && <NotificationBell />}
            {children}
            {showSettings && <RoleSwitcherDropdown variant="header" />}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
