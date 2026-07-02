import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, DollarSign, User, Settings } from 'lucide-react';
import SettingsDropdown from './SettingsDropdown';
// Import pages directly - we'll create simplified tab components
import DeliveryOrdersPage from '../pages/DeliveryOrdersPage';
import DeliveryExpensesPage from '../pages/DeliveryExpensesPage';
import DeliveryProfilePage from '../pages/DeliveryProfilePage';

const DeliveryDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(() => {
    // Check if navigation state has activeTab
    const state = location.state as { activeTab?: string } | null;
    // Also check URL path
    if (location.pathname === '/delivery/orders') return 'orders';
    if (location.pathname === '/delivery/expenses') return 'expenses';
    if (location.pathname === '/delivery/profile') return 'profile';
    return state?.activeTab || 'orders';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without navigation state to avoid conflicts
    const paths: { [key: string]: string } = {
      'orders': '/delivery/orders',
      'expenses': '/delivery/expenses',
      'profile': '/delivery/profile'
    };
    if (paths[value]) {
      navigate(paths[value], { replace: true });
    }
    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check navigation state for activeTab on mount and when location changes
  useEffect(() => {
    const state = location.state as { activeTab?: string } | null;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
      // Scroll to top when tab changes via navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  // Update tab based on URL path
  useEffect(() => {
    if (location.pathname === '/delivery/orders') setActiveTab('orders');
    else if (location.pathname === '/delivery/expenses') setActiveTab('expenses');
    else if (location.pathname === '/delivery/profile') setActiveTab('profile');
  }, [location.pathname]);

  // Scroll to top whenever activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Listen for tab change events from SettingsDropdown
  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      setActiveTab(event.detail);
      // Scroll to top when tab changes via event
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('deliveryDashboardTabChange', handleTabChangeEvent as EventListener);
    return () => {
      window.removeEventListener('deliveryDashboardTabChange', handleTabChangeEvent as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 p-3 md:p-6">
      {/* Header - Modern Design */}
      <div className="mb-6 md:mb-8 relative z-10">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-4 md:p-6 text-white shadow-lg relative">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h1 className="text-lg md:text-xl font-bold truncate">Dashboard Delivery</h1>
            </div>
            <div className="flex items-center shrink-0 relative z-50">
              <SettingsDropdown variant="gradient" />
            </div>
          </div>
          <div className="pl-0 md:pl-[52px]">
            <p className="text-sm md:text-base text-blue-100 truncate">
              {user?.email || 'Panel de Delivery'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="hidden md:flex mb-6 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Órdenes
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Mi Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0">
            <DeliveryOrdersPage asTab={true} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            <DeliveryExpensesPage asTab={true} />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <DeliveryProfilePage asTab={true} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation Menu - Mobile Only */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl md:hidden"
        style={{ height: '80px', boxSizing: 'border-box' }}
      >
        <div className="flex justify-around items-center h-full py-2 px-1 overflow-x-auto">
          {/* Órdenes */}
          <button
            onClick={() => handleTabChange('orders')}
            className={`
              w-full flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1
              ${activeTab === 'orders'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg transform scale-105' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <Package size={18} className="mb-1" />
            <span className="text-xs font-medium truncate leading-tight">Órdenes</span>
          </button>

          {/* Gastos */}
          <button
            onClick={() => handleTabChange('expenses')}
            className={`
              w-full flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1
              ${activeTab === 'expenses'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg transform scale-105' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <DollarSign size={18} className="mb-1" />
            <span className="text-xs font-medium truncate leading-tight">Gastos</span>
          </button>

          {/* Mi Perfil */}
          <button
            onClick={() => handleTabChange('profile')}
            className={`
              w-full flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1
              ${activeTab === 'profile'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg transform scale-105' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <User size={18} className="mb-1" />
            <span className="text-xs font-medium truncate leading-tight">Mi Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;

