import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MobileFormDialog, MobileFormActions } from '@/components/mobile/MobileFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreatePet, useUpdatePet } from '@/hooks/useSettings'
import { supabase } from '@/lib/supabase'
import { Loader2, Upload, X, Star } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_PET_IMAGES, getPetImageUrls, syncPetImages, buildPetGalleryUrls, getStylizeSourceUrl, type PetImageRow } from '@/utils/petImages'
import PetAvatarStylizer from '@/components/PetAvatarStylizer'
import { getStylizedStyleFromUrl } from '@/lib/stylizePet'
import { cn } from '@/lib/utils'
import { plainPageAccentOutlineBtn, plainPageAccentUi, type PlainPageAccent } from '@/lib/landingTheme'
import { SPECIES_FORM_OPTIONS, GENDER_FORM_OPTIONS, isDogSpecies, normalizeSpeciesToSpanish, SPECIES_ES } from '@/utils/petLabels'
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext'

interface PetModalProps {
  isOpen: boolean
  onClose: () => void
  pet?: {
    id: string
    name: string
    species: string
    breed: string | null
    age: number | null
    weight: number | null
    gender?: string | null
    microchip: string | null
    available_for_breeding: boolean
    image_url: string | null
    pet_images?: PetImageRow[] | null
  }
  ownerId: string
  accent?: PlainPageAccent
}

