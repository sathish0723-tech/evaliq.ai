import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getConversationsCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * Generate a unique chat ID
 * @returns {string} Unique chat ID
 */
function generateChatId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `chat_${timestamp}_${random}`
}

/**
 * GET /api/conversations
 * Get conversations for the current user or a specific conversation
 */
export async function GET(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    const conversationsCollection = await getConversationsCollection(DB_NAME)

    // If specific chat ID requested
    if (chatId) {
      const conversation = await conversationsCollection.findOne({ 
        chatId,
        userId: session.userId 
      })
      
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ conversation })
    }

    // Get all conversations for the user
    const conversations = await conversationsCollection
      .find({ userId: session.userId })
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, selectedTool, batch } = body

    const conversationsCollection = await getConversationsCollection(DB_NAME)

    // Generate unique chat ID
    const chatId = generateChatId()

    // Create conversation
    const conversation = {
      chatId,
      userId: session.userId,
      managementId: session.managementId,
      title: title || 'New Conversation',
      selectedTool: selectedTool || null,
      batch: batch || null,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await conversationsCollection.insertOne(conversation)

    return NextResponse.json({
      conversation: {
        ...conversation,
        _id: result.insertedId,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/conversations
 * Update a conversation (add messages, update title, etc.)
 */
export async function PUT(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { chatId, messages, title, selectedTool, batch } = body

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      )
    }

    const conversationsCollection = await getConversationsCollection(DB_NAME)

    // Verify conversation belongs to user
    const existingConversation = await conversationsCollection.findOne({
      chatId,
      userId: session.userId,
    })

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    }

    if (messages && Array.isArray(messages)) {
      updateData.messages = messages
      
      // Auto-generate title from first user message if title not provided and messages exist
      if (title === undefined && messages.length > 0) {
        const firstUserMessage = messages.find(msg => msg.role === 'user')
        if (firstUserMessage && firstUserMessage.content) {
          const trimmed = firstUserMessage.content.trim()
          if (trimmed) {
            const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
            updateData.title = capitalized.length > 50 ? capitalized.substring(0, 47) + '...' : capitalized
          }
        }
      }
    }

    if (title !== undefined) {
      updateData.title = title
    }

    if (selectedTool !== undefined) {
      updateData.selectedTool = selectedTool
    }

    if (batch !== undefined) {
      updateData.batch = batch
    }

    // Update conversation
    const result = await conversationsCollection.updateOne(
      { chatId, userId: session.userId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Fetch updated conversation
    const updatedConversation = await conversationsCollection.findOne({
      chatId,
      userId: session.userId,
    })

    return NextResponse.json({ conversation: updatedConversation })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

