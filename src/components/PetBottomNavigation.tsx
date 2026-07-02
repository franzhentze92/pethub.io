import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Heart, 
  Users, 
  ShoppingBag, 
  Settings,
  PawPrint
} from 'lucide-react';

interface PetBottomNavigationProps {
  userRole?: 'client' | 'provider' | 'shelter';
}

const PetBottomNavigation: React.FC<PetBottomNavigationProps> = ({ userRole = 'client' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');

  // Only show for Pet Owners (clients)
  if (userRole !== 'client') {
    return null;
  }

  const tabs = [
    {
      id: 'home',
      label: 'Inicio',
      icon: Home,
      path: '/pet-room',
      color: 'text-purple-600',
      activeColor: 'bg-purple-100 text-purple-700'
    },
    {
      id: 'care',
      label: 'Cuidado',
      icon: Heart,
      path: '/care-hub',
      color: 'text-pink-600',
      activeColor: 'bg-pink-100 text-pink-700'
    },
    {
      id: 'social',
      label: 'Social',
      icon: Users,
      path: '/adopcion',
      color: 'text-blue-600',
      activeColor: 'bg-blue-100 text-blue-700'
    },
    {
      id: 'shop',
      label: 'Tienda',
      icon: ShoppingBag,
      path: '/marketplace',
      color: 'text-orange-600',
      activeColor: 'bg-orange-100 text-orange-700'
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: Settings,
      path: '/profile',
      color: 'text-gray-600',
      activeColor: 'bg-gray-100 text-gray-700'
    }
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const isActiveTab = (tabId: string) => {
    const currentPath = location.pathname;
    
    switch (tabId) {
      case 'home':
        return currentPath === '/pet-room' || currentPath === '/';
      case 'care':
        return currentPath.includes('/meal-journal') || 
               currentPath.includes('/adventure-log') || 
               currentPath.includes('/health-journal') ||
               currentPath.includes('/pet-reminders') ||
               currentPath.includes('/recordatorios') ||
               currentPath === '/care-hub';
      case 'social':
        return currentPath.includes('/adopcion') || 
               currentPath.includes('/parejas') || 
               currentPath.includes('/mascotas-perdidas');
      case 'shop':
        return currentPath === '/marketplace' || currentPath === '/client-orders' || currentPath.includes('/orders') || currentPath === '/cart';
      case 'profile':
        return currentPath.includes('/ajustes') || currentPath === '/profile';
      default:
        return false;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-2xl">
      <div className="flex items-center justify-around py-3 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = isActiveTab(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-0 flex-1
                ${isActive 
                  ? `${tab.activeColor} shadow-lg scale-105 transform` 
                  : `${tab.color} hover:bg-gray-50 hover:scale-102`
                }
              `}
            >
              <div className="relative">
                <IconComponent className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
                {tab.id === 'home' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"></div>
                )}
              </div>
              <span className={`text-xs font-medium mt-1 ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Floating Pet Indicator */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
          <PawPrint className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};

export default PetBottomNavigation;
