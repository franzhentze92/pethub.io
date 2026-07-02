import React, { useState, useCallback } from 'react';
import { LandingSpinner } from '@/components/PageLoader';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface ServiceImageUploadProps {
  imageUrl?: string;
  onImageUpload: (url: string | null) => void;
  disabled?: boolean;
}

export const ServiceImageUpload: React.FC<ServiceImageUploadProps> = ({
  imageUrl,
  onImageUpload,
  disabled = false
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuario no autenticado');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Por favor selecciona solo archivos de imagen.');
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande. El tamaño máximo es 50MB.');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `service-images/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath);

    return publicUrl;
  }, [user]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !user) return;

    try {
      setUploading(true);
      const publicUrl = await uploadImage(acceptedFiles[0]);
      onImageUpload(publicUrl);
      toast.success('Imagen del servicio subida correctamente');
    } catch (error: any) {
      console.error('Error uploading service image:', error);
      toast.error(error.message || 'Error al subir la imagen del servicio');
    } finally {
      setUploading(false);
    }
  }, [user, uploadImage, onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: disabled || uploading
  });

  const handleRemove = () => {
    onImageUpload(null);
  };

  return (
    <div className="space-y-2">
      <Label>Imagen del Servicio</Label>
      {imageUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={imageUrl}
                alt="Imagen del servicio"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
                disabled={disabled || uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="space-y-2">
                  <LandingSpinner size="sm" className="mx-auto" />
                  <p className="text-sm text-gray-600">Subiendo imagen...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {isDragActive
                      ? 'Suelta la imagen aquí'
                      : 'Arrastra una imagen aquí o haz clic para seleccionar'}
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF o WEBP (máx. 50MB)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-gray-500">
        Sube una imagen representativa del servicio
      </p>
    </div>
  );
};

