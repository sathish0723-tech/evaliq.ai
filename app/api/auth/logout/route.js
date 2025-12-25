import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function POST(request) {
  try {
    await deleteSession()
    
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Also clear the cookie in the response
    response.cookies.delete('auth_session')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}













