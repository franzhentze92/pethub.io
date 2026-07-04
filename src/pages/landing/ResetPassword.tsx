import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, PawPrint, Home, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { landingBtnHero, landingGradients } from '@/lib/landingTheme';

export const ResetPassword: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Handle the password reset from URL hash
    const handlePasswordReset = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          // Clear the URL hash
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          console.error('Error setting session:', error);
          toast({
            title: "Enlace inválido",
            description: "Este enlace de restablecimiento no es válido o ha expirado",
            variant: "destructive",
          });
          navigate('/forgot-password');
        }
      } else if (type === 'recovery') {
        // If we have type=recovery but no tokens, the link might be expired
        toast({
          title: "Enlace expirado",
          description: "Este enlace de restablecimiento ha expirado. Por favor solicita uno nuevo.",
          variant: "destructive",
        });
        navigate('/forgot-password');
      }
    };

    handlePasswordReset();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña ha sido restablecida exitosamente",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al restablecer la contraseña",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`min-h-screen ${landingGradients.authBg} flex items-center justify-center p-4`}>
        {/* BACK TO HOME BUTTON */}
        <div className="absolute top-6 left-6 z-50">
          <Link 
            to="/" 
            className="group flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-landing-aqua/30 rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white"
          >
            <Home className="w-5 h-5 text-gray-600 group-hover:text-landing-aqua-dark transition-colors" />
            <span className="text-gray-700 font-medium group-hover:text-landing-aqua-dark transition-colors">
              Volver al Inicio
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md">
          {/* Success Message */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
            <div className="w-20 h-20 bg-landing-mint rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Contraseña restablecida!
            </h1>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Tu contraseña ha sido actualizada exitosamente. 
              Serás redirigido al login en unos segundos.
            </p>
            
            <Link to="/login">
              <Button className={`w-full h-14 ${landingBtnHero} text-lg font-semibold rounded-xl transform hover:-translate-y-0.5`}>
                Ir al Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${landingGradients.authBg} flex items-center justify-center p-4`}>
      {/* BACK TO HOME BUTTON */}
      <div className="absolute top-6 left-6 z-50">
        <Link 
          to="/" 
          className="group flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-landing-aqua/30 rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white"
        >
          <Home className="w-5 h-5 text-gray-600 group-hover:text-landing-aqua-dark transition-colors" />
          <span className="text-gray-700 font-medium group-hover:text-landing-aqua-dark transition-colors">
            Volver al Inicio
          </span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-landing-aqua rounded-3xl mb-6 shadow-lg">
            <PawPrint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Restablecer contraseña
          </h1>
          <p className="text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>

        {/* Reset Password Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Nueva Contraseña
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-landing-aqua focus:ring-2 focus:ring-landing-aqua/20 transition-all"
                  placeholder="Nueva contraseña"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Mínimo 8 caracteres
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirmar Nueva Contraseña
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-landing-aqua focus:ring-2 focus:ring-landing-aqua/20 transition-all"
                  placeholder="Confirma tu nueva contraseña"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-14 ${landingBtnHero} text-lg font-semibold rounded-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Restableciendo...
                </>
              ) : (
                'Restablecer Contraseña'
              )}
            </Button>
          </form>
        </div>

        {/* Back to Login Link */}
        <div className="text-center mt-8">
          <Link 
            to="/login" 
            className="text-landing-aqua-dark hover:text-landing-mango-dark font-medium transition-colors"
          >
            Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
};
