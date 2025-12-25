'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Chrome, AlertCircle, Mail, Lock } from 'lucide-react'

// Portfolio images - update these paths to your actual images
// You can place images in /public/portfolio/ folder or use the assets folder
const portfolio1 = 'https://images.unsplash.com/photo-1707157281599-d155d1da5b4c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
const portfolio2 = 'https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?q=80&w=2073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
const portfolio3 = 'https://plus.unsplash.com/premium_photo-1676637656166-cb7b3a43b81a?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
const portfolio4 = 'https://plus.unsplash.com/premium_vector-1682270275978-3ac5bae3ea48?q=80&w=3298&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
const portfolio5 = 'https://contrend.com/wp-content/uploads/2021/06/aiml.jpg'
const portfolio6 = 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=1639&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
const portfolio7 = 'https://wp.sfdcdigital.com/en-us/wp-content/uploads/sites/4/2025/03/marquee-agentforce-ai-chatbot.png?w=1024'
const portfolio8 = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
const portfolio9 = 'https://www.icertis.com/globalassets/1.-sections/contracting-basics/conversational-ai/conversational-ai-learn-article-header-inset.jpeg'

const portfolioItems = [
  { id: 1, image: portfolio1, alt: 'Turntable product photography' },
  { id: 2, image: portfolio2, alt: 'Fashion portrait with headphones' },
  { id: 3, image: portfolio3, alt: 'Skincare tube product' },
  { id: 4, image: portfolio4, alt: 'Cosmetic dropper bottle' },
  { id: 5, image: portfolio5, alt: 'Orange citrus still life' },
  { id: 6, image: portfolio6, alt: 'Luxury skincare collection' },
  { id: 7, image: portfolio7, alt: 'Coffee bag packaging' },
  { id: 8, image: portfolio8, alt: 'Black glove holding bottle' },
  { id: 9, image: portfolio9, alt: 'Black bag with plants' },
]

function CaseStudyCard({ image, alt, className = '', style, isDarkTheme }) {
  return (
    <div 
      className={`relative overflow-hidden rounded-lg bg-gray-300 cursor-pointer shadow-lg group ${className}`} 
      style={style}
    >
      <img
        src={image}
        alt={alt}
        className="w-full h-full object-cover rounded-lg"
        style={{ filter: isDarkTheme ? 'grayscale(100%)' : 'none' }}
      />
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const isDarkTheme = theme === 'dark'

  // Split items into 3 columns for masonry layout
  const column1 = portfolioItems.filter((_, i) => i % 3 === 0)
  const column2 = portfolioItems.filter((_, i) => i % 3 === 1)
  const column3 = portfolioItems.filter((_, i) => i % 3 === 2)

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      setErrorMessage(decodeURIComponent(error))
      // Clear error from URL
      router.replace('/onboarding', { scroll: false })
    }
  }, [searchParams, router])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to sign in. Please try again.')
        setIsLoading(false)
        return
      }

      // Login successful - redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      setErrorMessage(error.message || 'Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    setIsLoading(true)
    try {
      // Google OAuth configuration
      // Client ID from the provided credentials file
      // To use environment variable, set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '812161662161-1dfoaaa4qa9lc8489hr23s5esv7cgook.apps.googleusercontent.com'
      
      // Construct redirect URI - must match exactly what's in Google Cloud Console
      // For development: http://localhost:3000/api/auth/callback
      // For production: https://yourdomain.com/api/auth/callback
      const redirectUri = `${window.location.origin}/api/auth/callback`
      
      // Log the redirect URI for debugging (remove in production)
      console.log('OAuth Redirect URI:', redirectUri)
      
      const scope = 'openid email profile'
      const responseType = 'code'
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('Google OAuth error:', error)
      setErrorMessage(`Failed to initiate Google authentication: ${error.message || 'Please check your OAuth configuration'}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-background via-background to-muted relative">
      {/* Logo and Brand Name - Top Left Corner */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10">
        <img 
          src="https://res.cloudinary.com/difauucm4/image/upload/v1766603112/student-management/logos/aiivy45l4cirjv5cxbkn.png" 
          alt="Platform Logo" 
          className="h-10 w-10 object-contain"
        />
        <span className="text-2xl font-bold">evaliq</span>
      </div>
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1 text-center">
            
              <CardDescription className="text-base">
                Sign in to your account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Email and Password Form - Commented Out */}
              {/* <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div> */}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                size="lg"
              >
                <Chrome className="mr-2 h-5 w-5" />
                {isLoading ? 'Connecting...' : 'Sign in with Google'}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Use your organization email to sign in. The first user from your domain will become the administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Image Grid (Masonry Layout) */}
      <div className="flex-1 p-2 lg:p-4 flex items-center justify-center order-1 lg:order-2">
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Column 1 - Standard height items */}
            <div className="flex flex-col gap-2">
              {column1.map((item, index) => (
                <CaseStudyCard
                  key={item.id}
                  image={item.image}
                  alt={item.alt}
                  className="aspect-[4/3]"
                  style={{ animationDelay: `${index * 150}ms` }}
                  isDarkTheme={isDarkTheme}
                />
              ))}
            </div>

            {/* Column 2 - Taller items (featured) */}
            <div className="flex flex-col gap-2">
              {column2.map((item, index) => (
                <CaseStudyCard
                  key={item.id}
                  image={item.image}
                  alt={item.alt}
                  className="aspect-[4/4]"
                  style={{ animationDelay: `${(index * 150) + 100}ms` }}
                  isDarkTheme={isDarkTheme}
                />
              ))}
            </div>

            {/* Column 3 - Standard height items */}
            <div className="flex flex-col gap-2">
              {column3.map((item, index) => (
                <CaseStudyCard
                  key={item.id}
                  image={item.image}
                  alt={item.alt}
                  className="aspect-[4/3]"
                  style={{ animationDelay: `${(index * 150) + 200}ms` }}
                  isDarkTheme={isDarkTheme}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
