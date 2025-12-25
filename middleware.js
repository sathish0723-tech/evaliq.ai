import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Handle Chrome DevTools requests to prevent 404 errors
  if (pathname.includes('.well-known/appspecific')) {
    return NextResponse.json({}, { status: 200 })
  }

  // Note: 404s for /_next/static/chunks/* during development are normal
  // They occur during hot module reloading when Next.js is generating new chunks
  // These don't affect functionality and can be safely ignored

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/.well-known/:path*',
  ],
}

