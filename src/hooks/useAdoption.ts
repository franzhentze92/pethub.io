import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { copyPetImagesToAdoptionPet, getPrimaryPetImageUrl } from '@/utils/petImages'
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents'
import { sendAdoptionApplicationEmail } from '@/utils/sendAdoptionApplicationEmail'
import { resolveSpeciesFilter } from '@/utils/petLabels'

export type Shelter = Database['public']['Tables']['shelters']['Row']
export type ShelterInsert = Database['public']['Tables']['shelters']['Insert']
export type ShelterUpdate = Database['public']['Tables']['shelters']['Update']

export type AdoptionPet = Database['public']['Tables']['adoption_pets']['Row']
export type AdoptionPetInsert = Database['public']['Tables']['adoption_pets']['Insert']
export type AdoptionPetUpdate = Database['public']['Tables']['adoption_pets']['Update']

export type AdoptionApplication = Database['public']['Tables']['adoption_applications']['Row']
export type AdoptionApplicationInsert = Database['public']['Tables']['adoption_applications']['Insert']
export type AdoptionApplicationUpdate = Database['public']['Tables']['adoption_applications']['Update']

export type AdoptionFavorite = Database['public']['Tables']['adoption_favorites']['Row']
export type AdoptionSwipe = Database['public']['Tables']['adoption_swipes']['Row']

