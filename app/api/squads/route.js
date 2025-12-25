import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, initializeCollections, DB_NAME, getSquadsCollection } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/squads
 * Get all squads for the current management or a specific class
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
    const classId = searchParams.get('classId')
    const batch = searchParams.get('batch')

    const squadsCollection = await getSquadsCollection(DB_NAME)

    // Build match stage
    const matchStage = { managementId: session.managementId }
    if (classId) {
      matchStage.classId = classId
    }
    if (batch) {
      matchStage.batch = batch.trim()
    }

    const squads = await squadsCollection.aggregate([
      {
        $match: matchStage
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray()

    // Format squads for response
    const formattedSquads = squads.map(squad => ({
      id: squad._id.toString(),
      squadId: squad.squadId,
      name: squad.name,
      classId: squad.classId || '',
      batch: squad.batch || '',
      studentIds: squad.studentIds || [],
      squadLeaderId: squad.squadLeaderId || '',
      durationType: squad.durationType || 'monthly', // 'daily' or 'monthly'
      startDate: squad.startDate,
      endDate: squad.endDate,
      startMonth: squad.startMonth,
      startDay: squad.startDay,
      startYear: squad.startYear,
      endMonth: squad.endMonth,
      endDay: squad.endDay,
      endYear: squad.endYear,
      createdAt: squad.createdAt,
      updatedAt: squad.updatedAt,
    }))

    return NextResponse.json({ squads: formattedSquads })
  } catch (error) {
    console.error('Squads API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/squads
 * Create a new squad
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

    // Only admins can create squads
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, classId, studentIds, squadLeaderId, durationType, startDate, endDate, batch } = body

    if (!name || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Squad name and at least one student are required' },
        { status: 400 }
      )
    }

    if (!squadLeaderId || !studentIds.includes(squadLeaderId)) {
      return NextResponse.json(
        { error: 'Squad leader must be selected from the assigned students' },
        { status: 400 }
      )
    }

    if (!durationType || !['daily', 'monthly'].includes(durationType)) {
      return NextResponse.json(
        { error: 'Duration type must be either "daily" or "monthly"' },
        { status: 400 }
      )
    }

    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      )
    }

    const squadsCollection = await getSquadsCollection(DB_NAME)

    // Generate unique squad ID
    const squadId = `SQUAD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Parse dates
    const start = new Date(startDate)
    let calculatedEndDate
    if (endDate) {
      calculatedEndDate = new Date(endDate)
    } else {
      // Calculate end date based on duration type if not provided
      calculatedEndDate = new Date(start)
      if (durationType === 'daily') {
        calculatedEndDate.setDate(calculatedEndDate.getDate() + 1)
      } else {
        // monthly
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1)
      }
    }

    // Extract month and date information
    const startMonth = start.getMonth() + 1 // 1-12
    const startDay = start.getDate()
    const startYear = start.getFullYear()
    const endMonth = calculatedEndDate.getMonth() + 1
    const endDay = calculatedEndDate.getDate()
    const endYear = calculatedEndDate.getFullYear()

    const squad = {
      squadId,
      name,
      classId: classId || '',
      batch: batch || '',
      studentIds: studentIds,
      squadLeaderId,
      durationType,
      startDate: start,
      endDate: calculatedEndDate,
      startMonth,
      startDay,
      startYear,
      endMonth,
      endDay,
      endYear,
      managementId: session.managementId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await squadsCollection.insertOne(squad)

    return NextResponse.json({
      success: true,
      squad: {
        id: result.insertedId.toString(),
        ...squad,
      }
    })
  } catch (error) {
    console.error('Create squad error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create squad' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/squads
 * Update a squad
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

    // Only admins can update squads
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, studentIds, squadLeaderId, durationType, startDate, endDate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Squad ID is required' },
        { status: 400 }
      )
    }

    const squadsCollection = await getSquadsCollection(DB_NAME)

    // Find existing squad
    const existingSquad = await squadsCollection.findOne({
      _id: new ObjectId(id),
      managementId: session.managementId
    })

    if (!existingSquad) {
      return NextResponse.json(
        { error: 'Squad not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    }

    if (name) updateData.name = name
    if (studentIds && Array.isArray(studentIds)) {
      updateData.studentIds = studentIds
      // If squad leader is not in the new student list, remove it
      if (squadLeaderId && !studentIds.includes(squadLeaderId)) {
        updateData.squadLeaderId = studentIds[0] || existingSquad.squadLeaderId
      }
    }
    if (squadLeaderId) {
      const validStudentIds = updateData.studentIds || existingSquad.studentIds
      if (validStudentIds.includes(squadLeaderId)) {
        updateData.squadLeaderId = squadLeaderId
      }
    }
    if (durationType && ['daily', 'monthly'].includes(durationType)) {
      updateData.durationType = durationType
    }
    if (startDate) {
      const start = new Date(startDate)
      updateData.startDate = start
      
      // Calculate end date
      let calculatedEndDate
      if (endDate) {
        calculatedEndDate = new Date(endDate)
      } else {
        // Recalculate end date based on duration type
        const duration = updateData.durationType || existingSquad.durationType
        calculatedEndDate = new Date(start)
        if (duration === 'daily') {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + 1)
        } else {
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1)
        }
      }
      updateData.endDate = calculatedEndDate
      
      // Update month and date information
      updateData.startMonth = start.getMonth() + 1
      updateData.startDay = start.getDate()
      updateData.startYear = start.getFullYear()
      updateData.endMonth = calculatedEndDate.getMonth() + 1
      updateData.endDay = calculatedEndDate.getDate()
      updateData.endYear = calculatedEndDate.getFullYear()
    }

    await squadsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    const updatedSquad = await squadsCollection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      squad: {
        id: updatedSquad._id.toString(),
        squadId: updatedSquad.squadId,
        name: updatedSquad.name,
        classId: updatedSquad.classId || '',
        batch: updatedSquad.batch || '',
        studentIds: updatedSquad.studentIds || [],
        squadLeaderId: updatedSquad.squadLeaderId || '',
        durationType: updatedSquad.durationType || 'monthly',
        startDate: updatedSquad.startDate,
        endDate: updatedSquad.endDate,
        startMonth: updatedSquad.startMonth,
        startDay: updatedSquad.startDay,
        startYear: updatedSquad.startYear,
        endMonth: updatedSquad.endMonth,
        endDay: updatedSquad.endDay,
        endYear: updatedSquad.endYear,
        createdAt: updatedSquad.createdAt,
        updatedAt: updatedSquad.updatedAt,
      }
    })
  } catch (error) {
    console.error('Update squad error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update squad' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/squads
 * Delete a squad
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

    // Only admins can delete squads
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
        { error: 'Squad ID is required' },
        { status: 400 }
      )
    }

    const squadsCollection = await getSquadsCollection(DB_NAME)

    const result = await squadsCollection.deleteOne({
      _id: new ObjectId(id),
      managementId: session.managementId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Squad not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete squad error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete squad' },
      { status: 500 }
    )
  }
}