const PetModal: React.FC<PetModalProps> = ({ isOpen, onClose, pet, ownerId, accent = 'aqua' }) => {
  const ui = plainPageAccentUi(accent)
  const outlineBtnClass = plainPageAccentOutlineBtn[accent]
  const [formData, setFormData] = useState({
    name: '',
    species: SPECIES_ES.PERRO,
    breed: '',
    age: '',
    weight: '',
    gender: '',
    microchip: '',
    available_for_breeding: false,
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [selectedPrimaryUrl, setSelectedPrimaryUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createPet = useCreatePet()
  const updatePet = useUpdatePet()
  const guidedTour = useBlueprintGuidedTourOptional()

  const isEditing = !!pet

  // Lista completa de razas de perros
  const dogBreeds = [
    'Mestizo',
    'Afgano',
    'Airedale Terrier',
    'Akita',
    'Akita Americano',
    'Alaskan Malamute',
    'American Bulldog',
    'American Pit Bull Terrier',
    'American Staffordshire Terrier',
    'American Water Spaniel',
    'Australian Cattle Dog',
    'Australian Kelpie',
    'Australian Shepherd',
    'Australian Terrier',
    'Azawakh',
    'Basenji',
    'Basset Hound',
    'Beagle',
    'Bearded Collie',
    'Bedlington Terrier',
    'Belgian Malinois',
    'Belgian Shepherd',
    'Belgian Tervuren',
    'Bergamasco',
    'Bernese Mountain Dog',
    'Bichon Frisé',
    'Bichon Maltés',
    'Black and Tan Coonhound',
    'Bloodhound',
    'Border Collie',
    'Border Terrier',
    'Borzoi',
    'Boston Terrier',
    'Bouvier des Flandres',
    'Boxer',
    'Boykin Spaniel',
    'Bracco Italiano',
    'Briard',
    'Brittany',
    'Brussels Griffon',
    'Bull Terrier',
    'Bulldog',
    'Bulldog Francés',
    'Bullmastiff',
    'Cairn Terrier',
    'Cane Corso',
    'Cardigan Welsh Corgi',
    'Cavalier King Charles Spaniel',
    'Chesapeake Bay Retriever',
    'Chihuahua',
    'Chinese Crested',
    'Chin',
    'Chow Chow',
    'Clumber Spaniel',
    'Cocker Spaniel',
    'Cocker Spaniel Americano',
    'Collie',
    'Coonhound',
    'Curly-Coated Retriever',
    'Dachshund',
    'Dalmatian',
    'Dandie Dinmont Terrier',
    'Doberman Pinscher',
    'Dogo Argentino',
    'Dogo de Burdeos',
    'English Cocker Spaniel',
    'English Foxhound',
    'English Setter',
    'English Springer Spaniel',
    'English Toy Spaniel',
    'Field Spaniel',
    'Finnish Spitz',
    'Flat-Coated Retriever',
    'Fox Terrier',
    'Foxhound',
    'French Bulldog',
    'German Pinscher',
    'German Shepherd',
    'German Shorthaired Pointer',
    'German Wirehaired Pointer',
    'Giant Schnauzer',
    'Glen of Imaal Terrier',
    'Golden Retriever',
    'Gordon Setter',
    'Great Dane',
    'Great Pyrenees',
    'Greater Swiss Mountain Dog',
    'Greyhound',
    'Harrier',
    'Havanese',
    'Ibizan Hound',
    'Irish Red and White Setter',
    'Irish Setter',
    'Irish Terrier',
    'Irish Water Spaniel',
    'Irish Wolfhound',
    'Italian Greyhound',
    'Jack Russell Terrier',
    'Japanese Chin',
    'Keeshond',
    'Kerry Blue Terrier',
    'Komondor',
    'Kuvasz',
    'Labrador Retriever',
    'Lagotto Romagnolo',
    'Lakeland Terrier',
    'Leonberger',
    'Lhasa Apso',
    'Lowchen',
    'Maltese',
    'Manchester Terrier',
    'Mastiff',
    'Miniature Bull Terrier',
    'Miniature Pinscher',
    'Miniature Schnauzer',
    'Neapolitan Mastiff',
    'Newfoundland',
    'Norfolk Terrier',
    'Norwegian Buhund',
    'Norwegian Elkhound',
    'Norwich Terrier',
    'Nova Scotia Duck Tolling Retriever',
    'Old English Sheepdog',
    'Otterhound',
    'Papillon',
    'Parson Russell Terrier',
    'Pekingese',
    'Pembroke Welsh Corgi',
    'Petit Basset Griffon Vendéen',
    'Pharaoh Hound',
    'Plott',
    'Pointer',
    'Polish Lowland Sheepdog',
    'Pomeranian',
    'Poodle',
    'Poodle Estándar',
    'Poodle Miniatura',
    'Poodle Toy',
    'Portuguese Water Dog',
    'Pug',
    'Puli',
    'Pumi',
    'Rat Terrier',
    'Redbone Coonhound',
    'Rhodesian Ridgeback',
    'Rottweiler',
    'Saint Bernard',
    'Saluki',
    'Samoyed',
    'Schipperke',
    'Schnauzer',
    'Schnauzer Estándar',
    'Scottish Deerhound',
    'Scottish Terrier',
    'Sealyham Terrier',
    'Shar Pei',
    'Shetland Sheepdog',
    'Shiba Inu',
    'Shih Tzu',
    'Siberian Husky',
    'Silky Terrier',
    'Skye Terrier',
    'Smooth Fox Terrier',
    'Soft Coated Wheaten Terrier',
    'Spinone Italiano',
    'Staffordshire Bull Terrier',
    'Standard Schnauzer',
    'Sussex Spaniel',
    'Swedish Vallhund',
    'Tibetan Mastiff',
    'Tibetan Spaniel',
    'Tibetan Terrier',
    'Toy Fox Terrier',
    'Treeing Walker Coonhound',
    'Vizsla',
    'Weimaraner',
    'Welsh Springer Spaniel',
    'Welsh Terrier',
    'West Highland White Terrier',
    'Whippet',
    'Wire Fox Terrier',
    'Wirehaired Pointing Griffon',
    'Xoloitzcuintli',
    'Yorkshire Terrier',
    'Otra'
  ].sort((a, b) => {
    // Mantener "Mestizo" y "Otra" al final
    if (a === 'Mestizo') return -1;
    if (b === 'Mestizo') return 1;
    if (a === 'Otra') return 1;
    if (b === 'Otra') return -1;
    return a.localeCompare(b);
  })

  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name,
        species: normalizeSpeciesToSpanish(pet.species),
        breed: pet.breed || '',
        age: pet.age?.toString() || '',
        weight: pet.weight?.toString() || '',
        gender: pet.gender || '',
        microchip: pet.microchip || '',
        available_for_breeding: pet.available_for_breeding,
      })
      setImageUrls(getPetImageUrls(pet))
      setSelectedPrimaryUrl(getPetImageUrls(pet)[0] ?? null)
    } else {
      setFormData({
        name: '',
        species: SPECIES_ES.PERRO,
        breed: '',
        age: '',
        weight: '',
        gender: '',
        microchip: '',
        available_for_breeding: false,
      })
      setImageUrls([])
      setSelectedPrimaryUrl(null)
    }
  }, [pet, isOpen])

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${ownerId}/pets/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const files = Array.from(event.target.files ?? [])
      if (files.length === 0) return

      const remaining = MAX_PET_IMAGES - imageUrls.length
      if (remaining <= 0) {
        toast.warning(`Máximo ${MAX_PET_IMAGES} fotos por mascota.`)
        return
      }

      const toUpload = files.slice(0, remaining)
      if (files.length > remaining) {
        toast.warning(`Solo se pueden agregar ${remaining} foto(s) más (máximo ${MAX_PET_IMAGES}).`)
      }

      const newUrls: string[] = []
      for (const file of toUpload) {
        if (file.size > 50 * 1024 * 1024) {
          toast.warning(`"${file.name}" es demasiado grande. Máximo 50MB.`)
          continue
        }
        const url = await uploadFile(file)
        newUrls.push(url)
      }
      if (newUrls.length > 0) {
        setImageUrls((prev) => [...prev, ...newUrls].slice(0, MAX_PET_IMAGES))
        if (imageUrls.length === 0) {
          setSelectedPrimaryUrl(newUrls[0])
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error al subir la imagen. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => {
      const removed = prev[index]
      const next = prev.filter((_, i) => i !== index)
      if (removed && selectedPrimaryUrl === removed) {
        setSelectedPrimaryUrl(next[0] ?? null)
      }
      return next
    })
  }

  const setAsPrimary = (url: string) => {
    setSelectedPrimaryUrl(url)
    setImageUrls((prev) => {
      if (!prev.includes(url)) return prev
      return [url, ...prev.filter((item) => item !== url)]
    })
  }

  const handleStylizedImageCreated = (url: string) => {
    setImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url].slice(0, MAX_PET_IMAGES)))
  }

  const getPetEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog': return '🐕'
      case 'cat': return '🐱'
      case 'bird': return '🐦'
      case 'fish': return '🐠'
      default: return '🐾'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.available_for_breeding && !formData.gender) {
      toast.warning('Selecciona el género de tu mascota para publicarla en Parejas.')
      return
    }
    
    try {
      const primaryImage = selectedPrimaryUrl ?? imageUrls[0] ?? null
      const galleryUrls = buildPetGalleryUrls(imageUrls, primaryImage)
      if (isEditing && pet) {
        await updatePet.mutateAsync({
          id: pet.id,
          name: formData.name,
          species: formData.species,
          breed: formData.breed || null,
          age: formData.age ? parseInt(formData.age) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          gender: formData.gender || null,
          microchip: formData.microchip || null,
          available_for_breeding: formData.available_for_breeding,
          image_url: primaryImage,
        })
        await syncPetImages(pet.id, galleryUrls)
      } else {
        const created = await createPet.mutateAsync({
          name: formData.name,
          species: formData.species,
          breed: formData.breed || null,
          age: formData.age ? parseInt(formData.age) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          gender: formData.gender || null,
          microchip: formData.microchip || null,
          available_for_breeding: formData.available_for_breeding,
          image_url: primaryImage,
          owner_id: ownerId,
        })
        if (galleryUrls.length > 0) {
          await syncPetImages(created.id, galleryUrls)
        }
      }
      guidedTour?.notifySectionSaved('pets')
      if (formData.available_for_breeding) {
        void guidedTour?.notifySectionSaved('breeding')
      }
      onClose()
    } catch (error) {
      console.error('Error saving pet:', error)
    }
  }

  const isLoading = createPet.isPending || updatePet.isPending || uploading
  const primaryImageUrl = selectedPrimaryUrl ?? imageUrls[0] ?? null
  const stylizeSourceUrl = getStylizeSourceUrl(imageUrls)
  const existingStylizedUrls = useMemo(
    () =>
      imageUrls.reduce<Partial<Record<'monster90s' | 'digital', string>>>((acc, url) => {
        const style = getStylizedStyleFromUrl(url)
        if (style) acc[style] = url
        return acc
      }, {}),
    [imageUrls]
  )
  const formId = 'pet-form'

  return (
    <MobileFormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Mascota' : 'Agregar Mascota'}
      description={isEditing ? 'Actualiza los datos de tu mascota' : 'Registra una nueva mascota en tu perfil'}
      accent={accent}
      footer={
        <MobileFormActions
          formId={formId}
          onCancel={onClose}
          submitLabel={isEditing ? 'Actualizar' : 'Crear'}
          loading={isLoading}
          submitDisabled={isLoading}
          accent={accent}
        />
      }
    >
        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          {/* Pet Images Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fotos de la Mascota</Label>
              <span className="text-xs text-gray-500">{imageUrls.length}/{MAX_PET_IMAGES}</span>
            </div>

            {imageUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => {
                    const isPrimary = url === primaryImageUrl
                    return (
                      <div
                        key={`${url}-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setAsPrimary(url)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setAsPrimary(url)
                          }
                        }}
                        className={cn(
                          'relative aspect-square rounded-xl overflow-hidden transition-all cursor-pointer',
                          isPrimary
                            ? cn('ring-2 ring-offset-2 shadow-sm', accent === 'tropical' ? 'ring-landing-tropical' : accent === 'mango' ? 'ring-landing-mango' : 'ring-landing-aqua')
                            : cn('ring-1 ring-gray-200 active:scale-[0.98]', accent === 'tropical' ? 'hover:ring-landing-tropical/50' : 'hover:ring-landing-aqua/40'),
                        )}
                        aria-label={isPrimary ? 'Foto principal' : 'Usar como foto principal'}
                        aria-pressed={isPrimary}
                      >
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(index)
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
                          aria-label="Eliminar foto"
                        >
                          <X size={12} />
                        </button>
                        {isPrimary ? (
                          <span className={cn(
                            'absolute bottom-1 left-1 flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                            accent === 'tropical' ? 'bg-landing-tropical text-gray-900' : 'bg-landing-aqua text-white',
                          )}>
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Principal
                          </span>
                        ) : (
                          <span className="absolute bottom-1 inset-x-1 text-[8px] bg-black/55 text-white text-center py-0.5 rounded-md leading-tight">
                            Toca para principal
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {imageUrls.length > 1 && (
                  <p className="text-xs text-gray-500 text-center">
                    Toca cualquier foto para usarla como principal en el perfil
                  </p>
                )}
              </div>
            ) : (
              <div className={cn('w-full aspect-[3/1] rounded-2xl flex items-center justify-center text-3xl shadow-md', ui.iconBg)}>
                {getPetEmoji(formData.species)}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="pet-image-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || imageUrls.length >= MAX_PET_IMAGES}
              className={cn('w-full min-h-[44px]', outlineBtnClass)}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {imageUrls.length > 0 ? 'Agregar más fotos' : 'Subir fotos'}
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Hasta {MAX_PET_IMAGES} fotos. JPG, PNG o GIF. Máximo 50MB c/u.
            </p>

            <PetAvatarStylizer
              sourceImageUrl={stylizeSourceUrl}
              onPrimarySelect={setSelectedPrimaryUrl}
              onStylizedImageCreated={handleStylizedImageCreated}
              existingStylizedUrls={existingStylizedUrls}
              species={formData.species}
              breed={formData.breed}
              name={formData.name}
              disabled={isLoading}
              accent={accent}
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre de la mascota"
                className="min-h-[44px]"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="species">Especie</Label>
                <Select value={formData.species} onValueChange={(value) => setFormData(prev => ({ ...prev, species: value }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIES_FORM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  required={formData.available_for_breeding}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_FORM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="breed">Raza</Label>
              {isDogSpecies(formData.species) ? (
                <Select 
                  value={formData.breed} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, breed: value }))}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecciona una raza" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(280px,50dvh)]">
                    {dogBreeds.map((breed) => (
                      <SelectItem key={breed} value={breed}>
                        {breed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                  placeholder="Raza de la mascota"
                  className="min-h-[44px]"
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Edad (años)</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="min-h-[44px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="0.0"
                  min="0"
                  className="min-h-[44px]"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="microchip">Microchip</Label>
              <Input
                id="microchip"
                value={formData.microchip}
                onChange={(e) => setFormData(prev => ({ ...prev, microchip: e.target.value }))}
                placeholder="Número de microchip"
                className="min-h-[44px]"
              />
            </div>
            
            <div
              className={cn('flex items-center gap-3 min-h-[44px] p-3 rounded-xl border', ui.bgSoft, ui.borderLight)}
              data-blueprint-guided="enable-breeding"
            >
              <Checkbox
                id="available_for_breeding"
                checked={formData.available_for_breeding}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available_for_breeding: checked as boolean }))}
              />
              <Label htmlFor="available_for_breeding" className="cursor-pointer text-sm leading-snug">
                Disponible para reproducción
              </Label>
            </div>
          </div>
        </form>
    </MobileFormDialog>
  )
}

export default PetModal
