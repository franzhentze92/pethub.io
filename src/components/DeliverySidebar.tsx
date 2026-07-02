import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Truck,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
}

interface DeliverySidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const DeliverySidebar: React.FC<DeliverySidebarProps> = ({ 
  activeTab = 'orders', 
  onTabChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      id: 'orders',
      label: 'Órdenes',
      icon: Package,
      path: '/delivery/orders'
    },
    {
      id: 'expenses',
      label: 'Gastos',
      icon: DollarSign,
      path: '/delivery/expenses'
    }
  ];

  const handleItemClick = (item: MenuItem) => {
    if (onTabChange) {
      onTabChange(item.id);
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (itemId: string) => {
    if (menuItems.find(item => item.id === itemId)?.path === location.pathname) {
      return true;
    }
    return false;
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-white text-gray-700 transition-all duration-300 z-40 shadow-lg border-r border-gray-200",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo/Header */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        {isExpanded ? (
          <div className="flex items-center gap-2 px-4">
            <Truck className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-900">PetHub</span>
          </div>
        ) : (
          <Truck className="w-6 h-6 text-blue-600" />
        )}
      </div>

      {/* Menu Items */}
      <nav className={cn(
        "flex-1 py-4 px-2",
        isExpanded ? "overflow-y-auto" : "overflow-hidden"
      )}>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    active
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform",
                    active && "scale-110"
                  )} />
                  
                  {isExpanded && (
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                  )}

                  {/* Tooltip when collapsed */}
                  {!isExpanded && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {isExpanded ? (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Truck className="w-4 h-4" />
            <span>Panel de Delivery</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <Truck className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliverySidebar;

