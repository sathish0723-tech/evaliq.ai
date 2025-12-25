import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/notes
 * Get notes for the current user
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
    const noteId = searchParams.get('noteId')

    const db = await getDb(DB_NAME)
    const notesCollection = db.collection(COLLECTIONS.NOTES)

    let query = { 
      managementId: session.managementId,
      userId: session.userId,
    }

    if (noteId) {
      query.noteId = noteId
    }

    const notes = await notesCollection
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes
 * Create a new note
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
    const { noteId: providedNoteId, title, content } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const notesCollection = db.collection(COLLECTIONS.NOTES)

    // Use provided noteId or generate unique note ID
    const noteId = providedNoteId || `NOTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Check if note with this ID already exists
    const existingNote = await notesCollection.findOne({
      noteId,
      managementId: session.managementId,
      userId: session.userId,
    })

    if (existingNote) {
      return NextResponse.json(
        { error: 'Note with this ID already exists' },
        { status: 400 }
      )
    }

    // Create note
    const note = {
      noteId,
      title: title.trim(),
      content: content || '',
      managementId: session.managementId,
      userId: session.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await notesCollection.insertOne(note)

    return NextResponse.json({
      success: true,
      note: {
        ...note,
        _id: result.insertedId,
      },
    })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notes
 * Update an existing note
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
    const { noteId, title, content } = body

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const notesCollection = db.collection(COLLECTIONS.NOTES)

    // Find the note and verify ownership
    const existingNote = await notesCollection.findOne({
      noteId,
      managementId: session.managementId,
      userId: session.userId,
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Update note
    const updateResult = await notesCollection.updateOne(
      { noteId, managementId: session.managementId, userId: session.userId },
      {
        $set: {
          title: title.trim(),
          content: content || '',
          updatedAt: new Date(),
        },
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Fetch updated note
    const updatedNote = await notesCollection.findOne({
      noteId,
      managementId: session.managementId,
      userId: session.userId,
    })

    return NextResponse.json({
      success: true,
      note: updatedNote,
    })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notes
 * Delete a note
 */
export async function DELETE(request) {
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
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const notesCollection = db.collection(COLLECTIONS.NOTES)

    // Delete note (verify ownership)
    const result = await notesCollection.deleteOne({
      noteId,
      managementId: session.managementId,
      userId: session.userId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

