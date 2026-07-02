import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from './Navigation';
import AppMobileHeader from './mobile/AppMobileHeader';
import Dashboard from './Dashboard';
import Trazabilidad from './Trazabilidad';
import Veterinaria from './Veterinaria';
import Comunicacion from './Comunicacion';
import Marketplace from './Marketplace';
import Adopcion from './Adopcion';
import Ajustes from './Ajustes';
import ClientOrders from './ClientOrders';
import ClientSubscriptions from './ClientSubscriptions';
import ProviderOrders from './ProviderOrders';
import ProviderDashboard from './ProviderDashboard';
import ShelterDashboard from './ShelterDashboard';
import AdminDashboard from './AdminDashboard';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminOrdersPage from '../pages/AdminOrdersPage';
import AdminProductsPage from '../pages/AdminProductsPage';
import AdminServicesPage from '../pages/AdminServicesPage';
import AdminPetsPage from '../pages/AdminPetsPage';
import AdminVeterinaryRecordsPage from '../pages/AdminVeterinaryRecordsPage';
import AdminExerciseRecordsPage from '../pages/AdminExerciseRecordsPage';
import AdminNutritionRecordsPage from '../pages/AdminNutritionRecordsPage';
import AdminAdoptionApplicationsPage from '../pages/AdminAdoptionApplicationsPage';
import AdminBreedingMatchesPage from '../pages/AdminBreedingMatchesPage';
import AdminLostPetsPage from '../pages/AdminLostPetsPage';
import AdminDeliveryPage from '../pages/AdminDeliveryPage';
import AdminDeliveryExpensesPage from '../pages/AdminDeliveryExpensesPage';
import AdminCostsPage from '../pages/AdminCostsPage';
import AdminSheltersPage from '../pages/AdminSheltersPage';
import AdminProvidersPage from '../pages/AdminProvidersPage';
import AdminFinancialAnalysisPage from '../pages/AdminFinancialAnalysisPage';
import AdminOperationalAnalysisPage from '../pages/AdminOperationalAnalysisPage';
import AdminProfilePage from '../pages/AdminProfilePage';
import DeliveryDashboard from './DeliveryDashboard';
import FeedingSchedulesPage from '../pages/FeedingSchedulesPage';
import Recordatorios from '../pages/Recordatorios';
import Parejas from '../pages/Parejas';
import MascotasPerdidas from '../pages/MascotasPerdidas';
import PetRoom from './PetRoom';
import MealJournal from './MealJournal';
import AdventureLog from './AdventureLog';
import HealthJournal from './HealthJournal';
import CartPage from '../pages/CartPage';
import PetHubBlueprint from '../pages/PetHubBlueprint';
import PetJourney from '../pages/PetJourney';
import ShelterDetails from './ShelterDetails';
import PetHubAdminRouter from '../pages/pethub-admin/PetHubAdminRouter';
import { landingGradients } from '@/lib/landingTheme';
import { PetBuddyProvider } from '@/contexts/PetBuddyContext';
import { BlueprintGuidedTourProvider } from '@/contexts/BlueprintGuidedTourContext';
import { BlueprintGuidedTourGuide } from '@/components/blueprint/BlueprintGuidedTourGuide';
import { PetAvatarVisibilityProvider, usePetAvatarVisibility } from '@/contexts/PetAvatarVisibilityContext';
import PetBuddyWidget from '@/components/pet-buddy/PetBuddyWidget';

function PetBuddyWidgetGate() {
  const { showPetAvatars } = usePetAvatarVisibility();
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const usesCenterNavAvatar =
    userRole === 'client' || userRole === 'provider' || userRole === 'shelter';

  if (!usesCenterNavAvatar && !showPetAvatars) return null;

  return (
    <PetBuddyWidget
      hideFloatingTrigger={usesCenterNavAvatar}
      centeredPanel={usesCenterNavAvatar}
    />
  );
}

