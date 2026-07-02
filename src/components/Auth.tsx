import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PageLoader from '@/components/PageLoader'

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  
  // Separate state for login and signup
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect based on user role if user is already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const checkRoleAndRedirect = async () => {
        // First check localStorage
        let role = localStorage.getItem('user_role') as 'client' | 'provider' | 'shelter' | 'delivery' | null
        console.log('Auth: User is authenticated, checking role from localStorage:', role)
        
        // If no role in localStorage, try to get it from the database
        if (!role) {
          console.log('Auth: No role in localStorage, checking database...')
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          if (profile?.role) {
            role = profile.role
            localStorage.setItem('user_role', role)
            console.log('Auth: Role found in database:', role)
          }
        }
        
        // Check if user is admin
        if (user.email === 'admin@pethubgt.com') {
          console.log('Auth: Admin user detected, redirecting to admin dashboard')
          localStorage.setItem('user_role', 'admin')
          navigate('/admin-dashboard')
          return
        }
        
        // Check if user is delivery
        if (user.email === 'delivery@pehtubgt.com') {
          console.log('Auth: Delivery user detected, redirecting to delivery orders')
          localStorage.setItem('user_role', 'delivery')
          navigate('/delivery/orders')
          return
        }
        
        // Validate role - only accept valid roles
        const validRoles = ['client', 'provider', 'shelter', 'delivery']
        const isValidRole = role && validRoles.includes(role)
        
        if (isValidRole) {
          // User already has a valid role, redirect to appropriate dashboard
          console.log('Auth: Valid role found, redirecting to dashboard:', role)
          switch (role) {
            case 'client':
              navigate('/dashboard')
              break
            case 'provider':
              navigate('/provider')
              break
            case 'shelter':
              navigate('/shelter-dashboard')
              break
            case 'delivery':
              navigate('/delivery/orders')
              break
          }
        } else {
          // No valid role found, clear any invalid value and redirect to role selection
          if (role) {
            console.log('Auth: Invalid role found, clearing:', role)
            localStorage.removeItem('user_role')
          }
          console.log('Auth: No valid role found, redirecting to role selection')
          navigate('/role')
        }
      }
      
      checkRoleAndRedirect()
    }
  }, [user, authLoading, navigate])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('Attempting to sign in with:', loginEmail)

    try {
      console.log('Calling signIn function...')
      await signIn(loginEmail, loginPassword)
      console.log('Sign in successful!')
      // Role will be selected on the role selection page
    } catch (err) {
      console.error('Authentication error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('Attempting to sign up with:', signupEmail)

    try {
      console.log('Calling signUp function...')
      await signUp(signupEmail, signupPassword)
      console.log('Sign up successful!')
      // Role will be selected on the role selection page
    } catch (err) {
      console.error('Authentication error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Reset form when switching tabs
  const handleTabChange = (value: string) => {
    setIsLogin(value === 'login')
    setError('')
  }

  // Show loading while checking authentication
  if (authLoading) {
    return <PageLoader message="Verificando autenticación…" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🐾</span>
          </div>
          <CardTitle className="text-2xl font-bold">PetHub</CardTitle>
          <CardDescription>
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea una nueva cuenta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth