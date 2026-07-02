import React, { useState } from 'react';
import { LandingSpinner } from '@/components/PageLoader';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreatePet } from '@/hooks/useSettings';
import { supabase } from '@/lib/supabase';
import PetAvatarStylizer from '@/components/PetAvatarStylizer';
import { buildPetGalleryUrls, getStylizeSourceUrl, syncPetImages } from '@/utils/petImages';
import { SPECIES_FORM_OPTIONS, GENDER_FORM_OPTIONS, isDogSpecies, SPECIES_ES } from '@/utils/petLabels';
import {
  PawPrint, Heart, Sparkles, Camera, Upload, X, Loader2,
  ArrowRight, Star, Gift, PartyPopper
} from 'lucide-react';

const PetCreation: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createPet = useCreatePet();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    species: SPECIES_ES.PERRO,
    breed: '',
    age: '',
    weight: '',
    gender: '',
    microchip: '',
    available_for_breeding: false,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const getDisplayImageUrl = () => selectedImageUrl ?? previewUrl ?? imageUrl;

  const steps = [
    { id: 1, title: "Welcome!", description: "Let's bring your pet to life" },
    { id: 2, title: "Meet Your Pet", description: "Tell us about your new friend" },
    { id: 3, title: "Photo Time", description: "Add a photo of your pet" },
    { id: 4, title: "Ready!", description: "Your pet is ready to join you" }
  ];

  const getPetEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🐦';
      case 'fish': return '🐠';
      default: return '🐾';
    }
  };

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
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id}/pets/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      setSelectedImageUrl(publicUrl);
      setGalleryUrls((prev) => (prev.includes(publicUrl) ? prev : [...prev, publicUrl]));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreatePet = async () => {
    if (!user?.id) return;

    if (formData.available_for_breeding && !formData.gender) {
      alert('Selecciona el género de tu mascota para publicarla en Parejas.');
      return;
    }
    
    try {
      const primaryImage = getDisplayImageUrl();
      const allGalleryUrls = buildPetGalleryUrls(galleryUrls, primaryImage);

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
        owner_id: user.id,
      });

      if (allGalleryUrls.length > 0) {
        await syncPetImages(created.id, allGalleryUrls);
      }
      
      // Trigger celebration
      setShowCelebration(true);
      
      // After celebration, navigate to pet room
      setTimeout(() => {
        navigate('/pet-room');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating pet:', error);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setPreviewUrl(null);
    setSelectedImageUrl(null);
    setGalleryUrls([]);
  };

  const handleStylizedImageCreated = (url: string) => {
    setGalleryUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const stylizeSourceUrl = getStylizeSourceUrl(galleryUrls);

  if (showCelebration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Felicitaciones!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              {formData.name} ha nacido y está listo para ser tu compañero
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              {getDisplayImageUrl() ? (
                <img
                  src={getDisplayImageUrl() || ''}
                  alt={formData.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl">
                  {getPetEmoji(formData.species)}
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ¡Hola! Soy {formData.name} {getPetEmoji(formData.species)}
            </h2>
            <p className="text-gray-600 mb-4">
              ¡Gracias por adoptarme! Estoy muy emocionado de conocerte.
            </p>
            <div className="flex items-center justify-center gap-2 bg-yellow-50 rounded-lg p-3">
              <Gift className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                ¡Ganaste 10 PetPoints como regalo de bienvenida!
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Te llevaremos a tu nueva habitación en un momento...
            </p>
            <LandingSpinner size="sm" className="mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido a PetHub! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Vamos a crear tu primer compañero digital
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? 'bg-purple-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">
              {steps[currentStep - 1].title}
            </CardTitle>
            <p className="text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">🐾</div>
                <p className="text-lg text-gray-600">
                  En PetHub, tu mascota será el centro de todo. Vamos a crear tu primer compañero digital.
                </p>
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
                  <p className="text-sm text-purple-800">
                    <Heart className="w-4 h-4 inline mr-2" />
                    Cada acción que hagas será por el amor y cuidado de tu mascota
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Pet Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">{getPetEmoji(formData.species)}</div>
                  <p className="text-gray-600">Cuéntanos sobre tu nueva mascota</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de tu mascota</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="¿Cómo se llama tu mascota?"
                      className="text-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="species">Especie</Label>
                      <Select value={formData.species} onValueChange={(value) => setFormData(prev => ({ ...prev, species: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIES_FORM_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label === 'Perro' ? '🐕 Perro' :
                               option.label === 'Gato' ? '🐱 Gato' :
                               option.label === 'Ave' ? '🐦 Ave' :
                               option.label === 'Pez' ? '🐠 Pez' : '🐾 Otro'}
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
                        <SelectTrigger>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una raza" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
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
                          placeholder="Raza (opcional)"
                        />
                      )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Edad (años)</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="weight">Peso (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="0.0"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Photo */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Camera className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                  <p className="text-gray-600">¡Agrega una foto y elige un estilo nostálgico!</p>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {getDisplayImageUrl() ? (
                      <div className="relative">
                        <img
                          src={getDisplayImageUrl() || ''}
                          alt="Pet"
                          className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl border-4 border-purple-200">
                        {getPetEmoji(formData.species)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="pet-image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('pet-image-upload')?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {imageUrl || previewUrl ? 'Cambiar Foto' : 'Subir Foto'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500">
                      JPG, PNG o GIF. Máximo 5MB.
                    </p>
                  </div>
                </div>

                {stylizeSourceUrl && (
                  <PetAvatarStylizer
                    sourceImageUrl={stylizeSourceUrl}
                    onPrimarySelect={setSelectedImageUrl}
                    onStylizedImageCreated={handleStylizedImageCreated}
                    species={formData.species}
                    breed={formData.breed}
                    name={formData.name}
                    disabled={uploading}
                  />
                )}
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Transforma la foto de tu mascota en un avatar con estilo retro de los 90s o 2000s
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Ready */}
            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="relative">
                  {getDisplayImageUrl() ? (
                    <img
                      src={getDisplayImageUrl() || ''}
                      alt={formData.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-purple-200 mx-auto"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-5xl border-4 border-purple-200 mx-auto">
                      {getPetEmoji(formData.species)}
                    </div>
                  )}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-800" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡{formData.name} está listo! {getPetEmoji(formData.species)}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Tu mascota está lista para comenzar esta aventura contigo
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Regalo de bienvenida</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Recibirás 10 PetPoints para comenzar a cuidar a {formData.name}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                Anterior
              </Button>
              
              {currentStep < steps.length ? (
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  disabled={currentStep === 2 && !formData.name}
                >
                  Siguiente
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleCreatePet}
                  disabled={createPet.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {createPet.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <PartyPopper className="mr-2 w-4 h-4" />
                      ¡Crear Mascota!
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PetCreation;