const AppLayout: React.FC = () => {
  const { activeSection } = useAppContext();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get user role to determine which dashboard and components to show
  // Check email FIRST for admin and delivery (this takes priority over everything)
  let userRole: string | null = null;
  
  // CRITICAL: Check email FIRST before anything else
  const isDeliveryUser = user?.email === 'delivery@pehtubgt.com';
  const isAdminUser = user?.email === 'admin@pethubgt.com';
  
  // If user email is admin, force admin role (highest priority)
  if (isAdminUser) {
    userRole = 'admin';
    localStorage.setItem('user_role', 'admin');
  }
  // If user email is delivery, force delivery role (second priority)
  else if (isDeliveryUser) {
    userRole = 'delivery';
    localStorage.setItem('user_role', 'delivery');
  }
  // Otherwise, get role from localStorage
  else {
    userRole = localStorage.getItem('user_role');
  }
  
  console.log('AppLayout: userRole:', userRole);
  console.log('AppLayout: user email:', user?.email);
  console.log('AppLayout: isDeliveryUser:', isDeliveryUser);
  console.log('AppLayout: isAdminUser:', isAdminUser);
  console.log('AppLayout: current pathname:', location.pathname);

  const isPetHubAdminRoute = location.pathname.startsWith('/pethub-admin');

  const renderContent = () => {
    // PetHub Admin — exclusive panel (hentzefranz92@gmail.com)
    if (location.pathname.startsWith('/pethub-admin')) {
      return <PetHubAdminRouter />;
    }

    // PRIORITY 1: If user email is delivery, ALWAYS show delivery dashboard (regardless of stored role or pathname)
    if (isDeliveryUser || userRole === 'delivery') {
      console.log('AppLayout: Rendering DeliveryDashboard for delivery user');
      return <DeliveryDashboard />;
    }
    
    // PRIORITY 2: If user email is admin, ALWAYS show admin pages (regardless of stored role)
    if (isAdminUser || userRole === 'admin') {
      // Check if we're on the users page
      if (location.pathname === '/admin/users') {
        return <AdminUsersPage />;
      }
      // Check if we're on the orders page
      if (location.pathname === '/admin/orders') {
        return <AdminOrdersPage />;
      }
      // Check if we're on the delivery page
      if (location.pathname === '/admin/delivery') {
        return <AdminDeliveryPage />;
      }
      // Check if we're on the costs page
      if (location.pathname === '/admin/costs') {
        return <AdminCostsPage />;
      }
      // Check if we're on the operational analysis page
      if (location.pathname === '/admin/operational-analysis') {
        return <AdminOperationalAnalysisPage />;
      }
      // Check if we're on the products page
      if (location.pathname === '/admin/products') {
        return <AdminProductsPage />;
      }
      // Check if we're on the services page
      if (location.pathname === '/admin/services') {
        return <AdminServicesPage />;
      }
      // Check if we're on the pets page
      if (location.pathname === '/admin/pets') {
        return <AdminPetsPage />;
      }
      // Check if we're on the veterinary records page
      if (location.pathname === '/admin/veterinary') {
        return <AdminVeterinaryRecordsPage />;
      }
      // Check if we're on the exercise records page
      if (location.pathname === '/admin/exercise') {
        return <AdminExerciseRecordsPage />;
      }
      // Check if we're on the nutrition records page
      if (location.pathname === '/admin/nutrition') {
        return <AdminNutritionRecordsPage />;
      }
      // Check if we're on the adoption applications page
      if (location.pathname === '/admin/adoptions') {
        return <AdminAdoptionApplicationsPage />;
      }
      // Check if we're on the breeding matches page
      if (location.pathname === '/admin/breeding') {
        return <AdminBreedingMatchesPage />;
      }
      // Check if we're on the lost pets page
      if (location.pathname === '/admin/lost-pets') {
        return <AdminLostPetsPage />;
      }
      // Check if we're on the shelters page
      if (location.pathname === '/admin/shelters') {
        return <AdminSheltersPage />;
      }
      // Check if we're on the providers page
      if (location.pathname === '/admin/providers') {
        return <AdminProvidersPage />;
      }
      // Check if we're on the financial analysis page
      if (location.pathname === '/admin/financial-analysis') {
        return <AdminFinancialAnalysisPage />;
      }
      // Check if we're on the operational analysis page
      if (location.pathname === '/admin/operational-analysis') {
        return <AdminOperationalAnalysisPage />;
      }
      // Check if we're on the admin profile page
      if (location.pathname === '/admin/profile') {
        return <AdminProfilePage />;
      }
      // Default to AdminDashboard for other admin routes
      return <AdminDashboard />;
    }
    
    // If user is a provider, show ProviderDashboard
    if (userRole === 'provider') {
      return <ProviderDashboard />;
    }
    
    // If user is a shelter, show ShelterDashboard
    if (userRole === 'shelter') {
      return <ShelterDashboard />;
    }
    
    // For client users, check if we're on a new gamified route
    // BUT ONLY if user is NOT delivery or admin
    if (userRole === 'client' && !isDeliveryUser && !isAdminUser) {
      const pathname = location.pathname;
      
      // Handle new gamified routes - removed pet-room as default
      if (pathname === '/pet-room') {
        return <PetRoom />;
      }
      if (pathname === '/social-hub') {
        return <Navigate to="/adopcion" replace />;
      }
      if (pathname === '/pet-shop') {
        return <Navigate to="/marketplace" replace />;
      }
      if (pathname === '/marketplace') {
        return <Marketplace />;
      }
      if (pathname === '/adopcion') {
        return <Adopcion />;
      }
      if (pathname.startsWith('/shelter/')) {
        return <ShelterDetails />;
      }
      if (pathname === '/parejas') {
        return <Parejas />;
      }
      if (pathname === '/mascotas-perdidas') {
        return <MascotasPerdidas />;
      }
      if (pathname === '/trazabilidad') {
        return <Trazabilidad />;
      }
      if (pathname === '/feeding-schedules') {
        return <FeedingSchedulesPage />;
      }
      if (pathname === '/veterinaria') {
        return <Veterinaria />;
      }
      if (pathname === '/recordatorios') {
        return <Recordatorios />;
      }
      if (pathname === '/meal-journal') {
        return <MealJournal />;
      }
      if (pathname === '/adventure-log') {
        return <AdventureLog />;
      }
      if (pathname === '/health-journal') {
        return <HealthJournal />;
      }
      if (pathname === '/pet-reminders') {
        return <Recordatorios />;
      }
      if (pathname === '/deliveries') {
        return <Navigate to="/client-orders" replace />;
      }
      if (pathname === '/ajustes') {
        return <Ajustes />;
      }
      if (pathname === '/pet-hub-blueprint') {
        return <PetHubBlueprint />;
      }
      if (pathname === '/client-orders') {
        return <ClientOrders />;
      }
      if (pathname === '/my-subscriptions') {
        return <ClientSubscriptions />;
      }
      if (pathname === '/cart') {
        return <CartPage />;
      }
      if (pathname === '/marketplace/services') {
        return <Marketplace />;
      }
      if (pathname === '/marketplace/products') {
        return <Marketplace />;
      }
      if (pathname === '/marketplace/favorites') {
        return <Marketplace />;
      }
      if (pathname === '/dashboard') {
        return <Dashboard />;
      }
      if (pathname.startsWith('/pet-journey/')) {
        return <PetJourney />;
      }
      
      // Handle old routes for backward compatibility
      switch (activeSection) {
        case 'dashboard':
          return <Dashboard />;
        case 'trazabilidad':
          return <Trazabilidad />;
        case 'feeding-schedules':
          return <FeedingSchedulesPage />;
        case 'veterinaria':
          return <Veterinaria />;
        case 'recordatorios':
          return <Recordatorios />;
        case 'parejas':
          return <Parejas />;
        case 'comunicacion':
          return <Comunicacion />;
        case 'marketplace':
          return <Marketplace />;
        case 'orders':
          return <ClientOrders />;
        case 'adopcion':
          return <Adopcion />;
        case 'mascotas-perdidas':
          return <MascotasPerdidas />;
        case 'ajustes':
          return <Ajustes />;
        default:
          return <Marketplace />; // Default to Marketplace products page
      }
    }
    
    // Default fallback - should not reach here for delivery/admin users
    // If we reach here and user is delivery/admin, something went wrong
    if (isDeliveryUser || userRole === 'delivery') {
      console.error('AppLayout: ERROR - Delivery user reached default fallback, forcing DeliveryOrdersPage');
      return <DeliveryOrdersPage />;
    }
    if (isAdminUser || userRole === 'admin') {
      console.error('AppLayout: ERROR - Admin user reached default fallback, forcing AdminDashboard');
      return <AdminDashboard />;
    }
    return <Dashboard />;
  };

  // For delivery, admin and PetHub Admin routes — no client navigation chrome
  if (isDeliveryUser || userRole === 'delivery' || isAdminUser || userRole === 'admin' || isPetHubAdminRoute) {
    return (
      <>
        {renderContent()}
      </>
    );
  }

  const usesSharedHeader =
    !!user &&
    !isDeliveryUser &&
    !isAdminUser &&
    (userRole === 'client' || userRole === 'provider' || userRole === 'shelter');

  return (
    <NavigationProvider>
      <PetAvatarVisibilityProvider>
        <PetBuddyProvider>
          <BlueprintGuidedTourProvider>
          <div className={`min-h-screen overflow-x-hidden ${landingGradients.pageBg}`}>
            {usesSharedHeader && (
              <AppMobileHeader showCart={userRole === 'client'} />
            )}
            <main className="pb-[calc(3.75rem+env(safe-area-inset-bottom))] overflow-x-hidden">
              {renderContent()}
            </main>

            {userRole === 'client' && !isDeliveryUser && !isAdminUser && <Navigation />}
            {userRole === 'client' && !isDeliveryUser && !isAdminUser && user && <PetBuddyWidgetGate />}
            {(userRole === 'provider' || userRole === 'shelter') && user && <PetBuddyWidgetGate />}
            <BlueprintGuidedTourGuide />
          </div>
          </BlueprintGuidedTourProvider>
        </PetBuddyProvider>
      </PetAvatarVisibilityProvider>
    </NavigationProvider>
  );
};

export default AppLayout;