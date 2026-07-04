
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedingAutomation } from '@/hooks/useFeedingAutomation';
import { supabase } from '@/lib/supabase';
import PageLoader, { getRoleLoaderMessage } from '@/components/PageLoader';
import { isPetHubAdminUser } from '@/lib/pethubAdminAccess';

const Index: React.FC = () => {
  const { user, loading } = useAuth();
  useFeedingAutomation();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileCreated, setProfileCreated] = useState(false);

  // Create user profile if it doesn't exist (after email confirmation)
  useEffect(() => {
    if (loading || !user || profileCreated) return;

    const createProfileIfNeeded = async () => {
      try {
        // Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('id, role, full_name, phone')
          .eq('user_id', user.id)
          .single();

        // If profile doesn't exist, create it
        if (fetchError && fetchError.code === 'PGRST116') {
          console.log('Index: No profile found, creating profile...');
          
          // Get pending registration data from localStorage
          const pendingDataStr = localStorage.getItem('pending_profile_data');
          const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : null;
          
          // Force role based on email (highest priority)
          let roleToUse: string | null = null;
          if (user?.email === 'admin@pethubgt.com') {
            roleToUse = 'admin';
          } else if (user?.email === 'delivery@pehtubgt.com') {
            roleToUse = 'delivery';
          } else {
            roleToUse = pendingData?.role || localStorage.getItem('user_role') || null;
          }
          
          // Create profile with pending data or default values
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              full_name: pendingData?.full_name || null,
              phone: pendingData?.phone || null,
              role: roleToUse,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) {
            console.error('Index: Error creating profile:', createError);
          } else {
            console.log('Index: Profile created successfully');
            // Clear pending data
            localStorage.removeItem('pending_profile_data');
            setProfileCreated(true);
          }
        } else if (existingProfile) {
          // Restaurar rol en localStorage si el perfil ya lo tiene en BD
          if (existingProfile.role && !localStorage.getItem('user_role')) {
            localStorage.setItem('user_role', existingProfile.role);
            console.log('Index: Restored role from profile:', existingProfile.role);
          }

          // Profile exists, update with pending data if available or if profile has NULL fields
          const pendingDataStr = localStorage.getItem('pending_profile_data');
          const needsUpdate = pendingDataStr || 
            !existingProfile.full_name || 
            !existingProfile.role ||
            (existingProfile.role === null && localStorage.getItem('user_role'));

          if (needsUpdate) {
            const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : null;
            
            // Force role based on email (highest priority)
            let roleToUse: string | null = null;
            if (user?.email === 'admin@pethubgt.com') {
              roleToUse = 'admin';
            } else if (user?.email === 'delivery@pehtubgt.com') {
              roleToUse = 'delivery';
            } else {
              roleToUse = pendingData?.role || localStorage.getItem('user_role') || existingProfile.role;
            }
            
            const updateData: any = {
              updated_at: new Date().toISOString()
            };

            // Update fields that are NULL or if we have pending data
            if (pendingData) {
              if (pendingData.full_name && !existingProfile.full_name) {
                updateData.full_name = pendingData.full_name;
              }
              if (pendingData.phone && !existingProfile.phone) {
                updateData.phone = pendingData.phone;
              }
            }
            
            // Always update role if we determined one (especially for admin/delivery emails)
            if (roleToUse) {
              updateData.role = roleToUse;
            }

            // Only update if we have something to update
            if (Object.keys(updateData).length > 1 || updateData.role) {
              if (roleToUse && !updateData.role) {
                updateData.role = roleToUse;
              }

              const { error: updateError } = await supabase
                .from('user_profiles')
                .update(updateData)
                .eq('user_id', user.id);
              
              if (updateError) {
                console.error('Index: Error updating profile:', updateError);
              } else {
                console.log('Index: Profile updated with registration data');
                if (roleToUse) {
                  localStorage.setItem('user_role', roleToUse);
                }
              }
            }

            if (pendingDataStr) {
              localStorage.removeItem('pending_profile_data');
            }
          }
          setProfileCreated(true);
        }
      } catch (error) {
        console.error('Index: Error in createProfileIfNeeded:', error);
      }
    };

    createProfileIfNeeded();
  }, [user, loading, profileCreated]);

  useEffect(() => {
    if (loading || !profileCreated) return
    
    // Check if user is authenticated first
    if (!user) {
      console.log('No authenticated user, redirecting to auth')
      navigate('/login')
      return
    }
    
    console.log('Index: Checking role-based routing...')
    console.log('Current pathname:', location.pathname)
    
    // For testing purposes, you can uncomment this line to clear the role and test role selection
    // localStorage.removeItem('user_role');
    
    // Check if user is admin
    if (user?.email === 'admin@pethubgt.com') {
      localStorage.setItem('user_role', 'admin');
      
      // Update profile in database to admin role
      supabase
        .from('user_profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating admin role in profile:', error);
          } else {
            console.log('Admin role updated in profile');
          }
        });
      
      // Allow admin routes: /admin-dashboard and any route starting with /admin/
      if (location.pathname !== '/admin-dashboard' && !location.pathname.startsWith('/admin/')) {
        console.log('Admin user detected, redirecting to admin dashboard');
        navigate('/admin-dashboard');
        return;
      }
      return;
    }
    
    // Check if user is delivery
    if (user?.email === 'delivery@pehtubgt.com') {
      localStorage.setItem('user_role', 'delivery');
      
      // Update profile in database to delivery role
      supabase
        .from('user_profiles')
        .update({ role: 'delivery', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating delivery role in profile:', error);
          } else {
            console.log('Delivery role updated in profile');
          }
        });
      
      // FORCE redirect to delivery orders if on any other route (including /dashboard)
      if (location.pathname !== '/delivery/orders' && !location.pathname.startsWith('/delivery/')) {
        console.log('Index: Delivery user detected on wrong route:', location.pathname, '- Redirecting to /delivery/orders');
        navigate('/delivery/orders', { replace: true });
        return;
      }
      return;
    }

    // PetHub Admin panel — client account with exclusive access
    if (location.pathname.startsWith('/pethub-admin')) {
      if (!isPetHubAdminUser(user?.email)) {
        console.log('Unauthorized PetHub Admin access, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }
      console.log('PetHub Admin route allowed');
      return;
    }
    
    const role = localStorage.getItem('user_role') as 'client' | 'provider' | 'shelter' | 'admin' | 'delivery' | null
    console.log('Stored role:', role)
    
    if (!role) {
      if (location.pathname === '/role') {
        console.log('On role selection page, waiting for user choice')
        return
      }
      console.log('No role found, redirecting to role selection')
      navigate('/role')
      return
    }
    
    // Only redirect if we're not already on the correct route
    // Allow admin routes: /admin-dashboard and any route starting with /admin/
    if (role === 'admin' && location.pathname !== '/admin-dashboard' && !location.pathname.startsWith('/admin/')) {
      console.log('Admin role detected, redirecting to admin dashboard')
      navigate('/admin-dashboard')
      return
    }
    if (role === 'provider' && location.pathname !== '/provider') {
      console.log('Provider role detected, redirecting to provider dashboard')
      navigate('/provider')
      return
    }
    if (role === 'shelter' && location.pathname !== '/shelter-dashboard') {
      console.log('Shelter role detected, redirecting to shelter dashboard')
      navigate('/shelter-dashboard')
      return
    }
    if (role === 'delivery' && location.pathname !== '/delivery/orders' && !location.pathname.startsWith('/delivery/')) {
      console.log('Delivery role detected, redirecting to delivery orders')
      navigate('/delivery/orders')
      return
    }
    if (role === 'client') {
      const isNewUser =
        localStorage.getItem('is_new_user') === 'true' &&
        localStorage.getItem('pethub_blueprint_tour_offered_v1') !== 'true';

      if (
        isNewUser &&
        location.pathname !== '/pet-hub-blueprint' &&
        location.pathname !== '/role'
      ) {
        console.log('New client user, redirecting to Blueprint tour offer');
        navigate('/pet-hub-blueprint?welcomeTour=1', { replace: true });
        return;
      }
    }

    if (role === 'client' && location.pathname !== '/dashboard' && location.pathname !== '/' && 
        location.pathname !== '/cart' &&
        !location.pathname.startsWith('/ajustes') && !location.pathname.startsWith('/pet-hub-blueprint') &&
        !location.pathname.startsWith('/care-hub') && 
        !location.pathname.startsWith('/social-hub') && !location.pathname.startsWith('/pet-shop') &&
        !location.pathname.startsWith('/marketplace') && !location.pathname.startsWith('/adopcion') && 
        !location.pathname.startsWith('/parejas') && !location.pathname.startsWith('/paseos') && !location.pathname.startsWith('/mascotas-perdidas') &&
        !location.pathname.startsWith('/trazabilidad') &&
        !location.pathname.startsWith('/feeding-schedules') && !location.pathname.startsWith('/veterinaria') &&
        !location.pathname.startsWith('/recordatorios') &&
        !location.pathname.startsWith('/meal-journal') && !location.pathname.startsWith('/adventure-log') && 
        !location.pathname.startsWith('/health-journal') && !location.pathname.startsWith('/pet-reminders') && 
        !location.pathname.startsWith('/deliveries') && !location.pathname.startsWith('/client-orders') &&
        !location.pathname.startsWith('/my-subscriptions') &&
        !location.pathname.startsWith('/pet-journey') && !location.pathname.startsWith('/shelter/') &&
        !location.pathname.startsWith('/pethub-admin')) {
      console.log('Client role detected, redirecting to dashboard')
      navigate('/dashboard')
      return
    }
    
    console.log('No redirect needed, staying on current route')
  }, [user, loading, profileCreated, navigate, location.pathname]);

  if (loading) {
    return <PageLoader message={getRoleLoaderMessage()} />;
  }

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default Index;
