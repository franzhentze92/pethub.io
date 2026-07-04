import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from '@/pages/landing/Home';
import { AboutUs } from '@/pages/landing/AboutUs';
import { Features } from '@/pages/landing/Features';
import { FAQs } from '@/pages/landing/FAQs';
import { Pricing } from '@/pages/landing/Pricing';
import { Contact } from '@/pages/landing/Contact';
import { Pitch } from '@/pages/landing/Pitch';
import { Login } from '@/pages/landing/Login';
import { Register } from '@/pages/landing/Register';
import { ForgotPassword } from '@/pages/landing/ForgotPassword';
import { ResetPassword } from '@/pages/landing/ResetPassword';
import { Privacy } from '@/pages/landing/Privacy';
import { Terms } from '@/pages/landing/Terms';

import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { ScrollToTop } from '@/components/ScrollToTop';
import Auth from '@/components/Auth';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import Role from '@/pages/Role';
import PetCreation from '@/pages/PetCreation';

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                {/* Landing pages with navbar and footer */}
                <Route path="/" element={
                  <div className="min-h-screen bg-white">
                    <LandingNavbar />
                    <main><Home /></main>
                    <LandingFooter />
                  </div>
                } />
                <Route path="/about" element={
                  <div className="min-h-screen bg-white">
                    <LandingNavbar />
                    <main><AboutUs /></main>
                    <LandingFooter />
                  </div>
                } />
                <Route path="/features" element={
                  <div className="min-h-screen bg-white">
                    <LandingNavbar />
                    <main><Features /></main>
                    <LandingFooter />
                  </div>
                } />
                <Route path="/faqs" element={
                  <div className="min-h-screen bg-white">
                    <LandingNavbar />
                    <main><FAQs /></main>
                    <LandingFooter />
                  </div>
                } />
                <Route path="/pricing" element={
                  <div className="min-h-screen bg-white">
                    <LandingNavbar />
                    <main><Pricing /></main>
                    <LandingFooter />
                  </div>
                } />
                <Route path="/contact" element={
                  <div className="min-h-screen bg-white">
                    <LandingNavbar />
                    <main><Contact /></main>
                    <LandingFooter />
                  </div>
                } />
                <Route path="/pitch" element={
                  <div className="min-h-screen bg-gray-950 overflow-hidden">
                    <LandingNavbar />
                    <main><Pitch /></main>
                  </div>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                
                {/* App routes */}
                <Route path="/app" element={<Auth />} />
                <Route path="/dashboard" element={<Index />} />
                <Route path="/role" element={<Role />} />
                <Route path="/pet-creation" element={<PetCreation />} />
                <Route path="/pet-room" element={<Index />} />
                <Route path="/meal-journal" element={<Index />} />
                <Route path="/adventure-log" element={<Index />} />
                <Route path="/health-journal" element={<Index />} />
                <Route path="/pet-reminders" element={<Index />} />
                <Route path="/social-hub" element={<Index />} />
                <Route path="/marketplace" element={<Index />} />
                <Route path="/adopcion" element={<Index />} />
                <Route path="/trazabilidad" element={<Index />} />
                <Route path="/feeding-schedules" element={<Index />} />
                <Route path="/veterinaria" element={<Index />} />
                <Route path="/recordatorios" element={<Index />} />
                <Route path="/ajustes" element={<Index />} />
                <Route path="/pet-hub-blueprint" element={<Index />} />
                <Route path="/parejas" element={<Index />} />
                <Route path="/paseos" element={<Index />} />
                <Route path="/mascotas-perdidas" element={<Index />} />
                <Route path="/client-orders" element={<Index />} />
                <Route path="/my-subscriptions" element={<Index />} />
                <Route path="/cart" element={<Index />} />
                <Route path="/marketplace/services" element={<Index />} />
                <Route path="/marketplace/products" element={<Index />} />
                <Route path="/marketplace/favorites" element={<Index />} />
                <Route path="/pet-journey/:petId" element={<Index />} />
                <Route path="/shelter/:shelterId" element={<Index />} />
                <Route path="/client-dashboard" element={<Index />} />
                <Route path="/provider" element={<Index />} />
                <Route path="/shelter-dashboard" element={<Index />} />
                <Route path="/admin-dashboard" element={<Index />} />
                <Route path="/admin/users" element={<Index />} />
                <Route path="/admin/orders" element={<Index />} />
                <Route path="/admin/delivery" element={<Index />} />
                <Route path="/admin/costs" element={<Index />} />
                <Route path="/admin/operational-analysis" element={<Index />} />
        <Route path="/admin/profile" element={<Index />} />
                <Route path="/admin/products" element={<Index />} />
                <Route path="/admin/services" element={<Index />} />
                <Route path="/admin/pets" element={<Index />} />
                <Route path="/admin/veterinary" element={<Index />} />
                <Route path="/admin/exercise" element={<Index />} />
                <Route path="/admin/nutrition" element={<Index />} />
                <Route path="/admin/adoptions" element={<Index />} />
                <Route path="/admin/breeding" element={<Index />} />
                <Route path="/admin/lost-pets" element={<Index />} />
                <Route path="/admin/dog-walks" element={<Index />} />
                <Route path="/admin/shelters" element={<Index />} />
                <Route path="/admin/providers" element={<Index />} />
                <Route path="/admin/financial-analysis" element={<Index />} />

                {/* PetHub Admin (hentzefranz92@gmail.com only) */}
                <Route path="/pethub-admin" element={<Index />} />
                <Route path="/pethub-admin/productos-comprados" element={<Index />} />
                <Route path="/pethub-admin/servicios" element={<Index />} />
                <Route path="/pethub-admin/adopciones" element={<Index />} />
                <Route path="/pethub-admin/parejas" element={<Index />} />
                <Route path="/pethub-admin/mascotas-perdidas" element={<Index />} />
                <Route path="/pethub-admin/mascotas" element={<Index />} />
                <Route path="/pethub-admin/direcciones" element={<Index />} />
                <Route path="/pethub-admin/usuarios" element={<Index />} />
                <Route path="/pethub-admin/ordenes" element={<Index />} />
                
                {/* Delivery routes */}
                <Route path="/delivery/orders" element={<Index />} />
                <Route path="/delivery/expenses" element={<Index />} />
                <Route path="/delivery/profile" element={<Index />} />
                <Route path="/delivery/expenses" element={<Index />} />
                
                {/* Dashboard routes */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;