import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Track if we've already verified users to avoid duplicate checks
  // Use useRef to persist across renders
  const verifiedUsersRef = useRef<Set<string>>(new Set())
  const verificationInProgressRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('AuthContext: Getting initial session...')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('AuthContext: Initial session:', session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Auto-verify provider/shelter when email is confirmed
        // Only run on SIGNED_IN event and only once per user
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at && session?.user?.id) {
          const userId = session.user.id
          
          // Skip if we've already verified this user or verification is in progress
          if (verifiedUsersRef.current.has(userId) || verificationInProgressRef.current.has(userId)) {
            console.log('AuthContext: User already verified or verification in progress, skipping')
            return
          }

          // Mark as in progress
          verificationInProgressRef.current.add(userId)

          // Run verification in background without blocking
          setTimeout(async () => {
            try {
              // Check if user is a provider and verify them
              const { data: provider } = await supabase
                .from('providers')
                .select('id, is_verified')
                .eq('user_id', userId)
                .maybeSingle()

              if (provider && !provider.is_verified) {
                // Update provider to verified
                const { error: updateError } = await supabase
                  .from('providers')
                  .update({ is_verified: true })
                  .eq('id', provider.id)

                if (updateError) {
                  console.error('Error auto-verifying provider:', updateError)
                } else {
                  console.log('Provider auto-verified after email confirmation')
                  verifiedUsersRef.current.add(userId)
                }
              } else if (provider && provider.is_verified) {
                // Already verified, just mark it
                verifiedUsersRef.current.add(userId)
              }

              // Note: If shelters table has is_verified, add similar check here
            } catch (error) {
              console.error('Error in auto-verification check:', error)
              // Don't throw - this is a background operation
            } finally {
              // Remove from in-progress set
              verificationInProgressRef.current.delete(userId)
            }
          }, 500) // Small delay to not block the login process
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext: Attempting sign in with email:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('AuthContext: Sign in result:', { data, error })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    console.log('AuthContext: Attempting sign up with email:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?type=signup`,
        // Auto-confirm email in development (if enabled in Supabase settings)
        // Note: This requires Supabase project to have "Enable email confirmations" disabled
        // Or use the SQL trigger to auto-confirm emails
      }
    })
    console.log('AuthContext: Sign up result:', { data, error })
    if (error) throw error
    
    // If user was created but email is not confirmed, try to auto-confirm
    // This is a workaround for development - in production, users should confirm via email
    if (data?.user && !data.user.email_confirmed_at) {
      console.log('AuthContext: User created but email not confirmed, attempting auto-confirmation...')
      // Note: This will only work if email confirmation is disabled in Supabase settings
      // Or if the SQL trigger is set up to auto-confirm
    }
    
    return data || null // Return the signup data including the user
  }

  const signOut = async () => {
    localStorage.removeItem('user_role')
    localStorage.removeItem('is_new_user')

    const isSessionMissingError = (error: unknown): boolean => {
      if (!(error instanceof Error)) return false
      return (
        error.name === 'AuthSessionMissingError' ||
        error.message.toLowerCase().includes('session missing') ||
        error.message.toLowerCase().includes('auth session missing')
      )
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error && !isSessionMissingError(error)) {
          throw error
        }
      }
    } catch (error) {
      if (!isSessionMissingError(error)) {
        throw error
      }
    } finally {
      setSession(null)
      setUser(null)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
