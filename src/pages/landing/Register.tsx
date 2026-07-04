import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { landingBtnHero } from '@/lib/landingTheme';
import { AuthPageLayout, authInputClass, authLabelClass } from '@/components/landing/AuthPageLayout';
import { authRoleOptions } from '@/data/authPageData';

export const Register: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleError, setShowRoleError] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '' as 'client' | 'provider' | 'shelter' | '',
    acceptTerms: false,
    acceptMarketing: false,
  });

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

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    if (!formData.acceptTerms) {
      toast({ title: 'Error', description: 'Debes aceptar los términos y condiciones', variant: 'destructive' });
      return;
    }

    const isAdminEmail = formData.email === 'admin@pethubgt.com';
    const isDeliveryEmail = formData.email === 'delivery@pehtubgt.com';

    if (!isAdminEmail && !isDeliveryEmail && !formData.role) {
      setShowRoleError(true);
      toast({ title: 'Error', description: 'Debes seleccionar un tipo de cuenta', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      localStorage.removeItem('user_role');

      const userRole = isAdminEmail ? 'admin' : (isDeliveryEmail ? 'delivery' : formData.role);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      await signUp(formData.email, formData.password, {
        fullName: fullName || undefined,
        role: userRole || undefined,
      });

      localStorage.setItem('pending_profile_data', JSON.stringify({
        full_name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone || null,
        role: userRole,
      }));
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('is_new_user', 'true');

      toast({
        title: '¡Cuenta creada exitosamente!',
        description: 'Revisa tu email para confirmar tu cuenta antes de iniciar sesión.',
      });

      navigate('/login');
    } catch (error: unknown) {
      let errorMessage = 'Error al crear la cuenta';

      if (error && typeof error === 'object') {
        const err = error as { status?: number; message?: string };
        if (err.status === 429 || err.message?.includes('Too Many Requests')) {
          errorMessage = 'Demasiados intentos. Espera unos momentos e intenta de nuevo.';
        } else if (err.message?.includes('already registered') || err.message?.includes('User already registered')) {
          errorMessage = 'Este email ya está registrado. Inicia sesión o usa otro email.';
        } else if (err.message?.includes('rate limit') || err.message?.includes('security purposes')) {
          const waitTime = err.message.match(/\d+/)?.[0] || 'algunos';
          errorMessage = `Espera ${waitTime} segundos antes de intentar de nuevo.`;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      toast({ title: 'Error de registro', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.acceptTerms &&
    formData.role &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  return (
    <AuthPageLayout
      variant="register"
      footer={
        <p className="text-xs text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-landing-aqua-dark hover:text-landing-mango-dark font-semibold">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Crear cuenta</h2>
          <p className="text-xs text-gray-500">Completa tus datos y elige tu rol</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Fila 1: nombre + apellido */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="firstName" className={authLabelClass}>Nombre *</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input id="firstName" name="firstName" required value={formData.firstName} onChange={handleInputChange} className={authInputClass} placeholder="Nombre" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName" className={authLabelClass}>Apellido *</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input id="lastName" name="lastName" required value={formData.lastName} onChange={handleInputChange} className={authInputClass} placeholder="Apellido" />
            </div>
          </div>
        </div>

        {/* Fila 2: email + teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="email" className={authLabelClass}>Email *</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} className={authInputClass} placeholder="tu@email.com" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone" className={authLabelClass}>Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className={authInputClass} placeholder="+502 1234-5678" />
            </div>
          </div>
        </div>

        {/* Rol — pills horizontales compactas */}
        <div className="space-y-1">
          <Label className={authLabelClass}>Tipo de cuenta *</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {authRoleOptions.map((role) => {
              const selected = formData.role === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, role: role.value }));
                    setShowRoleError(false);
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all text-left ${
                    selected
                      ? `${role.borderActive} ${role.bgActive}`
                      : 'border-gray-200 hover:border-landing-aqua/30 bg-white'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    selected ? `${role.gradient} ${role.colorText}` : 'bg-gray-100'
                  }`}>
                    <role.icon className={`w-3 h-3 ${selected ? role.colorText : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-[11px] font-semibold leading-tight ${selected ? role.textActive : 'text-gray-700'}`}>
                    {role.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
          {showRoleError && !formData.role && (
            <p className="text-[10px] text-red-500">Selecciona un tipo de cuenta</p>
          )}
        </div>

        {/* Fila 3: contraseñas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="password" className={authLabelClass}>Contraseña *</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleInputChange} className={`${authInputClass} pr-8`} placeholder="Mín. 8 caracteres" />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className={authLabelClass}>Confirmar *</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={handleInputChange} className={`${authInputClass} pr-8`} placeholder="Repite contraseña" />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Checkboxes en una fila en desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
          <div className="flex items-start gap-2">
            <Checkbox id="acceptTerms" checked={formData.acceptTerms} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, acceptTerms: checked as boolean }))} className="mt-0.5" />
            <Label htmlFor="acceptTerms" className="text-[10px] text-gray-600 leading-snug cursor-pointer">
              Acepto{' '}
              <Link to="/terms" className="text-landing-aqua-dark font-medium">Términos</Link>
              {' '}y{' '}
              <Link to="/privacy" className="text-landing-aqua-dark font-medium">Privacidad</Link> *
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="acceptMarketing" checked={formData.acceptMarketing} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, acceptMarketing: checked as boolean }))} className="mt-0.5" />
            <Label htmlFor="acceptMarketing" className="text-[10px] text-gray-600 leading-snug cursor-pointer">
              Recibir noticias de PetHub (opcional)
            </Label>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting || !isFormValid} className={`w-full h-9 text-sm ${landingBtnHero} font-semibold rounded-lg disabled:opacity-50`}>
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creando cuenta...
            </>
          ) : (
            'Crear cuenta'
          )}
        </Button>
      </form>
    </AuthPageLayout>
  );
};
