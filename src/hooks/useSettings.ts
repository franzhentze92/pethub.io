import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

type Pet = Database['public']['Tables']['pets']['Row']
type PetInsert = Database['public']['Tables']['pets']['Insert']
type PetUpdate = Database['public']['Tables']['pets']['Update']

// User Profile hooks
export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      console.log('Fetching user profile for:', userId)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        // If no profile exists, try to create one with data from localStorage if available
        if (error.code === 'PGRST116') {
          console.log('No profile found, checking for pending registration data...')
          
          // Try to get pending registration data from localStorage
          const pendingDataStr = localStorage.getItem('pending_profile_data');
          const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : null;
          const storedRole = localStorage.getItem('user_role');
          
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: userId!,
              full_name: pendingData?.full_name || null,
              phone: pendingData?.phone || null,
              address: null,
              role: pendingData?.role || storedRole || null,
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating user profile:', createError)
            throw createError
          }
          
          // Clear pending data after successful creation
          if (pendingDataStr) {
            localStorage.removeItem('pending_profile_data');
          }
          
          return newProfile
        }
        throw error
      }
      console.log('User profile fetched:', data)
      return data
    },
    enabled: !!userId,
  })
}

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...profile }: UserProfileUpdate & { id: string }) => {
      console.log('Updating user profile:', { id, ...profile })
      const { data, error } = await supabase
        .from('user_profiles')
        .update(profile)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        throw error
      }
      console.log('User profile updated:', data)
      return data
    },
    onSuccess: (data) => {
      console.log('Invalidating queries for user profile:', data.user_id)
      queryClient.invalidateQueries({ queryKey: ['userProfile', data.user_id] })
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    },
  })
}

// Pets hooks
export const usePets = (ownerId?: string) => {
  return useQuery({
    queryKey: ['pets', ownerId],
    queryFn: async () => {
      console.log('Fetching pets for owner:', ownerId)
      const { data, error } = await supabase
        .from('pets')
        .select('*, pet_images(image_url, display_order)')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pets:', error)
        throw error
      }
      console.log('Pets fetched:', data)
      return data
    },
    enabled: !!ownerId,
  })
}

export const usePet = (petId: string) => {
  return useQuery({
    queryKey: ['pet', petId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!petId,
  })
}

export const useCreatePet = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pet: PetInsert) => {
      console.log('Creating pet:', pet)
      const { data, error } = await supabase
        .from('pets')
        .insert(pet)
        .select()
        .single()

      if (error) {
        console.error('Error creating pet:', error)
        throw error
      }
      console.log('Pet created:', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pets', data.owner_id] })
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    },
  })
}

export const useUpdatePet = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...pet }: PetUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('pets')
        .update(pet)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pets', data.owner_id] })
      queryClient.invalidateQueries({ queryKey: ['pet', data.id] })
    },
  })
}

export const useDeletePet = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (petId: string) => {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)

      if (error) throw error
      return petId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
    },
  })
}
