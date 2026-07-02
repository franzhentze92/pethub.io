import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateUserProfile } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'
import { Loader2, Upload, X } from 'lucide-react'
import { MobileFormDialog, MobileFormActions } from '@/components/mobile/MobileFormDialog'
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: {
    id: string
    user_id?: string
    full_name: string | null
    phone: string | null
    address: string | null
    avatar_url: string | null
  }
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profile }) => {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    address: profile.address || '',
  })
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateProfile = useUpdateUserProfile()
  const guidedTour = useBlueprintGuidedTourOptional()
  const formId = 'edit-profile-form'

  useEffect(() => {
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
    })
    setAvatarUrl(profile.avatar_url)
    setPreviewUrl(null)
  }, [profile, isOpen])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 50 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 50MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrl(e.target?.result as string)
      reader.readAsDataURL(file)

      const userId = profile.user_id
      if (avatarUrl && userId) {
        try {
          const urlParts = avatarUrl.split('/')
          const fileName = urlParts[urlParts.length - 1]
          await supabase.storage.from('avatars').remove([`${userId}/${fileName}`])
        } catch {
          /* ignore */
        }
      }

      if (!userId) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setAvatarUrl(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        avatar_url: avatarUrl,
      })
      guidedTour?.notifySectionSaved('profile')
      onClose()
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isLoading = updateProfile.isPending || uploading

  return (
    <MobileFormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Editar Perfil"
      description="Actualiza tu información personal y foto de perfil"
      footer={
        <MobileFormActions
          formId={formId}
          onCancel={onClose}
          submitLabel="Guardar"
          loading={isLoading}
          submitDisabled={isLoading}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <Label>Foto de Perfil</Label>
          <div className="flex flex-col items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl || previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl || avatarUrl || ''}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-landing-aqua to-landing-mango rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white">
                  {getInitials(formData.full_name)}
                </div>
              )}
            </div>

            <div className="w-full space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="avatar-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {avatarUrl || previewUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">JPG, PNG o GIF. Máximo 50MB.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Tu nombre completo"
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+502 1234-5678"
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Tu dirección completa"
              rows={3}
              className="min-h-[88px] resize-none"
            />
          </div>
        </div>
      </form>
    </MobileFormDialog>
  )
}

export default EditProfileModal
