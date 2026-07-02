import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for Settings + Adoption functionality
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone: string | null
          address: string | null
          avatar_url: string | null
          role: 'client' | 'provider' | 'shelter' | 'admin' | 'delivery' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone?: string | null
          address?: string | null
          avatar_url?: string | null
          role?: 'client' | 'provider' | 'shelter' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone?: string | null
          address?: string | null
          avatar_url?: string | null
          role?: 'client' | 'provider' | 'shelter' | null
          created_at?: string
          updated_at?: string
        }
      }
      pets: {
        Row: {
          id: string
          name: string
          species: string
          breed: string | null
          age: number | null
          weight: number | null
          microchip: string | null
          available_for_breeding: boolean
          image_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          species?: string
          breed?: string | null
          age?: number | null
          weight?: number | null
          microchip?: string | null
          available_for_breeding?: boolean
          image_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          species?: string
          breed?: string | null
          age?: number | null
          weight?: number | null
          microchip?: string | null
          available_for_breeding?: boolean
          image_url?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      pet_images: {
        Row: {
          id: string
          pet_id: string | null
          adoption_pet_id: string | null
          lost_pet_id: string | null
          image_url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          pet_id?: string | null
          adoption_pet_id?: string | null
          lost_pet_id?: string | null
          image_url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string | null
          adoption_pet_id?: string | null
          lost_pet_id?: string | null
          image_url?: string
          display_order?: number
          created_at?: string
        }
      }
      shelters: {
        Row: {
          id: string
          name: string
          description: string | null
          location: string | null
          phone: string | null
          email: string | null
          image_url: string | null
          owner_id: string | null
          created_at: string
          updated_at: string
          mission_statement: string | null
          years_experience: number | null
          total_rescued_pets: number | null
          total_successful_adoptions: number | null
          total_volunteers: number | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          location?: string | null
          phone?: string | null
          email?: string | null
          image_url?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          mission_statement?: string | null
          years_experience?: number | null
          total_rescued_pets?: number | null
          total_successful_adoptions?: number | null
          total_volunteers?: number | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          location?: string | null
          phone?: string | null
          email?: string | null
          image_url?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          mission_statement?: string | null
          years_experience?: number | null
          total_rescued_pets?: number | null
          total_successful_adoptions?: number | null
          total_volunteers?: number | null
        }
      }
      shelter_images: {
        Row: {
          id: string
          shelter_id: string
          image_url: string
          alt_text: string | null
          is_primary: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          shelter_id: string
          image_url: string
          alt_text?: string | null
          is_primary?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          shelter_id?: string
          image_url?: string
          alt_text?: string | null
          is_primary?: boolean
          display_order?: number
          created_at?: string
        }
      }
      shelter_videos: {
        Row: {
          id: string
          shelter_id: string
          title: string
          youtube_url: string
          thumbnail_url: string | null
          description: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          shelter_id: string
          title: string
          youtube_url: string
          thumbnail_url?: string | null
          description?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          shelter_id?: string
          title?: string
          youtube_url?: string
          thumbnail_url?: string | null
          description?: string | null
          display_order?: number
          created_at?: string
        }
      }
      adoption_pets: {
        Row: {
          id: string
          owner_id: string
          shelter_id: string | null
          pet_id: string | null
          name: string
          species: string
          breed: string | null
          sex: string | null
          age: number | null
          size: string | null
          energy_level: string | null
          good_with_kids: boolean | null
          good_with_dogs: boolean | null
          good_with_cats: boolean | null
          description: string | null
          image_url: string | null
          status: string
          color: string | null
          weight: number | null
          house_trained: boolean | null
          spayed_neutered: boolean | null
          special_needs: boolean | null
          special_needs_description: string | null
          medical_notes: string | null
          adoption_fee: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          shelter_id?: string | null
          pet_id?: string | null
          name: string
          species?: string
          breed?: string | null
          sex?: string | null
          age?: number | null
          size?: string | null
          energy_level?: string | null
          good_with_kids?: boolean | null
          good_with_dogs?: boolean | null
          good_with_cats?: boolean | null
          description?: string | null
          image_url?: string | null
          status?: string
          color?: string | null
          weight?: number | null
          house_trained?: boolean | null
          spayed_neutered?: boolean | null
          special_needs?: boolean | null
          special_needs_description?: string | null
          medical_notes?: string | null
          adoption_fee?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          shelter_id?: string | null
          pet_id?: string | null
          name?: string
          species?: string
          breed?: string | null
          sex?: string | null
          age?: number | null
          size?: string | null
          energy_level?: string | null
          good_with_kids?: boolean | null
          good_with_dogs?: boolean | null
          good_with_cats?: boolean | null
          description?: string | null
          image_url?: string | null
          status?: string
          color?: string | null
          weight?: number | null
          house_trained?: boolean | null
          spayed_neutered?: boolean | null
          special_needs?: boolean | null
          special_needs_description?: string | null
          medical_notes?: string | null
          adoption_fee?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      adoption_applications: {
        Row: {
          id: string
          pet_id: string
          applicant_id: string
          shelter_id?: string | null
          message: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          applicant_id: string
          shelter_id?: string | null
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          applicant_id?: string
          shelter_id?: string | null
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      adoption_favorites: {
        Row: {
          id: string
          pet_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          user_id?: string
          created_at?: string
        }
      }
      adoption_swipes: {
        Row: {
          id: string
          pet_id: string
          user_id: string
          direction: string
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          user_id: string
          direction: string
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          user_id?: string
          direction?: string
          created_at?: string
        }
      }
      shelter_favorites: {
        Row: {
          id: string
          shelter_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          shelter_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          shelter_id?: string
          user_id?: string
          created_at?: string
        }
      }
      veterinary_sessions: {
        Row: {
          id: string
          pet_id: string
          owner_id: string
          appointment_type: string
          date: string
          veterinarian_name: string
          veterinary_clinic: string | null
          diagnosis: string
          treatment: string | null
          notes: string | null
          prescription: string | null
          follow_up_date: string | null
          follow_up_completed_at: string | null
          cost: number | null
          pdf_url: string | null
          invoice_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          owner_id: string
          appointment_type: string
          date: string
          veterinarian_name: string
          veterinary_clinic?: string | null
          diagnosis?: string
          treatment?: string | null
          notes?: string | null
          prescription?: string | null
          follow_up_date?: string | null
          follow_up_completed_at?: string | null
          cost?: number | null
          pdf_url?: string | null
          invoice_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          owner_id?: string
          appointment_type?: string
          date?: string
          veterinarian_name?: string
          veterinary_clinic?: string | null
          diagnosis?: string
          treatment?: string | null
          notes?: string | null
          prescription?: string | null
          follow_up_date?: string | null
          follow_up_completed_at?: string | null
          cost?: number | null
          pdf_url?: string | null
          invoice_url?: string | null
          created_at?: string
        }
      }
      vet_document_extractions: {
        Row: {
          id: string
          session_id: string
          owner_id: string
          document_url: string
          document_type: string
          raw_text: string | null
          structured_data: Record<string, unknown> | null
          summary: string | null
          parse_status: string
          parse_error: string | null
          parsed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          owner_id: string
          document_url: string
          document_type?: string
          raw_text?: string | null
          structured_data?: Record<string, unknown> | null
          summary?: string | null
          parse_status?: string
          parse_error?: string | null
          parsed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          owner_id?: string
          document_url?: string
          document_type?: string
          raw_text?: string | null
          structured_data?: Record<string, unknown> | null
          summary?: string | null
          parse_status?: string
          parse_error?: string | null
          parsed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      health_records: {
        Row: {
          id: string
          pet_id: string
          visit_type: string
          date: string
          veterinarian: string | null
          clinic: string | null
          diagnosis: string | null
          treatment: string | null
          medications: string | null
          notes: string | null
          cost: number | null
          follow_up_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          visit_type: string
          date: string
          veterinarian?: string | null
          clinic?: string | null
          diagnosis?: string | null
          treatment?: string | null
          medications?: string | null
          notes?: string | null
          cost?: number | null
          follow_up_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          visit_type?: string
          date?: string
          veterinarian?: string | null
          clinic?: string | null
          diagnosis?: string | null
          treatment?: string | null
          medications?: string | null
          notes?: string | null
          cost?: number | null
          follow_up_date?: string | null
          created_at?: string
        }
      }
      vaccine_catalog: {
        Row: {
          slug: string
          name: string
          species: string[]
          interval_months: number
          description: string | null
          is_core: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          slug: string
          name: string
          species: string[]
          interval_months?: number
          description?: string | null
          is_core?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          slug?: string
          name?: string
          species?: string[]
          interval_months?: number
          description?: string | null
          is_core?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      pet_vaccinations: {
        Row: {
          id: string
          pet_id: string
          owner_id: string
          vaccine_slug: string | null
          vaccine_name: string
          administered_at: string
          next_due_date: string | null
          batch_number: string | null
          veterinarian_name: string | null
          veterinary_clinic: string | null
          session_id: string | null
          notes: string | null
          reminder_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          owner_id: string
          vaccine_slug?: string | null
          vaccine_name: string
          administered_at: string
          next_due_date?: string | null
          batch_number?: string | null
          veterinarian_name?: string | null
          veterinary_clinic?: string | null
          session_id?: string | null
          notes?: string | null
          reminder_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          owner_id?: string
          vaccine_slug?: string | null
          vaccine_name?: string
          administered_at?: string
          next_due_date?: string | null
          batch_number?: string | null
          veterinarian_name?: string | null
          veterinary_clinic?: string | null
          session_id?: string | null
          notes?: string | null
          reminder_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pet_reminders: {
        Row: {
          id: string
          pet_id: string
          owner_id: string | null
          reminder_type: string
          title: string | null
          description: string | null
          due_date: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          frequency: string
          is_active: boolean
          is_completed: boolean
          priority: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          owner_id?: string | null
          reminder_type: string
          title?: string | null
          description?: string | null
          due_date?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          frequency?: string
          is_active?: boolean
          is_completed?: boolean
          priority?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          owner_id?: string | null
          reminder_type?: string
          title?: string | null
          description?: string | null
          due_date?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          frequency?: string
          is_active?: boolean
          is_completed?: boolean
          priority?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      user_notification_preferences: {
        Row: {
          user_id: string
          notify_feeding: boolean
          notify_exercise: boolean
          notify_breeding: boolean
          notify_adoption: boolean
          notify_lost_pets: boolean
          notify_orders: boolean
          notify_vet: boolean
          notify_account: boolean
          push_feeding: boolean
          push_exercise: boolean
          push_orders: boolean
          push_breeding: boolean
          push_adoption: boolean
          push_lost_pets: boolean
          push_vet: boolean
          dismissed_account_prompts: string[]
          read_adoption_notifications: string[]
          read_breeding_notifications: string[]
          read_lost_pet_notifications: string[]
          read_order_notifications: string[]
          read_exercise_notifications: string[]
          read_vet_notifications: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          notify_feeding?: boolean
          notify_exercise?: boolean
          notify_breeding?: boolean
          notify_adoption?: boolean
          notify_lost_pets?: boolean
          notify_orders?: boolean
          notify_vet?: boolean
          notify_account?: boolean
          push_feeding?: boolean
          push_exercise?: boolean
          push_orders?: boolean
          push_breeding?: boolean
          push_adoption?: boolean
          push_lost_pets?: boolean
          push_vet?: boolean
          dismissed_account_prompts?: string[]
          read_adoption_notifications?: string[]
          read_breeding_notifications?: string[]
          read_lost_pet_notifications?: string[]
          read_order_notifications?: string[]
          read_exercise_notifications?: string[]
          read_vet_notifications?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          notify_feeding?: boolean
          notify_exercise?: boolean
          notify_breeding?: boolean
          notify_adoption?: boolean
          notify_lost_pets?: boolean
          notify_orders?: boolean
          notify_vet?: boolean
          notify_account?: boolean
          push_feeding?: boolean
          push_exercise?: boolean
          push_orders?: boolean
          push_breeding?: boolean
          push_adoption?: boolean
          push_lost_pets?: boolean
          push_vet?: boolean
          dismissed_account_prompts?: string[]
          read_adoption_notifications?: string[]
          read_breeding_notifications?: string[]
          read_lost_pet_notifications?: string[]
          read_order_notifications?: string[]
          read_exercise_notifications?: string[]
          read_vet_notifications?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
