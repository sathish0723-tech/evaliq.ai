"use client"

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Custom React hook for streaming AI chat responses via SSE.
 * 
 * Handles:
 * - SSE line parsing with buffer for chunk boundary handling
 * - AbortController for stream cancellation
 * - Cleanup on unmount
 * - Error states
 * - Report/deep-search fallback (single-event full response)
 * 
 * @returns {Object} {
 *   streamingText,      - accumulated text so far
 *   isStreaming,         - whether a stream is in progress
 *   streamingChatId,     - chatId from the stream's message_start event
 *   streamError,         - error message if stream failed
 *   streamMetadata,      - extra metadata from report/deep-search responses
 *   startStream,         - function to start streaming
 *   cancelStream,        - function to cancel current stream
 * }
 */
export function useChatStream() {
    const [streamingText, setStreamingText] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingChatId, setStreamingChatId] = useState(null)
    const [streamError, setStreamError] = useState(null)
    const [streamMetadata, setStreamMetadata] = useState(null)
    const [progressMessage, setProgressMessage] = useState(null)

    const abortControllerRef = useRef(null)
    const accumulatedTextRef = useRef('')

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    /**
     * Cancel an in-progress stream
     */
    const cancelStream = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setIsStreaming(false)
    }, [])

    /**
     * Start streaming a chat message
     * 
     * @param {Object} params
     * @param {string} params.message - The user's message text
     * @param {string} params.chatId - The conversation ID
     * @param {Array} params.messages - Previous conversation history
     * @param {string|null} params.selectedTool - 'deep-search', 'report', or null
     * @param {string|null} params.batch - Selected batch
     * @param {function} params.onToken - Callback called with (accumulatedText) on each token
     * @param {function} params.onComplete - Callback called with (fullText, metadata) when stream ends
     * @param {function} params.onError - Callback called with (errorMessage) on error
     * 
     * @returns {Promise<{ text: string, metadata: object|null }>}
     */
    const startStream = useCallback(async ({
        message,
        chatId,
        messages = [],
        selectedTool = null,
        batch = null,
        onToken = null,
        onComplete = null,
        onError = null,
    }) => {
        // Cancel any existing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Setup new stream
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsStreaming(true)
        setStreamingText('')
        setStreamError(null)
        setStreamMetadata(null)
        setProgressMessage(null)
        setStreamingChatId(null)
        accumulatedTextRef.current = ''

        const deepSearch = selectedTool === 'deep-search'
        const report = selectedTool === 'report'

        try {
            const response = await fetch('/api/copilot/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    chatId,
                    message,
                    messages,
                    selectedTool,
                    batch,
                    'deep-search': deepSearch,
                    'report': report,
                }),
                signal: controller.signal,
            })

            if (!response.ok) {
                let errorMsg = 'Failed to start streaming'
                try {
                    const errorData = await response.json()
                    errorMsg = errorData.error || errorData.message || errorMsg
                } catch {
                    // ignore JSON parse errors
                }
                throw new Error(errorMsg)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = '' // Buffer for handling chunk boundaries
            let metadata = null

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                // Decode the chunk and add to buffer
                buffer += decoder.decode(value, { stream: true })

                // Process complete lines from the buffer
                const lines = buffer.split('\n')
                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmedLine = line.trim()

                    // Skip empty lines and comments
                    if (!trimmedLine || trimmedLine.startsWith(':')) continue

                    // Only process data lines
                    if (!trimmedLine.startsWith('data: ')) continue

                    const payload = trimmedLine.slice(6) // Strip "data: "

                    // Check for stream end
                    if (payload === '[DONE]') {
                        // Stream is complete
                        setIsStreaming(false)
                        if (onComplete) {
                            onComplete(accumulatedTextRef.current, metadata)
                        }
                        return {
                            text: accumulatedTextRef.current,
                            metadata,
                        }
                    }

                    try {
                        const event = JSON.parse(payload)

                        switch (event.type) {
                            case 'message_start':
                                setStreamingChatId(event.chatId || chatId)
                                break

                            case 'progress':
                                setProgressMessage(event.statusMessage || null)
                                break

                            case 'content_block_delta': {
                                const text = event.delta?.text || ''
                                accumulatedTextRef.current += text
                                setStreamingText(accumulatedTextRef.current)

                                if (onToken) {
                                    onToken(accumulatedTextRef.current)
                                }

                                // Check for report/deep-search metadata (full response in single event)
                                if (event.isComplete || event.status === 'complete') {
                                    metadata = {
                                        chatId: event.chatId || chatId,
                                        data: event.data || null,
                                        count: event.count || null,
                                        status: event.status || null,
                                        isComplete: true,
                                    }
                                    setStreamMetadata(metadata)
                                }
                                break
                            }

                            case 'message_stop':
                                // AI finished generating, stream will close with [DONE] next
                                break

                            case 'error':
                                const errorMsg = event.error || 'Stream error occurred'
                                setStreamError(errorMsg)
                                if (onError) {
                                    onError(errorMsg)
                                }
                                break

                            default:
                                // Unknown event type, skip
                                break
                        }
                    } catch (parseError) {
                        // Skip unparseable lines (may be partial JSON from chunk boundary)
                        console.warn('Skipping unparseable SSE payload:', payload)
                    }
                }
            }

            // Stream ended without [DONE] — still complete
            setIsStreaming(false)
            if (onComplete) {
                onComplete(accumulatedTextRef.current, metadata)
            }
            return {
                text: accumulatedTextRef.current,
                metadata,
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                // Stream was cancelled by the user — not an error
                setIsStreaming(false)
                return {
                    text: accumulatedTextRef.current,
                    metadata: null,
                }
            }

            const errorMsg = error.message || 'Stream failed'
            setStreamError(errorMsg)
            setIsStreaming(false)

            if (onError) {
                onError(errorMsg)
            }

            throw error
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null
            }
        }
    }, [])

    return {
        streamingText,
        isStreaming,
        streamingChatId,
        streamError,
        streamMetadata,
        progressMessage,
        startStream,
        cancelStream,
    }
}
