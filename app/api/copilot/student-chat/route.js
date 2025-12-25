import { NextResponse } from 'next/server'

// Backend endpoint from environment variable
const BACK_END_ENDPOINT = process.env.BACK_END_ENDPOINT || ''

/**
 * POST /api/copilot/student-chat
 * Send chat message with student data to backend endpoint
 */
export async function POST(request) {
  try {
    if (!BACK_END_ENDPOINT) {
      return NextResponse.json(
        { error: 'Backend endpoint not configured. Please set BACK_END_ENDPOINT environment variable.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // Build the backend URL
    const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/student-chat`
    
    // Prepare payload with student data
    const payload = {
      ...body,
      'deep-search': body['deep-search'] ?? false,
      'report': body['report'] ?? false,
      // Include selectedStudents if provided
      selectedStudents: body.selectedStudents || [],
    }
    
    try {
      // Forward the request to backend with student data
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      let responseData
      try {
        responseData = await response.json()
      } catch {
        const text = await response.text()
        responseData = { message: text }
      }
      
      return NextResponse.json(responseData, { status: response.status })
    } catch (error) {
      return NextResponse.json(
        {
          error: error.message || 'Failed to connect to backend endpoint',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Copilot student chat POST API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/copilot/student-chat
 * Get student chat conversation from backend endpoint
 */
export async function GET(request) {
  try {
    if (!BACK_END_ENDPOINT) {
      return NextResponse.json(
        { error: 'Backend endpoint not configured. Please set BACK_END_ENDPOINT environment variable.' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    
    // Build the backend URL
    const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/student-chat${chatId ? `?chatId=${chatId}` : ''}`
    
    try {
      // Forward the request to backend
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      let responseData
      try {
        responseData = await response.json()
      } catch {
        const text = await response.text()
        responseData = { message: text }
      }
      
      return NextResponse.json(responseData, { status: response.status })
    } catch (error) {
      return NextResponse.json(
        {
          error: error.message || 'Failed to connect to backend endpoint',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Copilot student chat GET API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

