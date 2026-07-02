import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Home, Users } from 'lucide-react';

export type SwitchableRole = 'client' | 'provider' | 'shelter';

export const ROLE_OPTIONS = [
  { icon: Home, label: 'Cliente', role: 'client' as const },
  { icon: Users, label: 'Proveedor', role: 'provider' as const },
  { icon: Building2, label: 'Albergue', role: 'shelter' as const },
] as const;

export function useRoleSwitcher() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role');

  const isAdmin = user?.email === 'admin@pethubgt.com' || userRole === 'admin';
  const isDelivery = user?.email === 'delivery@pehtubgt.com' || userRole === 'delivery';
  const canSwitchRoles = !isAdmin && !isDelivery;

  const handleRoleChange = async (role: SwitchableRole) => {
    localStorage.setItem('user_role', role);

    if (user) {
      try {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingProfile) {
          await supabase
            .from('user_profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } else {
          await supabase.from('user_profiles').insert({
            user_id: user.id,
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error updating role in database:', error);
      }
    }

    switch (role) {
      case 'client':
        navigate('/dashboard');
        toast.success('Cambiado a dashboard de cliente');
        break;
      case 'provider':
        navigate('/provider');
        toast.success('Cambiado a dashboard de proveedor');
        break;
      case 'shelter':
        navigate('/shelter-dashboard');
        toast.success('Cambiado a dashboard de albergue');
        break;
    }

    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error signing out:', error);
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_new_user');
      toast.success('Sesión cerrada');
    }
    navigate('/login');
  };

  const handleProfileClick = () => {
    const isAdmin = user?.email === 'admin@pethubgt.com' || userRole === 'admin';
    const isDelivery = user?.email === 'delivery@pehtubgt.com' || userRole === 'delivery';

    if (isAdmin) {
      navigate('/ajustes');
      return;
    }

    if (isDelivery) {
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

  const currentRoleLabel =
    ROLE_OPTIONS.find((option) => option.role === userRole)?.label ?? 'Cliente';

  return {
    userRole,
    currentRoleLabel,
    canSwitchRoles,
    handleRoleChange,
    handleSignOut,
    handleProfileClick,
  };
}
