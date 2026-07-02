import React, { useState, useCallback } from 'react';
import { LandingSpinner } from '@/components/PageLoader';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Image as ImageIcon, Upload, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProductImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (url: string | null) => void;
  disabled?: boolean;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  disabled = false
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [showPreview, setShowPreview] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !user) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen.');
      return;
    }

    // Validate file size (max 50MB - Supabase default limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El tamaño máximo es 50MB.');
      return;
    }



    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Update state and notify parent
      setPreviewUrl(publicUrl);
      onImageUpload(publicUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
      });
      alert('Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  }, [user, onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: disabled || uploading
  });

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUpload(null);
  };

  const handleTogglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      {currentImageUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Imagen Actual</h4>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTogglePreview}
                disabled={disabled}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Ocultar' : 'Ver'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
                Eliminar
              </Button>
            </div>
          </div>
          
          {showPreview && (
            <div className="relative">
              <img
                src={currentImageUrl}
                alt="Product preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragActive 
          ? 'border-emerald-400 bg-emerald-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}>
        <CardContent className="p-6">
          <div {...getRootProps()} className="text-center cursor-pointer">
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-3 rounded-full ${
                isDragActive ? 'bg-emerald-100' : 'bg-gray-100'
              }`}>
                {uploading ? (
                  <LandingSpinner size="sm" className="mx-auto" />
                ) : (
                  <Upload className={`h-8 w-8 ${
                    isDragActive ? 'text-emerald-600' : 'text-gray-600'
                  }`} />
                )}
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {uploading ? 'Subiendo imagen...' : 'Subir imagen del producto'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {isDragActive 
                    ? 'Suelta la imagen aquí' 
                    : 'Arrastra y suelta una imagen, o haz clic para seleccionar'
                  }
                </p>
                                 <p className="text-xs text-gray-400 mt-2">
                   PNG, JPG, GIF, WEBP hasta 50MB
                 </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-emerald-600">
            <LandingSpinner size="sm" className="mx-auto" />
            <span>Subiendo imagen...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {!currentImageUrl && !previewUrl && (
        <p className="text-sm text-gray-500 text-center">
          No hay imagen seleccionada. Sube una imagen para mostrar el producto.
        </p>
      )}
    </div>
  );
};
