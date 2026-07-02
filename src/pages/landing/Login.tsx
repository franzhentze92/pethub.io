import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { landingBtnHero } from '@/lib/landingTheme';
import { AuthPageLayout, authInputClassLg, authLabelClass } from '@/components/landing/AuthPageLayout';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type === 'signup' && accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          window.history.replaceState({}, document.title, window.location.pathname);

          toast.success('¡Email confirmado!', {
            description: 'Tu email ha sido confirmado exitosamente. Redirigiendo...',
          });

          setTimeout(async () => {
            const role = localStorage.getItem('user_role') as 'client' | 'provider' | 'shelter' | 'delivery' | null;

            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser?.email === 'admin@pethubgt.com') {
              localStorage.setItem('user_role', 'admin');
              navigate('/admin-dashboard');
              return;
            }
            if (currentUser?.email === 'delivery@pehtubgt.com') {
              localStorage.setItem('user_role', 'delivery');
              navigate('/delivery/orders');
              return;
            }

            if (role) {
              switch (role) {
                case 'client': navigate('/dashboard'); break;
                case 'provider': navigate('/provider'); break;
                case 'shelter': navigate('/shelter-dashboard'); break;
                case 'delivery': navigate('/delivery/orders'); break;
                default: navigate('/app');
              }
            } else {
              navigate('/role');
            }
          }, 1000);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'El enlace de confirmación no es válido o ha expirado';
          toast.error('Error al confirmar email', { description: message });
        }
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await signIn(formData.email, formData.password);

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (currentUser && !currentUser.email_confirmed_at) {
        toast.error('Email no confirmado', {
          description: 'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
        });
        await supabase.auth.signOut();
        return;
      }

      if (currentUser?.email === 'admin@pethubgt.com') {
        localStorage.setItem('user_role', 'admin');
        supabase
          .from('user_profiles')
          .update({ role: 'admin', updated_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .then(({ error }) => { if (error) console.error('Error updating admin role:', error); });

        toast.success('¡Bienvenido, Administrador!', { description: 'Has iniciado sesión exitosamente', duration: 2000 });
        navigate('/admin-dashboard');
        return;
      }

      if (currentUser?.email === 'delivery@pehtubgt.com') {
        localStorage.setItem('user_role', 'delivery');
        supabase
          .from('user_profiles')
          .update({ role: 'delivery', updated_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .then(({ error }) => { if (error) console.error('Error updating delivery role:', error); });

        toast.success('¡Bienvenido, Delivery!', { description: 'Has iniciado sesión exitosamente', duration: 2000 });
        navigate('/delivery/orders');
        return;
      }

      let role = localStorage.getItem('user_role') as 'client' | 'provider' | 'shelter' | 'delivery' | null;

      if (!role && currentUser) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single();

        if (profile?.role) {
          role = profile.role;
          localStorage.setItem('user_role', role);
        }
      }

      toast.success('¡Bienvenido!', { description: 'Has iniciado sesión exitosamente', duration: 2000 });

      if (role) {
        switch (role) {
          case 'client': navigate('/dashboard'); break;
          case 'provider': navigate('/provider'); break;
          case 'shelter': navigate('/shelter-dashboard'); break;
          case 'delivery': navigate('/delivery/orders'); break;
          default: navigate('/app');
        }
      } else {
        navigate('/role');
      }
    } catch (error: unknown) {
      let errorTitle = 'Error al iniciar sesión';
      let errorMessage = 'Por favor verifica tus credenciales e intenta nuevamente.';

      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid_credentials') || errorMsg.includes('email not found') || errorMsg.includes('wrong password')) {
          errorTitle = 'Credenciales inválidas';
          errorMessage = 'El correo electrónico o la contraseña son incorrectos. Por favor verifica e intenta nuevamente.';
        } else if (errorMsg.includes('email not confirmed') || errorMsg.includes('email_not_confirmed')) {
          errorTitle = 'Email no confirmado';
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
        } else if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
          errorTitle = 'Demasiados intentos';
          errorMessage = 'Has intentado iniciar sesión demasiadas veces. Por favor espera unos minutos e intenta nuevamente.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorTitle = 'Error de conexión';
          errorMessage = 'No se pudo conectar al servidor. Por favor verifica tu conexión a internet e intenta nuevamente.';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorTitle, { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout
      variant="login"
      footer={
        <p className="text-sm text-gray-600">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-landing-aqua-dark hover:text-landing-mango-dark font-semibold transition-colors">
            Regístrate aquí
          </Link>
        </p>
      }
    >
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Iniciar sesión</h2>
        <p className="text-sm text-gray-500 mt-0.5">Accede a tu cuenta de PetHub</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className={authLabelClass}>Correo electrónico</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className={authInputClassLg}
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className={authLabelClass}>Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleInputChange}
              className={`${authInputClassLg} pr-10`}
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, rememberMe: checked as boolean }))
              }
            />
            <Label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
              Recordarme
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-landing-aqua-dark hover:text-landing-mango-dark font-medium transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-12 ${landingBtnHero} font-semibold rounded-xl disabled:opacity-50`}
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </Button>
      </form>
    </AuthPageLayout>
  );
};
