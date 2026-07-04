import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCreateAdoptionPet, useUpdateAdoptionPet } from '@/hooks/useAdoption'
import { ADOPTION_SPECIES_FORM_OPTIONS, normalizeSpeciesToSpanish, SPECIES_ES } from '@/utils/petLabels'
import { toast } from 'sonner'

interface AdoptionPetModalProps {
  isOpen: boolean
  onClose: () => void
  ownerId: string
  shelterId?: string
  pet?: any | null
}

const AdoptionPetModal: React.FC<AdoptionPetModalProps> = ({ isOpen, onClose, ownerId, shelterId, pet }) => {
  const isEditing = !!pet?.id
  const [formData, setFormData] = useState({
    name: '',
    species: SPECIES_ES.PERRO,
    breed: '',
    sex: 'M',
    age: '',
    size: 'Medium',
    energy_level: 'Medium',
    good_with_kids: true,
    good_with_dogs: true,
    good_with_cats: false,
    description: '',
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createPet = useCreateAdoptionPet()
  const updatePet = useUpdateAdoptionPet()

  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name || '',
        species: normalizeSpeciesToSpanish(pet.species),
        breed: pet.breed || '',
        sex: pet.sex || 'M',
        age: pet.age?.toString() || '',
        size: pet.size || 'Medium',
        energy_level: pet.energy_level || 'Medium',
        good_with_kids: !!pet.good_with_kids,
        good_with_dogs: !!pet.good_with_dogs,
        good_with_cats: !!pet.good_with_cats,
        description: pet.description || '',
      })
      setImageUrl(pet.image_url || null)
      setPreviewUrl(null)
    } else {
      setFormData({
        name: '', species: 'Dog', breed: '', sex: 'M', age: '', size: 'Medium', energy_level: 'Medium',
        good_with_kids: true, good_with_dogs: true, good_with_cats: false, description: '',
      })
      setImageUrl(null)
      setPreviewUrl(null)
    }
  }, [pet])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.warning('Máximo 50MB')
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
      reader.readAsDataURL(file)

      // delete old
      if (imageUrl) {
        const parts = imageUrl.split('/')
        const name = parts[parts.length - 1]
        const path = `${ownerId}/adoption/${name}`
        await supabase.storage.from('avatars').remove([path])
      }

      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${ownerId}/adoption/${filename}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setImageUrl(publicUrl)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: formData.name,
      species: formData.species,
      breed: formData.breed || null,
      sex: formData.sex,
      age: formData.age ? Number(formData.age) : null,
      size: formData.size,
      energy_level: formData.energy_level,
      good_with_kids: formData.good_with_kids,
      good_with_dogs: formData.good_with_dogs,
      good_with_cats: formData.good_with_cats,
      description: formData.description || null,
      image_url: imageUrl,
      owner_id: ownerId,
      shelter_id: shelterId || null,
      status: 'available' as const,
    }

    try {
      if (isEditing) {
        await updatePet.mutateAsync({ id: pet.id, ...payload })
      } else {
        await createPet.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Mascota en Adopción' : 'Agregar Mascota en Adopción'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              {previewUrl || imageUrl ? (
                <div className="relative">
                  <img src={previewUrl || imageUrl || ''} className="w-24 h-24 rounded-lg object-cover border" />
                  <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" onClick={() => { setImageUrl(null); setPreviewUrl(null); }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-100 border flex items-center justify-center text-gray-400 text-xs">Sin imagen</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>) : (<><Upload className="w-4 h-4 mr-2" /> Subir imagen</>)}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={formData.name} onChange={(e) => setFormData(v => ({ ...v, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Especie</Label>
              <Select value={formData.species} onValueChange={(val) => setFormData(v => ({ ...v, species: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADOPTION_SPECIES_FORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Raza</Label>
              <Input value={formData.breed} onChange={(e) => setFormData(v => ({ ...v, breed: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Sexo</Label>
              <Select value={formData.sex} onValueChange={(val) => setFormData(v => ({ ...v, sex: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Macho</SelectItem>
                  <SelectItem value="F">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Edad (años)</Label>
              <Input type="number" min={0} value={formData.age} onChange={(e) => setFormData(v => ({ ...v, age: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tamaño</Label>
              <Select value={formData.size} onValueChange={(val) => setFormData(v => ({ ...v, size: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small">Pequeño</SelectItem>
                  <SelectItem value="Medium">Mediano</SelectItem>
                  <SelectItem value="Large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nivel de energía</Label>
              <Select value={formData.energy_level} onValueChange={(val) => setFormData(v => ({ ...v, energy_level: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Bajo</SelectItem>
                  <SelectItem value="Medium">Medio</SelectItem>
                  <SelectItem value="High">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={formData.good_with_kids} onCheckedChange={(c) => setFormData(v => ({ ...v, good_with_kids: !!c }))} /> Con niños</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={formData.good_with_dogs} onCheckedChange={(c) => setFormData(v => ({ ...v, good_with_dogs: !!c }))} /> Con perros</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={formData.good_with_cats} onCheckedChange={(c) => setFormData(v => ({ ...v, good_with_cats: !!c }))} /> Con gatos</label>
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea rows={3} value={formData.description} onChange={(e) => setFormData(v => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createPet.isPending || updatePet.isPending || uploading}>
              {(createPet.isPending || updatePet.isPending || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AdoptionPetModal
