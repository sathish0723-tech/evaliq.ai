import { NextResponse } from 'next/server'

// Backend endpoint from environment variable
const BACK_END_ENDPOINT = process.env.BACK_END_ENDPOINT || ''

/**
 * GET /api/copilot/chat
 * Get chat conversation from backend endpoint
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
    const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/chat${chatId ? `?chatId=${chatId}` : ''}`
    
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
    console.error('Copilot chat GET API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/copilot/chat
 * Send chat message to backend endpoint
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
    const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/chat`
    
    // Ensure deep-search and report fields are included in the payload
    // The body already contains: chatId, message, messages, selectedTool, batch, deep-search, report
    const payload = {
      ...body,
      'deep-search': body['deep-search'] ?? false,
      'report': body['report'] ?? false,
    }
    
    try {
      // Forward the request to backend with all fields including deep-search and report
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
    console.error('Copilot chat POST API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/copilot/chat
 * Update chat conversation in backend endpoint
 */
export async function PUT(request) {
  try {
    if (!BACK_END_ENDPOINT) {
      return NextResponse.json(
        { error: 'Backend endpoint not configured. Please set BACK_END_ENDPOINT environment variable.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // Build the backend URL
    const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/chat`
    
    try {
      // Forward the request to backend
      const response = await fetch(backendUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
    console.error('Copilot chat PUT API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/copilot/chat
 * Delete chat conversation from backend endpoint
 */
export async function DELETE(request) {
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
    const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/chat${chatId ? `?chatId=${chatId}` : ''}`
    
    try {
      // Forward the request to backend
      const response = await fetch(backendUrl, {
        method: 'DELETE',
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
    console.error('Copilot chat DELETE API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

