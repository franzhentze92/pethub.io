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
  Truck,
  Upload,
  X,
  Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import DeliverySidebar from '@/components/DeliverySidebar';
import PageLoader from '@/components/PageLoader';

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

interface DeliveryProfilePageProps {
  asTab?: boolean; // If true, render without sidebar and PageHeader
}

const DeliveryProfilePage: React.FC<DeliveryProfilePageProps> = ({ asTab = false }) => {
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
    // Verify delivery access
    const checkDeliveryAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (user.email !== 'delivery@pehtubgt.com') {
        navigate('/login');
        return;
      }

      localStorage.setItem('user_role', 'delivery');
      
      supabase
        .from('user_profiles')
        .update({ role: 'delivery', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating delivery role in profile:', error);
          }
        });

      loadProfile();
    };

    checkDeliveryAccess();
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
        setPreviewImage(profileData.avatar_url || null);
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user?.id,
            role: 'delivery',
            full_name: 'Delivery PetHub',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          toast.error('Error al crear perfil', {
            description: createError.message
          });
        } else if (newProfile) {
          setProfile(newProfile);
          setFormData({
            full_name: newProfile.full_name || '',
            phone: newProfile.phone || '',
            avatar_url: newProfile.avatar_url || ''
          });
          setPreviewImage(newProfile.avatar_url || null);
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    try {
      setUploadingImage(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Error', {
          description: 'Por favor selecciona solo archivos de imagen'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Error', {
          description: 'El archivo es demasiado grande. El tamaño máximo es 5MB'
        });
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          // Extract the file name from the URL
          const urlParts = profile.avatar_url.split('/');
          const oldFileName = urlParts[urlParts.length - 1];
          if (oldFileName) {
            await supabase.storage
              .from('avatars')
              .remove([oldFileName]);
          }
        } catch (error) {
          console.error('Error deleting old avatar:', error);
          // Continue even if deletion fails
        }
      }

      // Upload to Supabase storage
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

      // Update form data with new image URL
      setFormData({ ...formData, avatar_url: publicUrl });
      setPreviewImage(publicUrl);

      toast.success('Imagen subida', {
        description: 'La foto de perfil se ha subido correctamente'
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir imagen', {
        description: error.message || 'No se pudo subir la imagen'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setFormData({ ...formData, avatar_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          phone: formData.phone.trim() || null,
          avatar_url: formData.avatar_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Reload profile
      await loadProfile();
      
      setEditing(false);
      toast.success('Perfil actualizado', {
        description: 'Tu información ha sido guardada exitosamente'
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar perfil', {
        description: error.message || 'No se pudo guardar la información'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    if (asTab) {
      return <PageLoader variant="inline" message="Cargando perfil…" />;
    }
    return (
      <div className="flex min-h-screen bg-gray-50">
        <DeliverySidebar activeTab="profile" />
        <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
          <PageLoader variant="inline" message="Cargando perfil…" />
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {!asTab && (
        <PageHeader 
          title="Mi Perfil"
          subtitle="Gestiona tu información personal"
          gradient="from-blue-600 to-indigo-600"
          showNotifications={false}
        />
      )}

      {asTab && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
          <p className="text-sm text-gray-600">Gestiona tu información personal</p>
        </div>
      )}

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información Personal
                </CardTitle>
                {!editing && (
                  <Button
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Picture */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-400" />
                  Foto de Perfil
                </Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-2 border-gray-200">
                      <AvatarImage 
                        src={previewImage || profile?.avatar_url} 
                        alt="Foto de perfil"
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    {editing && previewImage && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                        onClick={handleRemoveImage}
                        disabled={uploadingImage}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {editing && (
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingImage ? 'Subiendo...' : 'Subir Foto'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG hasta 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Email (read-only) */}
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
                <p className="text-xs text-gray-500">El correo electrónico no se puede modificar</p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Nombre Completo
                </Label>
                {editing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ingresa tu nombre completo"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-gray-900">{profile?.full_name || 'No especificado'}</p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Teléfono
                </Label>
                {editing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ingresa tu número de teléfono"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-gray-900">{profile?.phone || 'No especificado'}</p>
                  </div>
                )}
              </div>

              {/* Role (read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  Rol
                </Label>
                <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-blue-900 font-medium">Delivery</p>
                </div>
              </div>

              {/* Account Created Date */}
              {profile?.created_at && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Cuenta Creada
                  </Label>
                  <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-gray-900">{formatDate(profile.created_at)}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {editing && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      // Reset form data
                      if (profile) {
                        setFormData({
                          full_name: profile.full_name || '',
                          phone: profile.phone || '',
                          avatar_url: profile.avatar_url || ''
                        });
                        setPreviewImage(profile.avatar_url || null);
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || uploadingImage}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID de Usuario:</span>
                <span className="font-mono text-xs text-gray-500">{user?.id?.slice(0, 8)}...</span>
              </div>
              {profile?.updated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Última Actualización:</span>
                  <span className="text-gray-900">{formatDate(profile.updated_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  );

  if (asTab) {
    return content;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DeliverySidebar activeTab="profile" />

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: '64px' }}>
        <div className="p-6 space-y-6" style={{ paddingBottom: '100px' }}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default DeliveryProfilePage;

