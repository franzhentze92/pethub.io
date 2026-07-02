import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  Edit,
  Shield,
  Upload,
  X,
  Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import AdminSidebar from '@/components/AdminSidebar';
import PageLoader from '@/components/PageLoader';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

const AdminProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  });

  useEffect(() => {
    // Verify admin access
    const checkAdminAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (user.email !== 'admin@pethubgt.com') {
        navigate('/login');
        return;
      }

      localStorage.setItem('user_role', 'admin');
      
      supabase
        .from('user_profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating admin role in profile:', error);
          }
        });

      loadProfile();
    };

    checkAdminAccess();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
        toast.error('Error al cargar perfil', {
          description: profileError.message
        });
        return;
      }

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          avatar_url: profileData.avatar_url || ''
        });
        if (profileData.avatar_url) {
          setPreviewImage(profileData.avatar_url);
        }
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user?.id,
            full_name: user?.email?.split('@')[0] || 'Admin',
            role: 'admin'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          toast.error('Error al crear perfil', {
            description: createError.message
          });
          return;
        }

        if (newProfile) {
          setProfile(newProfile);
          setFormData({
            full_name: newProfile.full_name || '',
            phone: newProfile.phone || '',
            avatar_url: newProfile.avatar_url || ''
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil actualizado', {
        description: 'Tu perfil ha sido actualizado correctamente'
      });

      setEditing(false);
      await loadProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar perfil', {
        description: error.message || 'No se pudo actualizar el perfil'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    try {
      setUploadingImage(true);

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldFileName = profile.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([oldFileName]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update form data
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      // Update profile immediately
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setPreviewImage(publicUrl);
      toast.success('Foto de perfil actualizada', {
        description: 'Tu foto de perfil ha sido actualizada correctamente'
      });

      await loadProfile();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir imagen', {
        description: error.message || 'No se pudo subir la imagen'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !profile?.avatar_url) return;

    try {
      setUploadingImage(true);

      // Delete from storage
      const fileName = profile.avatar_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('avatars')
          .remove([fileName]);
      }

      // Update profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setFormData(prev => ({ ...prev, avatar_url: '' }));
      setPreviewImage(null);
      toast.success('Foto de perfil eliminada', {
        description: 'Tu foto de perfil ha sido eliminada'
      });

      await loadProfile();
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast.error('Error al eliminar imagen', {
        description: error.message || 'No se pudo eliminar la imagen'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Tipo de archivo no válido', {
        description: 'Por favor selecciona una imagen'
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', {
        description: 'El archivo debe ser menor a 5MB'
      });
      return;
    }

    handleImageUpload(file);
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1">
          <PageLoader variant="inline" message="Cargando perfil…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Mi Perfil"
          description="Gestiona tu información personal y configuración de cuenta"
        />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="space-y-2">
                  <Label htmlFor="avatar_url" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Foto de Perfil
                  </Label>
                  <ProfilePictureUpload
                    currentImageUrl={profile?.avatar_url || undefined}
                    onImageChange={handleImageUpload}
                    onImageRemove={handleRemoveImage}
                    disabled={!editing || uploadingImage}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={!editing || uploadingImage}
                  />
                  <p className="text-xs text-gray-500">
                    Sube una imagen clara de tu perfil. Máx. 5MB (JPG, PNG, GIF, WebP).
                  </p>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    El correo electrónico no se puede modificar
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Nombre Completo
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!editing}
                    placeholder="Ingresa tu nombre completo"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editing}
                    placeholder="Ingresa tu número de teléfono"
                  />
                </div>

                {/* Role (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    Rol
                  </Label>
                  <Input
                    id="role"
                    type="text"
                    value="Administrador"
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Created At (Read-only) */}
                {profile?.created_at && (
                  <div className="space-y-2">
                    <Label htmlFor="created_at" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Fecha de Registro
                    </Label>
                    <Input
                      id="created_at"
                      type="text"
                      value={new Date(profile.created_at).toLocaleDateString('es-GT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {!editing ? (
                    <Button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Editar Perfil
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={saving || uploadingImage}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditing(false);
                          if (profile) {
                            setFormData({
                              full_name: profile.full_name || '',
                              phone: profile.phone || '',
                              avatar_url: profile.avatar_url || ''
                            });
                            setPreviewImage(profile.avatar_url);
                          }
                        }}
                        variant="outline"
                        disabled={saving || uploadingImage}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;