// Shelters
export const useShelters = () => {
  return useQuery({
    queryKey: ['shelters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shelters')
        .select(`
          *,
          shelter_images!left (
            id,
            image_url,
            is_primary,
            display_order
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      
      // Process the data to get the primary image or first image
      return data.map(shelter => {
        const images = shelter.shelter_images || []
        const primaryImage = images.find(img => img.is_primary) || images[0]
        
        return {
          ...shelter,
          primary_image_url: primaryImage?.image_url || shelter.image_url
        }
      })
    },
  })
}

export const useCreateShelter = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (shelter: ShelterInsert) => {
      const { data, error } = await supabase
        .from('shelters')
        .insert(shelter)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shelters'] }),
  })
}

export const useUpdateShelter = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: ShelterUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('shelters')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shelters'] }),
  })
}

// Adoption pets (with shelters join)
export interface AdoptionFilters {
  species?: string
  size?: string
  age?: string
  breed?: string
  gender?: string
  sex?: string
  color?: string
  house_trained?: string | boolean
  spayed_neutered?: string | boolean
  special_needs?: string | boolean
  adoption_fee_max?: string
  location?: string
  shelter?: string
  energy_level?: string
}

export const useAdoptionPets = (filters?: AdoptionFilters) => {
  return useQuery({
    queryKey: ['adoption_pets', filters],
    queryFn: async () => {
      let query = supabase
        .from('adoption_pets')
        .select('*, shelters(name, location, phone, description), pet_images(image_url, display_order)')
        .eq('status', 'available')
        .order('created_at', { ascending: false })

      if (filters?.species) {
        const speciesValue = resolveSpeciesFilter(filters.species) ?? filters.species
        query = query.eq('species', speciesValue)
      }
      
      if (filters?.size) {
        // Handle both Spanish and English size values
        const sizeMap: Record<string, string> = {
          'pequeño': 'Small',
          'mediano': 'Medium',
          'grande': 'Large'
        }
        const sizeValue = sizeMap[filters.size.toLowerCase()] || filters.size
        query = query.eq('size', sizeValue)
      }
      
      if (filters?.age) {
        // Age filtering based on ranges
        const ageValue = filters.age
        if (ageValue === 'cachorro') {
          query = query.lte('age', 1)
        } else if (ageValue === 'joven') {
          query = query.gte('age', 1).lte('age', 3)
        } else if (ageValue === 'adulto') {
          query = query.gte('age', 3).lte('age', 7)
        } else if (ageValue === 'senior') {
          query = query.gte('age', 7)
        }
      }
      
      if (filters?.breed) {
        query = query.ilike('breed', `%${filters.breed}%`)
      }
      
      if (filters?.gender || filters?.sex) {
        const genderValue = filters.gender || filters.sex
        const sexMap: Record<string, string> = {
          'macho': 'M',
          'hembra': 'F',
          'male': 'M',
          'female': 'F'
        }
        const sexValue = sexMap[genderValue?.toLowerCase() || ''] || genderValue
        if (sexValue) query = query.eq('sex', sexValue)
      }
      
      if (filters?.color) {
        query = query.ilike('color', `%${filters.color}%`)
      }
      
      if (filters?.house_trained !== undefined && filters?.house_trained !== '') {
        const value = filters.house_trained === 'true' || filters.house_trained === true
        query = query.eq('house_trained', value)
      }
      
      if (filters?.spayed_neutered !== undefined && filters?.spayed_neutered !== '') {
        const value = filters.spayed_neutered === 'true' || filters.spayed_neutered === true
        query = query.eq('spayed_neutered', value)
      }
      
      if (filters?.special_needs !== undefined && filters?.special_needs !== '') {
        const value = filters.special_needs === 'true' || filters.special_needs === true
        query = query.eq('special_needs', value)
      }
      
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }
      
      if (filters?.energy_level) {
        query = query.eq('energy_level', filters.energy_level)
      }

      const { data, error } = await query
      if (error) throw error
      
      let filteredData = data as Array<AdoptionPet & { shelters: { name: string; location?: string; phone?: string; description?: string } | null }>
      
      // Filter adoption_fee client-side since it's stored as string
      if (filters?.adoption_fee_max) {
        const maxFee = parseFloat(filters.adoption_fee_max)
        if (!isNaN(maxFee)) {
          filteredData = filteredData.filter(pet => {
            if (!pet.adoption_fee) return true // Include pets with no fee
            const fee = parseFloat(pet.adoption_fee)
            return !isNaN(fee) && fee <= maxFee
          })
        }
      }
      
      return filteredData
    },
  })
}

export const useCreateAdoptionPet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pet: AdoptionPetInsert) => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .insert(pet)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adoption_pets'] }),
  })
}

export const useUpdateAdoptionPet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: AdoptionPetUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adoption_pets'] }),
  })
}

export const useDeleteAdoptionPet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('adoption_pets')
        .delete()
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoption_pets'] })
      queryClient.invalidateQueries({ queryKey: ['my_adoption_listings'] })
    },
  })
}

function mapGenderToSex(gender?: string | null): string | null {
  if (!gender) return null
  const g = gender.toLowerCase()
  if (g === 'macho' || g === 'male' || g === 'm') return 'M'
  if (g === 'hembra' || g === 'female' || g === 'f') return 'F'
  return gender.length === 1 ? gender.toUpperCase() : null
}

export interface OfferPetForAdoptionInput {
  sourcePetId: string
  ownerId: string
  description: string
  location?: string | null
  adoptionFee?: string | null
  goodWithKids?: boolean
  goodWithDogs?: boolean
  goodWithCats?: boolean
  houseTrained?: boolean
  spayedNeutered?: boolean
}

export const useMyAdoptionListings = (ownerId?: string) => {
  return useQuery({
    queryKey: ['my_adoption_listings', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .select('*, pet_images(image_url, display_order)')
        .eq('owner_id', ownerId!)
        .is('shelter_id', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!ownerId,
  })
}

export const useOfferPetForAdoption = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: OfferPetForAdoptionInput) => {
      const { data: existing, error: existingError } = await supabase
        .from('adoption_pets')
        .select('id')
        .eq('pet_id', input.sourcePetId)
        .eq('status', 'available')
        .maybeSingle()

      if (existingError) throw existingError
      if (existing) {
        throw new Error('Esta mascota ya tiene una publicación activa en adopción')
      }

      const { data: sourcePet, error: petError } = await supabase
        .from('pets')
        .select('*, pet_images(image_url, display_order)')
        .eq('id', input.sourcePetId)
        .eq('owner_id', input.ownerId)
        .single()

      if (petError) throw petError
      if (!sourcePet) throw new Error('Mascota no encontrada')

      const { data: inserted, error: insertError } = await supabase
        .from('adoption_pets')
        .insert({
          owner_id: input.ownerId,
          shelter_id: null,
          pet_id: input.sourcePetId,
          name: sourcePet.name,
          species: sourcePet.species,
          breed: sourcePet.breed,
          sex: mapGenderToSex(sourcePet.gender),
          age: sourcePet.age,
          color: sourcePet.color,
          weight: sourcePet.weight,
          description: input.description,
          location: input.location || null,
          adoption_fee: input.adoptionFee || null,
          good_with_kids: input.goodWithKids ?? true,
          good_with_dogs: input.goodWithDogs ?? true,
          good_with_cats: input.goodWithCats ?? false,
          house_trained: input.houseTrained ?? null,
          spayed_neutered: input.spayedNeutered ?? (sourcePet.vaccinated ? true : null),
          image_url: getPrimaryPetImageUrl(sourcePet),
          status: 'available',
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      if (!inserted?.id) throw new Error('No se pudo crear la publicación')

      await copyPetImagesToAdoptionPet(input.sourcePetId, inserted.id)
      return inserted
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoption_pets'] })
      queryClient.invalidateQueries({ queryKey: ['my_adoption_listings'] })
    },
  })
}

export const useWithdrawAdoptionListing = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .update({ status: 'removed' })
        .eq('id', listingId)
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoption_pets'] })
      queryClient.invalidateQueries({ queryKey: ['my_adoption_listings'] })
    },
  })
}

export const useReactivateAdoptionListing = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .update({ status: 'available' })
        .eq('id', listingId)
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoption_pets'] })
      queryClient.invalidateQueries({ queryKey: ['my_adoption_listings'] })
    },
  })
}

// Favorites
export const useToggleFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ petId, userId, isFavorite }: { petId: string; userId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        const { error } = await supabase
          .from('adoption_favorites')
          .delete()
          .eq('pet_id', petId)
          .eq('user_id', userId)
        if (error) throw error
        return { petId, userId, isFavorite: false }
      }
      const { data, error } = await supabase
        .from('adoption_favorites')
        .insert({ pet_id: petId, user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adoption_favorites'] }),
  })
}

export const useMyFavorites = (userId?: string) => {
  return useQuery({
    queryKey: ['adoption_favorites', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adoption_favorites')
        .select('pet_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((r) => r.pet_id)
    },
    enabled: !!userId,
  })
}

// Applications
export const useApplyToPet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AdoptionApplicationInsert) => {
      // Check if application already exists
      const { data: existingApp, error: checkError } = await supabase
        .from('adoption_applications')
        .select('id')
        .eq('pet_id', payload.pet_id)
        .eq('applicant_id', payload.applicant_id)
        .maybeSingle()
      
      if (checkError && checkError.code !== 'PGRST116') throw checkError
      
      if (existingApp) {
        throw new Error('Ya has enviado una solicitud de adopción para esta mascota')
      }
      
      const { data, error } = await supabase
        .from('adoption_applications')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_applications'] })
      queryClient.invalidateQueries({ queryKey: ['has_applied_to_pet'] })
      queryClient.invalidateQueries({ queryKey: ['applications_for_my_pets'] })
      dispatchNotificationsUpdated()
    },
  })
}

export const useCancelAdoptionApplication = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ applicationId, applicantId }: { applicationId: string; applicantId: string }) => {
      const { data: application, error: fetchError } = await supabase
        .from('adoption_applications')
        .select('id, status, applicant_id')
        .eq('id', applicationId)
        .eq('applicant_id', applicantId)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!application) throw new Error('No se encontró la solicitud')
      if (!['pending', 'rejected'].includes(application.status)) {
        throw new Error('Solo puedes cancelar solicitudes pendientes o rechazadas')
      }

      const { error } = await supabase
        .from('adoption_applications')
        .delete()
        .eq('id', applicationId)
        .eq('applicant_id', applicantId)

      if (error) throw error
      return applicationId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_applications'] })
      queryClient.invalidateQueries({ queryKey: ['has_applied_to_pet'] })
      queryClient.invalidateQueries({ queryKey: ['applications_for_my_pets'] })
      dispatchNotificationsUpdated()
    },
  })
}

// Check if user has already applied to a pet
export const useHasAppliedToPet = (petId?: string, userId?: string) => {
  return useQuery({
    queryKey: ['has_applied_to_pet', petId, userId],
    queryFn: async () => {
      if (!petId || !userId) return false
      
      const { data, error } = await supabase
        .from('adoption_applications')
        .select('id')
        .eq('pet_id', petId)
        .eq('applicant_id', userId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      return !!data
    },
    enabled: !!petId && !!userId,
  })
}

export const useMyApplications = (userId?: string) => {
  return useQuery({
    queryKey: ['my_applications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adoption_applications')
        .select('*, adoption_pets(*, pet_images(image_url, display_order), shelters(name))')
        .eq('applicant_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error

      const ownerIds = [...new Set((data ?? []).map((app) => app.adoption_pets?.owner_id).filter(Boolean))]
      let ownersMap: Record<string, { full_name?: string | null; phone?: string | null; email?: string | null; address?: string | null; avatar_url?: string | null }> = {}

      if (ownerIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone, email, address, avatar_url')
          .in('user_id', ownerIds)

        if (ownersError) throw ownersError

        ownersMap = (owners ?? []).reduce(
          (acc, owner) => {
            acc[owner.user_id] = owner
            return acc
          },
          {} as Record<string, { full_name?: string | null; phone?: string | null; email?: string | null; address?: string | null; avatar_url?: string | null }>
        )
      }

      return (data ?? []).map((app) => {
        const ownerId = app.adoption_pets?.owner_id
        const owner = ownerId ? ownersMap[ownerId] : null
        return {
          ...app,
          listing_owner_name:
            owner?.full_name?.trim() ||
            owner?.email?.split('@')[0] ||
            (app.adoption_pets?.shelters?.name ? `Albergue ${app.adoption_pets.shelters.name}` : 'Dueño'),
          listing_owner_phone: owner?.phone || null,
          listing_owner_email: owner?.email || null,
          listing_owner_address: owner?.address || null,
          listing_owner_avatar_url: owner?.avatar_url || null,
          listing_owner_id: ownerId || null,
        }
      })
    },
    enabled: !!userId,
  })
}

export const useApplicationsForMyPets = (ownerId?: string) => {
  return useQuery({
    queryKey: ['applications_for_my_pets', ownerId],
    queryFn: async () => {
      const { data: myListings, error: listingsError } = await supabase
        .from('adoption_pets')
        .select('id')
        .eq('owner_id', ownerId!)
        .is('shelter_id', null)

      if (listingsError) throw listingsError

      const petIds = myListings?.map((p) => p.id) || []
      if (petIds.length === 0) return []

      const { data, error } = await supabase
        .from('adoption_applications')
        .select('*, adoption_pets(*, pet_images(image_url, display_order))')
        .in('pet_id', petIds)
        .order('created_at', { ascending: false })
      if (error) throw error

      const applicantIds = [...new Set((data ?? []).map((app) => app.applicant_id))]
      type ApplicantProfile = {
        full_name?: string | null
        phone?: string | null
        email?: string | null
        address?: string | null
        avatar_url?: string | null
      }
      let profilesMap: Record<string, ApplicantProfile> = {}

      if (applicantIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone, email, address, avatar_url')
          .in('user_id', applicantIds)

        if (profilesError) throw profilesError

        profilesMap = (profiles ?? []).reduce(
          (acc, profile) => {
            acc[profile.user_id] = profile
            return acc
          },
          {} as Record<string, ApplicantProfile>
        )
      }

      let applicantPetsMap: Record<string, unknown[]> = {}
      if (applicantIds.length > 0) {
        const { data: applicantPets, error: petsError } = await supabase
          .from('pets')
          .select('*, pet_images(image_url, display_order)')
          .in('owner_id', applicantIds)
          .order('created_at', { ascending: false })

        if (petsError) throw petsError

        applicantPetsMap = (applicantPets ?? []).reduce(
          (acc, pet) => {
            if (!acc[pet.owner_id]) acc[pet.owner_id] = []
            acc[pet.owner_id].push(pet)
            return acc
          },
          {} as Record<string, unknown[]>
        )
      }

      return (data ?? []).map((app) => {
        const profile = profilesMap[app.applicant_id]
        const displayName =
          profile?.full_name?.trim() ||
          profile?.email?.split('@')[0] ||
          'Interesado en adoptar'

        return {
          ...app,
          applicant_name: displayName,
          applicant_phone: profile?.phone || null,
          applicant_email: profile?.email || null,
          applicant_address: profile?.address || null,
          applicant_avatar_url: profile?.avatar_url || null,
          applicant_pets: applicantPetsMap[app.applicant_id] || [],
        }
      })
    },
    enabled: !!ownerId,
  })
}

// Swipes
export const useSwipePet = () => {
  return useMutation({
    mutationFn: async ({ petId, userId, direction }: { petId: string; userId: string; direction: 'left' | 'right' }) => {
      const { data, error } = await supabase
        .from('adoption_swipes')
        .insert({ pet_id: petId, user_id: userId, direction })
        .select()
        .single()
      if (error) throw error
      return data
    },
  })
}

// Shelter favorites
export const useToggleShelterFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ shelterId, userId, isFavorite }: { shelterId: string; userId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        const { error } = await supabase
          .from('shelter_favorites')
          .delete()
          .eq('shelter_id', shelterId)
          .eq('user_id', userId)
        if (error) throw error
        return { shelterId, userId, isFavorite: false }
      }
      const { data, error } = await supabase
        .from('shelter_favorites')
        .insert({ shelter_id: shelterId, user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shelter_favorites'] }),
  })
}

export const useMyShelterFavorites = (userId?: string) => {
  return useQuery({
    queryKey: ['shelter_favorites', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shelter_favorites')
        .select('shelter_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((r) => r.shelter_id)
    },
    enabled: !!userId,
  })
}

// Get single shelter by owner ID (user ID)
export const useShelter = (userId?: string) => {
  return useQuery({
    queryKey: ['shelter', userId],
    queryFn: async () => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .from('shelters')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle()
      
      // PGRST116 means no rows found, which is okay - just return null
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!userId,
  })
}

// Get single shelter by shelter ID
export const useShelterById = (shelterId?: string) => {
  return useQuery({
    queryKey: ['shelter-by-id', shelterId],
    queryFn: async () => {
      if (!shelterId) return null
      
      const { data, error } = await supabase
        .from('shelters')
        .select('*')
        .eq('id', shelterId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!shelterId,
  })
}

// Lost Pets
export const useLostPets = () => {
  return useQuery({
    queryKey: ['lost_pets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lost_pets')
        .select(`
          *,
          pet_images(image_url, display_order),
          source_pet:pets!pet_id(*, pet_images(image_url, display_order))
        `)
        .eq('status', 'lost')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export const useCreateLostPet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lostPet: any) => {
      const { data, error } = await supabase
        .from('lost_pets')
        .insert(lostPet)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lost_pets'] }),
  })
}

// Get adoption pets by shelter owner (user ID)
export const useAdoptionPetsByShelter = (userId?: string) => {
  return useQuery({
    queryKey: ['adoption_pets_by_shelter', userId],
    queryFn: async () => {
      if (!userId) return []
      
      // First get the shelter ID for this user
      const { data: shelter, error: shelterError } = await supabase
        .from('shelters')
        .select('id')
        .eq('owner_id', userId)
        .single()
      
      if (shelterError || !shelter) return []
      
      // Then get pets for this shelter
      const { data, error } = await supabase
        .from('adoption_pets')
        .select('*')
        .eq('shelter_id', shelter.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// Hook to fetch shelter images by owner (user ID)
export const useShelterImages = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['shelter-images', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // First get the shelter ID for this user
      const { data: shelter, error: shelterError } = await supabase
        .from('shelters')
        .select('id')
        .eq('owner_id', userId)
        .single()
      
      if (shelterError || !shelter) return [];
      
      const { data, error } = await supabase
        .from('shelter_images')
        .select('*')
        .eq('shelter_id', shelter.id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

// Hook to fetch shelter videos by owner (user ID)
export const useShelterVideos = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['shelter-videos', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // First get the shelter ID for this user
      const { data: shelter, error: shelterError } = await supabase
        .from('shelters')
        .select('id')
        .eq('owner_id', userId)
        .single()
      
      if (shelterError || !shelter) return [];
      
      const { data, error } = await supabase
        .from('shelter_videos')
        .select('*')
        .eq('shelter_id', shelter.id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

// Hook to get adoption applications for a specific shelter owner (user ID)
export const useShelterAdoptionApplications = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['shelter-adoption-applications', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // First get the shelter ID for this user
      const { data: shelter, error: shelterError } = await supabase
        .from('shelters')
        .select('id')
        .eq('owner_id', userId)
        .single()
      
      if (shelterError || !shelter) return [];
      
      // Then get all pets from this shelter
      const { data: shelterPets, error: petsError } = await supabase
        .from('adoption_pets')
        .select('id, name')
        .eq('shelter_id', shelter.id);
      
      if (petsError) throw petsError;
      if (!shelterPets || shelterPets.length === 0) return [];
      
      const petIds = shelterPets.map(pet => pet.id);
      
      // Then get all applications for these pets
      const { data, error } = await supabase
        .from('adoption_applications')
        .select(`
          *,
          adoption_pets!inner(name)
        `)
        .in('pet_id', petIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get user profiles for all applicants
      const applicantIds = data?.map(app => app.applicant_id) || [];
      let userProfiles = {};
      
      if (applicantIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', applicantIds);
        
        // Create a map for quick lookup
        userProfiles = profiles?.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {} as Record<string, any>) || {};
      }
      
      // Transform the data to include pet and applicant names
      return data?.map(app => ({
        ...app,
        pet_name: app.adoption_pets?.name,
        applicant_name: userProfiles[app.applicant_id]?.full_name || 'Usuario Anónimo',
        applicant_email: userProfiles[app.applicant_id]?.email || '',
        applicant_phone: userProfiles[app.applicant_id]?.phone || ''
      })) || [];
    },
    enabled: !!userId,
  });
};

// Hook to update adoption application status
export const useUpdateAdoptionApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      status, 
    }: { 
      applicationId: string; 
      status: 'approved' | 'rejected'; 
      shelterId?: string;
    }) => {
      const { data: existing, error: fetchError } = await supabase
        .from('adoption_applications')
        .select('status')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;

      const previousStatus = existing?.status ?? null;

      const { data, error } = await supabase
        .from('adoption_applications')
        .update({ status })
        .eq('id', applicationId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, previousStatus };
    },
    onMutate: async ({ applicationId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['shelter-adoption-applications'] });
      
      // Snapshot the previous value
      const previousApplications = queryClient.getQueriesData({ queryKey: ['shelter-adoption-applications'] });
      
      // Optimistically update the application status
      queryClient.setQueriesData({ queryKey: ['shelter-adoption-applications'] }, (old: any) => {
        if (!old) return old;
        return old.map((app: any) => 
          app.id === applicationId 
            ? { ...app, status }
            : app
        );
      });
      
      return { previousApplications };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousApplications) {
        context.previousApplications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data) => {
      void sendAdoptionApplicationEmail(
        (name, options) => supabase.functions.invoke(name, options),
        data.id,
        data.status,
        data.previousStatus,
      );
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ 
        queryKey: ['shelter-adoption-applications'] 
      });
      
      // Also invalidate the general adoption applications query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-applications'] 
      });
      
      // Invalidate my applications queries
      queryClient.invalidateQueries({ 
        queryKey: ['my_applications'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['applications_for_my_pets'] 
      });
      dispatchNotificationsUpdated();
    },
  });
};

// Hook to add a new pet to a shelter
export const useAddShelterPet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (petData: {
      name: string;
      species?: string;
      breed?: string;
      age?: number;
      size?: string;
      sex?: string;
      color?: string;
      weight?: number;
      description?: string;
      image_url?: string;
      good_with_kids?: boolean;
      good_with_dogs?: boolean;
      good_with_cats?: boolean;
      house_trained?: boolean;
      spayed_neutered?: boolean;
      special_needs?: boolean;
      special_needs_description?: string;
      medical_notes?: string;
      adoption_fee?: string;
      location?: string;
      status?: string;
      shelter_id: string;
      owner_id: string;
    }) => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .insert(petData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the shelter pets query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-pets-by-shelter', data.owner_id] 
      });
      
      // Also invalidate the general adoption pets query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-pets'] 
      });
    },
  });
};

// Hook to update a shelter pet
export const useUpdateShelterPet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      petId, 
      petData 
    }: { 
      petId: string; 
      petData: Partial<Database['public']['Tables']['adoption_pets']['Update']>;
    }) => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .update(petData)
        .eq('id', petId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the shelter pets query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-pets-by-shelter', data.owner_id] 
      });
      
      // Also invalidate the general adoption pets query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-pets'] 
      });
    },
  });
};

// Hook to delete a shelter pet
export const useDeleteShelterPet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      petId, 
      shelterId 
    }: { 
      petId: string; 
      shelterId: string;
    }) => {
      const { error } = await supabase
        .from('adoption_pets')
        .delete()
        .eq('id', petId);
      
      if (error) throw error;
      return { petId, shelterId };
    },
    onSuccess: (data) => {
      // Invalidate the shelter pets query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-pets-by-shelter', data.shelterId] 
      });
      
      // Also invalidate the general adoption pets query
      queryClient.invalidateQueries({ 
        queryKey: ['adoption-pets'] 
      });
    },
  });
};
