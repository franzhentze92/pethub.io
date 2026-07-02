import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Shield,
  ShoppingBag,
  Activity,
  Heart,
  Stethoscope,
  UtensilsCrossed,
  Home,
  AlertTriangle,
  Truck,
  DollarSign,
  Building2,
  Store,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  BarChart3,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  badge?: number;
  badgeColor?: string;
}

interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

interface AdminSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  stats?: {
    pendingVerifications?: number;
  };
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  activeTab = 'overview', 
  onTabChange,
  stats = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()); // Colapsadas por defecto
  const navigate = useNavigate();
  const location = useLocation();

  const menuSections: MenuSection[] = [
    {
      id: 'clientes',
      label: 'Clientes',
      items: [
        {
          id: 'users',
          label: 'Usuarios',
          icon: Users,
          path: '/admin/users'
        },
        {
          id: 'products',
          label: 'Productos',
          icon: ShoppingBag,
          path: '/admin/products'
        },
        {
          id: 'services',
          label: 'Servicios',
          icon: Activity,
          path: '/admin/services'
        },
        {
          id: 'pets',
          label: 'Mascotas',
          icon: Heart,
          path: '/admin/pets'
        },
        {
          id: 'shelters',
          label: 'Albergues',
          icon: Building2,
          path: '/admin/shelters'
        },
        {
          id: 'providers',
          label: 'Proveedores',
          icon: Store,
          path: '/admin/providers'
        },
        {
          id: 'veterinary',
          label: 'Registros Veterinarios',
          icon: Stethoscope,
          path: '/admin/veterinary'
        },
        {
          id: 'exercise',
          label: 'Registros de Ejercicio',
          icon: Activity,
          path: '/admin/exercise'
        },
        {
          id: 'nutrition',
          label: 'Registros de Nutrición',
          icon: UtensilsCrossed,
          path: '/admin/nutrition'
        },
        {
          id: 'adoptions',
          label: 'Solicitudes de Adopción',
          icon: Home,
          path: '/admin/adoptions'
        },
        {
          id: 'breeding',
          label: 'Solicitudes de Parejas',
          icon: Heart,
          path: '/admin/breeding'
        },
        {
          id: 'lost-pets',
          label: 'Mascotas Perdidas',
          icon: AlertTriangle,
          path: '/admin/lost-pets'
        }
      ]
    },
    {
      id: 'delivery',
      label: 'Operaciones',
      items: [
        {
          id: 'delivery-orders',
          label: 'Órdenes',
          icon: Package,
          path: '/admin/delivery'
        },
        {
          id: 'delivery',
          label: 'Delivery',
          icon: Truck,
          path: '/admin/delivery'
        },
        {
          id: 'operational-analysis',
          label: 'Análisis Operativo',
          icon: BarChart3,
          path: '/admin/operational-analysis'
        }
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      items: [
        {
          id: 'orders',
          label: 'Órdenes',
          icon: Package,
          path: '/admin/orders'
        },
        {
          id: 'costs',
          label: 'Costos',
          icon: DollarSign,
          path: '/admin/costs'
        },
        {
          id: 'financial-analysis',
          label: 'Análisis Financiero',
          icon: TrendingUp,
          path: '/admin/financial-analysis'
        }
      ]
    }
  ];

  // Get all menu items for active check (including profile at the end)
  const allMenuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Resumen',
      icon: LayoutDashboard,
      path: '/admin-dashboard'
    },
    ...menuSections.flatMap(section => section.items),
    {
      id: 'admin-profile',
      label: 'Mi Perfil',
      icon: User,
      path: '/admin/profile'
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isActive = (itemId: string) => {
    // Check if we're on a specific admin sub-page
    const item = allMenuItems.find(item => item.id === itemId);
    if (item?.path === location.pathname) {
      return true;
    }
    // Check for tab-based navigation (for overview)
    if (location.pathname === '/admin-dashboard') {
      return activeTab === itemId || location.search.includes(`tab=${itemId}`);
    }
    // Default check for overview
    if (itemId === 'overview' && location.pathname === '/admin-dashboard' && !location.search) {
      return true;
    }
    return false;
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-white text-gray-700 transition-all duration-300 z-40 shadow-lg border-r border-gray-200 flex flex-col",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo/Header */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200 flex-shrink-0">
        {isExpanded ? (
          <div className="flex items-center gap-2 px-4">
            <Shield className="w-6 h-6 text-purple-600" />
            <span className="font-bold text-lg text-gray-900">PetHub</span>
          </div>
        ) : (
          <Shield className="w-6 h-6 text-purple-600" />
        )}
      </div>

      {/* Menu Items */}
      <nav className={cn(
        "flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col"
      )}>
        <ul className="space-y-1 pb-4 flex-1">
          {/* Dashboard Item */}
          <li>
            <button
              onClick={() => handleItemClick({
                id: 'overview',
                label: 'Dashboard',
                icon: LayoutDashboard,
                path: '/admin-dashboard'
              })}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive('overview')
                  ? "bg-purple-50 text-purple-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={!isExpanded ? 'Dashboard' : undefined}
            >
              <LayoutDashboard className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform",
                isActive('overview') && "scale-110"
              )} />
              
              {isExpanded && (
                <span className="flex-1 text-left font-medium">Dashboard</span>
              )}

              {/* Tooltip when collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Dashboard
                </div>
              )}
            </button>
          </li>

          {/* Sections */}
          {menuSections.map((section) => {
            const isSectionExpanded = expandedSections.has(section.id);
            // Use specific icons for sections
            let SectionIcon: React.ComponentType<{ className?: string }> = Package;
            if (section.id === 'delivery') {
              SectionIcon = Truck; // Use Truck icon for Delivery section
            } else if (section.id === 'finanzas') {
              SectionIcon = TrendingUp; // Use TrendingUp icon for Finanzas section
            } else {
              SectionIcon = section.items[0]?.icon || Package; // Use first item's icon for other sections
            }
            
            return (
              <li key={section.id}>
                {isExpanded ? (
                  <>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      <SectionIcon className="w-4 h-4 flex-shrink-0" />
                      {isSectionExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span>{section.label}</span>
                    </button>
                    {isSectionExpanded && (
                      <ul className="mt-1 space-y-1 pl-4">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.id);
                          
                          return (
                            <li key={item.id}>
                              <button
                                onClick={() => handleItemClick(item)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                                  active
                                    ? "bg-purple-50 text-purple-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                              >
                                <Icon className={cn(
                                  "w-4 h-4 flex-shrink-0 transition-transform",
                                  active && "scale-110"
                                )} />
                                
                                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                                
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                    item.badgeColor || "bg-red-500"
                                  )}>
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        // When collapsed, clicking section icon should expand sidebar and section
                        setIsExpanded(true);
                        setExpandedSections(prev => new Set(prev).add(section.id));
                      }}
                      className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-50"
                      title={section.label}
                    >
                      <SectionIcon className="w-5 h-5 flex-shrink-0 text-gray-600" />
                    </button>
                    {/* Tooltip when collapsed */}
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {section.label}
                    </div>
                  </div>
                )}
              </li>
            );
          })}

          {/* Profile Item after sections */}
          <li className="pt-1">
            <button
              onClick={() => handleItemClick({
                id: 'admin-profile',
                label: 'Mi Perfil',
                icon: User,
                path: '/admin/profile'
              })}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive('admin-profile')
                  ? "bg-purple-50 text-purple-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={!isExpanded ? 'Mi Perfil' : undefined}
            >
              <User className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform",
                isActive('admin-profile') && "scale-110"
              )} />
              
              {isExpanded && (
                <span className="flex-1 text-left font-medium">Mi Perfil</span>
              )}

              {/* Tooltip when collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Mi Perfil
                </div>
              )}
            </button>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        {isExpanded ? (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Shield className="w-4 h-4" />
            <span>Panel de Administración</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <Shield className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;
