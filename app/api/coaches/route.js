import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/coaches
 * Get all coaches for the current management
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
    const batchParam = searchParams.get('batch')

    const db = await getDb(DB_NAME)
    const coachesCollection = db.collection('coaches')
    const studentsCollection = db.collection('students')
    const classesCollection = db.collection('classes')

    let coaches = []

    // If batch is specified, get coaches that belong to that batch directly
    if (batchParam) {
      // URLSearchParams.get() should automatically decode, but handle both cases
      // Replace + with space first (URL encoding for spaces), then decode
      let decodedBatch = batchParam.replace(/\+/g, ' ')
      try {
        decodedBatch = decodeURIComponent(decodedBatch)
      } catch (e) {
        // If decoding fails, use the batchParam as-is
        decodedBatch = batchParam
      }
      // Normalize batch name: remove spaces around dashes (e.g., "Batch - 7" -> "Batch-7")
      const normalizedBatch = decodedBatch.trim().replace(/\s*-\s*/g, '-')
      
      console.log('GET /api/coaches - Batch filter:', { 
        original: batchParam, 
        decoded: decodedBatch, 
        normalized: normalizedBatch 
      })
      
      // First, get coaches that have the batch field set to the specified batch
      const coachesWithBatch = await coachesCollection.aggregate([
        {
          $match: {
            managementId: session.managementId,
            batch: normalizedBatch, // Direct match on coach's batch field
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).toArray()
      
      console.log(`GET /api/coaches - Found ${coachesWithBatch.length} coaches with batch="${normalizedBatch}"`)
      
      // Also get coaches assigned to classes that have students in that batch (legacy/fallback)
      const studentsInBatch = await studentsCollection.aggregate([
        {
          $match: {
            managementId: session.managementId,
            batch: normalizedBatch,
            classId: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$classId'
          }
        }
      ]).toArray()
      
      const classIds = studentsInBatch.map(s => s._id).filter(Boolean)
      let coachesFromClasses = []
      
      if (classIds.length > 0) {
        const classes = await classesCollection.aggregate([
          {
            $match: {
              managementId: session.managementId,
              classId: { $in: classIds }
            }
          }
        ]).toArray()
        
        const coachIds = [...new Set(classes.map(c => c.coachId).filter(Boolean))]
        
        if (coachIds.length > 0) {
          coachesFromClasses = await coachesCollection.aggregate([
            {
              $match: {
                managementId: session.managementId,
                coachId: { $in: coachIds }
              }
            },
            {
              $sort: { createdAt: -1 }
            }
          ]).toArray()
        }
      }
      
      // Combine both sets of coaches and remove duplicates
      const allCoachIds = new Set()
      coaches = []
      
      // Add coaches with batch field first
      coachesWithBatch.forEach(coach => {
        if (!allCoachIds.has(coach._id.toString())) {
          allCoachIds.add(coach._id.toString())
          coaches.push(coach)
        }
      })
      
      // Add coaches from classes (if not already added)
      coachesFromClasses.forEach(coach => {
        if (!allCoachIds.has(coach._id.toString())) {
          allCoachIds.add(coach._id.toString())
          coaches.push(coach)
        }
      })
      
      // Sort by creation date
      coaches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else {
      // Get all coaches for the current management using aggregation
      coaches = await coachesCollection.aggregate([
        {
          $match: { managementId: session.managementId }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).toArray()
    }

    // Format coaches for response
    const formattedCoaches = coaches.map(coach => ({
      id: coach._id.toString(),
      coachId: coach.coachId,
      name: coach.name,
      email: coach.email,
      phone: coach.phone || '',
      photo: coach.photo || '',
      batch: coach.batch || '',
      managementId: coach.managementId,
      createdAt: coach.createdAt,
      updatedAt: coach.updatedAt,
    }))

    return NextResponse.json({ coaches: formattedCoaches })
  } catch (error) {
    console.error('Coaches API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/coaches
 * Create a new coach
 */
export async function POST(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session) {
      console.error('POST /api/coaches - No session found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('POST /api/coaches - Session:', { 
      role: session.role, 
      managementId: session.managementId,
      email: session.email 
    })

    // Only admins can create coaches
    if (session.role !== 'admin') {
      console.error('POST /api/coaches - Forbidden: User role is', session.role)
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('POST /api/coaches - JSON parse error:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    console.log('POST /api/coaches - Request body:', body)
    const { name, email, phone, photo, batch } = body

    // Validate name and email - check for empty strings too
    if (!name || !name.trim() || !email || !email.trim()) {
      console.error('POST /api/coaches - Validation failed: Missing name or email', { 
        name: name || '(empty)', 
        email: email || '(empty)',
        nameType: typeof name,
        emailType: typeof email
      })
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const coachesCollection = db.collection('coaches')
    const batchesCollection = db.collection('batches')

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim()
    const normalizedBatch = batch ? batch.trim() : ''

    // Validate batch if provided - check if it exists in batches collection
    if (normalizedBatch) {
      const existingBatch = await batchesCollection.findOne({
        batchName: normalizedBatch,
        managementId: session.managementId,
      })

      if (!existingBatch) {
        console.error('POST /api/coaches - Batch not found:', normalizedBatch)
        return NextResponse.json(
          { error: `Batch "${normalizedBatch}" does not exist. Please create the batch first.` },
          { status: 400 }
        )
      }
    }

    // Check if coach already exists (case-insensitive email check)
    const existingCoach = await coachesCollection.findOne({
      email: normalizedEmail,
      managementId: session.managementId,
    })

    if (existingCoach) {
      console.error('POST /api/coaches - Coach already exists:', { 
        email: normalizedEmail, 
        managementId: session.managementId,
        existingCoachId: existingCoach._id 
      })
      return NextResponse.json(
        { 
          error: `Coach with email "${normalizedEmail}" already exists. Please use a different email or edit the existing coach.`,
          existingCoach: {
            id: existingCoach._id.toString(),
            coachId: existingCoach.coachId,
            name: existingCoach.name,
            email: existingCoach.email
          }
        },
        { status: 400 }
      )
    }

    // Generate unique coach ID
    const coachId = await generateCoachId(coachesCollection, session.managementId)

    // Create coach
    const now = new Date()
    const result = await coachesCollection.insertOne({
      coachId,
      name: normalizedName,
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      photo: photo ? photo.trim() : '',
      batch: normalizedBatch,
      managementId: session.managementId,
      createdAt: now,
      updatedAt: now,
    })

    console.log('POST /api/coaches - Coach created successfully:', { 
      coachId, 
      name: normalizedName, 
      email: normalizedEmail,
      batch: normalizedBatch
    })

    return NextResponse.json({
      success: true,
      coach: {
        id: result.insertedId.toString(),
        coachId,
        name: normalizedName,
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        photo: photo ? photo.trim() : '',
        batch: normalizedBatch,
      },
    })
  } catch (error) {
    console.error('Create coach API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/coaches
 * Update a coach
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

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, email, phone, photo, batch } = body

    if (!id || !name || !email) {
      return NextResponse.json(
        { error: 'Coach ID, name, and email are required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const coachesCollection = db.collection('coaches')
    const batchesCollection = db.collection('batches')

    // Normalize batch
    const normalizedBatch = batch ? batch.trim() : ''

    // Validate batch if provided - check if it exists in batches collection
    if (normalizedBatch) {
      const existingBatch = await batchesCollection.findOne({
        batchName: normalizedBatch,
        managementId: session.managementId,
      })

      if (!existingBatch) {
        return NextResponse.json(
          { error: `Batch "${normalizedBatch}" does not exist. Please create the batch first.` },
          { status: 400 }
        )
      }
    }

    // Verify coach belongs to the same management
    const existingCoach = await coachesCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingCoach) {
      return NextResponse.json(
        { error: 'Coach not found' },
        { status: 404 }
      )
    }

    // Check if email is being changed and if it's already taken
    if (email !== existingCoach.email) {
      const emailTaken = await coachesCollection.findOne({
        email,
        managementId: session.managementId,
        _id: { $ne: new ObjectId(id) },
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already in use by another coach' },
          { status: 400 }
        )
      }
    }

    // Update coach
    await coachesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          email,
          phone: phone || '',
          photo: photo || '',
          batch: normalizedBatch,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Coach updated successfully',
    })
  } catch (error) {
    console.error('Update coach API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/coaches
 * Delete a coach
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

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Coach ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const coachesCollection = db.collection('coaches')
    const classesCollection = db.collection('classes')

    // Verify coach belongs to the same management
    const existingCoach = await coachesCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId,
    })

    if (!existingCoach) {
      return NextResponse.json(
        { error: 'Coach not found' },
        { status: 404 }
      )
    }

    // Check if coach is assigned to any classes
    const classCount = await classesCollection.countDocuments({
      coachId: existingCoach.coachId,
      managementId: session.managementId,
    })

    if (classCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete coach. They are assigned to ${classCount} class(es). Please unassign them first.` },
        { status: 400 }
      )
    }

    // Delete coach
    await coachesCollection.deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      message: 'Coach deleted successfully',
    })
  } catch (error) {
    console.error('Delete coach API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique coach ID
 */
async function generateCoachId(coachesCollection, managementId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let coachId
  let isUnique = false

  while (!isUnique) {
    coachId = 'COA_' + Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const existing = await coachesCollection.findOne({
      coachId,
      managementId,
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return coachId
}

