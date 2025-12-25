import { NextResponse } from 'next/server'
import { getDb, COLLECTIONS } from '@/lib/db/collections'
import { getSession } from '@/lib/session'
import { getCurrentBatch } from '@/lib/utils-batch'

// GET - Fetch all marksheet templates or a specific one
export async function GET(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const batch = searchParams.get('batch')

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.MARKSHEET_TEMPLATES)

    if (templateId) {
      // Fetch specific template - don't filter by batch for specific template
      const template = await collection.findOne({
        templateId,
        managementId: session.managementId
      })
      return NextResponse.json({ template })
    }

    // Fetch all templates - batch filter is optional
    const query = { managementId: session.managementId }
    if (batch) {
      query.batch = batch
    }
    
    const templates = await collection.find(query).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching marksheet templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create a new marksheet template
export async function POST(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      templateName,
      logo,
      institutionName,
      subtitle,
      subjects,
      elements,
      sections, // New: sections with styles
      remarks,
      batch,
      canvasBackgroundColor,
      canvasBackgroundImage,
      html // HTML format of the template
    } = body

    const currentBatch = batch || getCurrentBatch()
    const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.MARKSHEET_TEMPLATES)

    const template = {
      templateId,
      templateName: templateName || 'Untitled Template',
      logo,
      institutionName,
      subtitle,
      subjects,
      elements, // Keep for backward compatibility
      sections, // New: sections with styles (header, body, footer)
      remarks,
      canvasBackgroundColor,
      canvasBackgroundImage,
      html, // HTML format of the template
      managementId: session.managementId,
      batch: currentBatch,
      createdBy: session.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(template)

    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template saved successfully' 
    })
  } catch (error) {
    console.error('Error creating marksheet template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

// PUT - Update an existing marksheet template
export async function PUT(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      templateId,
      templateName,
      logo,
      institutionName,
      subtitle,
      subjects,
      elements,
      sections, // New: sections with styles
      remarks,
      canvasBackgroundColor,
      canvasBackgroundImage,
      html // HTML format of the template
    } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.MARKSHEET_TEMPLATES)

    const updateData = {
      ...(templateName && { templateName }),
      ...(logo !== undefined && { logo }),
      ...(institutionName && { institutionName }),
      ...(subtitle && { subtitle }),
      ...(subjects && { subjects }),
      ...(elements && { elements }),
      ...(sections && { sections }), // New: sections with styles
      ...(remarks !== undefined && { remarks }),
      ...(canvasBackgroundColor !== undefined && { canvasBackgroundColor }),
      ...(canvasBackgroundImage !== undefined && { canvasBackgroundImage }),
      ...(html !== undefined && { html }), // HTML format of the template
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { templateId, managementId: session.managementId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Template updated successfully' 
    })
  } catch (error) {
    console.error('Error updating marksheet template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Delete a marksheet template
export async function DELETE(request) {
  try {
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const db = await getDb()
    const collection = db.collection(COLLECTIONS.MARKSHEET_TEMPLATES)

    const result = await collection.deleteOne({
      templateId,
      managementId: session.managementId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting marksheet template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}

