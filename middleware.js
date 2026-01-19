import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Handle Chrome DevTools requests to prevent 404 errors
  if (pathname.includes('.well-known/appspecific')) {
    return NextResponse.json({}, { status: 200 })
  }

  // Define paths that require authentication/setup
  // We primarily want to protect /dashboard and ensure setup is complete
  if (pathname.startsWith('/dashboard')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    // 1. If no token, redirect to onboarding (login)
    if (!token) {
      const url = new URL('/onboarding', request.url)
      // Optional: Add callbackUrl to redirect back after login? 
      // For now, simple redirect to onboarding is safer/simpler
      return NextResponse.redirect(url)
    }

    // 2. If token exists but needs setup, redirect to setup page
    if (token.needsSetup) {
      // Only redirect if we have a managementId, otherwise something is wrong with the data
      if (token.managementId) {
        const url = new URL('/onboarding/setup', request.url)
        url.searchParams.set('managementId', token.managementId)
        return NextResponse.redirect(url)
      }
    }
  }

  // Note: 404s for /_next/static/chunks/* during development are normal
  // They occur during hot module reloading when Next.js is generating new chunks
  // These don't affect functionality and can be safely ignored

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/.well-known/:path*',
  ],
}
