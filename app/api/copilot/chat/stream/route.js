import { NextResponse } from 'next/server'

// Backend endpoint from environment variable
const BACK_END_ENDPOINT = process.env.BACK_END_ENDPOINT || ''

/**
 * POST /api/copilot/chat/stream
 * Stream chat response from backend using Server-Sent Events (SSE)
 * 
 * This endpoint proxies SSE streams from the Python backend.
 * It pipes the backend's SSE stream directly to the client without buffering.
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

        // Build the backend URL for the streaming endpoint
        const backendUrl = `${BACK_END_ENDPOINT.replace(/\/$/, '')}/copilot/chat/stream`

        // Ensure deep-search and report fields are included in the payload
        const payload = {
            ...body,
            'deep-search': body['deep-search'] ?? false,
            'report': body['report'] ?? false,
        }

        try {
            // Forward the request to backend's streaming endpoint
            const backendResponse = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!backendResponse.ok) {
                // If backend returns an error, try to read the error message
                let errorMessage = 'Backend streaming endpoint returned an error'
                try {
                    const errorData = await backendResponse.json()
                    errorMessage = errorData.error || errorData.message || errorMessage
                } catch {
                    const errorText = await backendResponse.text()
                    errorMessage = errorText || errorMessage
                }

                return NextResponse.json(
                    { error: errorMessage },
                    { status: backendResponse.status }
                )
            }

            // Pipe the SSE stream from backend directly to the client
            // This avoids buffering the full response in memory
            const stream = new ReadableStream({
                async start(controller) {
                    const reader = backendResponse.body.getReader()
                    const encoder = new TextEncoder()

                    try {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) {
                                controller.close()
                                break
                            }
                            // Forward the chunk directly
                            controller.enqueue(value)
                        }
                    } catch (error) {
                        // Send error event before closing
                        const errorEvent = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
                        controller.enqueue(encoder.encode(errorEvent))
                        controller.close()
                    }
                },
            })

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no', // Disable Nginx buffering if behind a proxy
                },
            })
        } catch (error) {
            return NextResponse.json(
                {
                    error: error.message || 'Failed to connect to backend streaming endpoint',
                    timestamp: new Date().toISOString(),
                },
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Copilot chat stream API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
