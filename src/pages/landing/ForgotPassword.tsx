import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, PawPrint, Home, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { landingBtnHero, landingGradients } from '@/lib/landingTheme';

export const ForgotPassword: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu correo electrónico",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "¡Correo enviado!",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al enviar el correo de restablecimiento",
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
              ¡Correo enviado!
            </h1>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Hemos enviado un enlace de restablecimiento a <strong>{email}</strong>. 
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            
            <div className="space-y-4">
              <Link to="/login">
                <Button className={`w-full h-14 ${landingBtnHero} text-lg font-semibold rounded-xl transform hover:-translate-y-0.5`}>
                  Volver al Login
                </Button>
              </Link>
              
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                className="w-full text-landing-aqua-dark hover:text-landing-mango-dark font-medium transition-colors"
              >
                Enviar a otro correo
              </button>
            </div>
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
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-gray-600">
            No te preocupes, te enviaremos un enlace para restablecerla
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Correo Electrónico
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-landing-aqua focus:ring-2 focus:ring-landing-aqua/20 transition-all"
                  placeholder="tu@email.com"
                />
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
                  Enviando...
                </>
              ) : (
                'Enviar enlace de restablecimiento'
              )}
            </Button>
          </form>
        </div>

        {/* Back to Login Link */}
        <div className="text-center mt-8">
          <Link 
            to="/login" 
            className="group flex items-center justify-center gap-2 text-landing-aqua-dark hover:text-landing-mango-dark font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
};
