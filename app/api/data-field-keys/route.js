import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb, COLLECTIONS, initializeCollections, DB_NAME } from '@/lib/db/collections'
import { getSession } from '@/lib/session'

/**
 * GET /api/data-field-keys
 * Get all validated data field keys for the current management
 * Returns mapping of UI placeholder keys to actual database field paths
 * If no keys exist, automatically scans database and creates them
 */
export async function GET(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb(DB_NAME)
    const collection = db.collection(COLLECTIONS.DATA_FIELD_KEYS)
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true' || searchParams.get('refresh') === '1'
    const custom = searchParams.get('custom') === 'true'

    // If requesting custom key sets, return them
    if (custom) {
      const savedKeySets = await collection.find({
        managementId: session.managementId,
        keyName: { $exists: true },
        customKeySet: { $exists: true }
      }).sort({ updatedAt: -1 }).toArray()

      return NextResponse.json({
        savedKeys: savedKeySets.map(ks => ({
          _id: ks._id.toString(),
          name: ks.customKeySet?.name || ks.keyName,
          batchName: ks.customKeySet?.batchName,
          manualKeys: ks.customKeySet?.manualKeys || [],
          testBasedKeys: ks.customKeySet?.testBasedKeys || [],
          calculationKeys: ks.customKeySet?.calculationKeys || [],
          config: ks.customKeySet?.config || {},
          createdAt: ks.customKeySet?.createdAt || ks.createdAt,
          updatedAt: ks.customKeySet?.updatedAt || ks.updatedAt
        }))
      })
    }

    // Get all data field keys for this management
    let dataFieldKeys = await collection.find({
      managementId: session.managementId,
      keyName: { $exists: false } // Exclude custom key sets
    }).sort({ label: 1 }).toArray()

    // If no keys exist OR refresh is requested, automatically scan database and create/update them
    if (dataFieldKeys.length === 0 || refresh) {
      const studentsCollection = db.collection(COLLECTIONS.STUDENTS)
      const marksCollection = db.collection(COLLECTIONS.MARKS)
      const subjectsCollection = db.collection(COLLECTIONS.SUBJECTS)
      
      // Discover all unique fields across multiple collections
      const discoveredFields = new Set()
      const fieldSamples = {}
      
      // Helper function to recursively discover fields
      const discoverFields = (obj, prefix = '', skipKeys = []) => {
        for (const [key, value] of Object.entries(obj)) {
          // Skip MongoDB internal fields
          if (key === '_id' || key === '__v') continue
          
          // Skip specified keys (like 'students' which contains dynamic student IDs)
          if (skipKeys.includes(key)) continue
          
          const fullPath = prefix ? `${prefix}.${key}` : key
          
          if (value === null || value === undefined) {
            discoveredFields.add(fullPath)
            if (!fieldSamples[fullPath]) {
              fieldSamples[fullPath] = null
            }
          } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            discoverFields(value, fullPath, skipKeys)
          } else {
            discoveredFields.add(fullPath)
            if (!fieldSamples[fullPath]) {
              fieldSamples[fullPath] = value
            }
          }
        }
      }

      // 1. Discover fields from students collection
      const sampleStudents = await studentsCollection.find({
        managementId: session.managementId
      }).limit(100).toArray()

      if (sampleStudents.length > 0) {
        sampleStudents.forEach(student => {
          discoverFields(student)
        })
      }

      // 2. Discover fields from marks collection
      const sampleMarks = await marksCollection.find({
        managementId: session.managementId
      }).limit(50).toArray()

      if (sampleMarks.length > 0) {
        sampleMarks.forEach(mark => {
          // Discover top-level marks fields, but skip 'students' (it contains dynamic student IDs)
          discoverFields(mark, 'marks', ['students'])
        })
        
        // Handle marks.students structure specially - extract generic structure from first student
        const firstMark = sampleMarks[0]
        if (firstMark && firstMark.students && typeof firstMark.students === 'object') {
          // Get first student's marks structure to discover the generic pattern
          const firstStudentMarks = Object.values(firstMark.students)[0]
          if (firstStudentMarks && typeof firstStudentMarks === 'object') {
            // Discover the structure of student marks (marks, maxMarks, etc.)
            // This creates generic keys like marks.students.student.marks (not student-specific)
            discoverFields(firstStudentMarks, 'marks.students.student')
            
            // Also create direct access keys for easier use
            if (firstStudentMarks.marks !== undefined) {
              discoveredFields.add('marks')
              if (!fieldSamples['marks']) fieldSamples['marks'] = firstStudentMarks.marks
            }
            if (firstStudentMarks.maxMarks !== undefined) {
              discoveredFields.add('maxMarks')
              if (!fieldSamples['maxMarks']) fieldSamples['maxMarks'] = firstStudentMarks.maxMarks
            }
          }
        }
        
        // Add direct/aliased fields for easier access (using first mark as sample)
        if (firstMark) {
          // Top-level marks fields
          if (firstMark.testId) {
            discoveredFields.add('testId')
            if (!fieldSamples['testId']) fieldSamples['testId'] = firstMark.testId
          }
          if (firstMark.subjectId) {
            discoveredFields.add('marksSubjectId')
            if (!fieldSamples['marksSubjectId']) fieldSamples['marksSubjectId'] = firstMark.subjectId
          }
          if (firstMark.classId) {
            discoveredFields.add('marksClassId')
            if (!fieldSamples['marksClassId']) fieldSamples['marksClassId'] = firstMark.classId
          }
        }
      }

      // 3. Discover fields from subjects collection
      const sampleSubjects = await subjectsCollection.find({
        managementId: session.managementId
      }).limit(50).toArray()

      if (sampleSubjects.length > 0) {
        sampleSubjects.forEach(subject => {
          discoverFields(subject, 'subject')
        })
        
        // Add direct subject fields without prefix for easier access
        const firstSubject = sampleSubjects[0]
        if (firstSubject) {
          if (firstSubject.subjectId) {
            discoveredFields.add('subjectId')
            if (!fieldSamples['subjectId']) fieldSamples['subjectId'] = firstSubject.subjectId
          }
          if (firstSubject.name) {
            discoveredFields.add('subjectName')
            if (!fieldSamples['subjectName']) fieldSamples['subjectName'] = firstSubject.name
          }
          if (firstSubject.classId) {
            discoveredFields.add('subjectClassId')
            if (!fieldSamples['subjectClassId']) fieldSamples['subjectClassId'] = firstSubject.classId
          }
        }
      }

      if (discoveredFields.size > 0) {

        // Helper function to generate label from field path
        const generateLabel = (fieldPath) => {
          return fieldPath
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).replace(/([A-Z])/g, ' $1'))
            .join(' ')
        }

        // Helper function to suggest icon based on field name
        const suggestIcon = (fieldPath) => {
          const lower = fieldPath.toLowerCase()
          if (lower.includes('name') || lower.includes('parent') || lower.includes('father') || lower.includes('mother')) return 'user'
          if (lower.includes('email')) return 'mail'
          if (lower.includes('phone')) return 'phone'
          if (lower.includes('id') || lower.includes('roll')) return 'hash'
          if (lower.includes('class') || lower.includes('school')) return 'school'
          if (lower.includes('batch') || lower.includes('section')) return 'layout'
          if (lower.includes('photo') || lower.includes('image') || lower.includes('picture')) return 'image'
          if (lower.includes('date') || lower.includes('dob') || lower.includes('birth')) return 'calendar'
          if (lower.includes('address') || lower.includes('village') || lower.includes('home')) return 'home'
          if (lower.includes('attendance')) return 'check'
          if (lower.includes('mark') || lower.includes('score') || lower.includes('grade')) return 'calculator'
          if (lower.includes('percentage') || lower.includes('percent')) return 'percent'
          if (lower.includes('rank')) return 'trophy'
          if (lower.includes('result')) return 'flag'
          return 'database'
        }

        const validatedKeys = []
        discoveredFields.forEach(dbFieldPath => {
          const sampleValue = fieldSamples[dbFieldPath]
          let dataType = 'string'
          if (sampleValue !== null && sampleValue !== undefined) {
            if (typeof sampleValue === 'number') {
              dataType = 'number'
            } else if (sampleValue instanceof Date) {
              dataType = 'date'
            } else if (Array.isArray(sampleValue)) {
              dataType = 'array'
            } else if (typeof sampleValue === 'boolean') {
              dataType = 'boolean'
            }
          }

          validatedKeys.push({
            placeholderKey: dbFieldPath,
            dbFieldPath: dbFieldPath,
            label: generateLabel(dbFieldPath),
            icon: suggestIcon(dbFieldPath),
            existsInDb: true,
            defaultValue: sampleValue !== null && sampleValue !== undefined ? String(sampleValue) : '',
            dataType: dataType,
            description: `Field from database: ${dbFieldPath}`
          })
        })

        validatedKeys.sort((a, b) => a.label.localeCompare(b.label))

        // Save to database
        const now = new Date()
        const operations = validatedKeys.map(key => ({
          updateOne: {
            filter: {
              placeholderKey: key.placeholderKey,
              managementId: session.managementId
            },
            update: {
              $set: {
                placeholderKey: key.placeholderKey,
                dbFieldPath: key.dbFieldPath,
                label: key.label,
                icon: key.icon,
                existsInDb: key.existsInDb,
                defaultValue: key.defaultValue,
                dataType: key.dataType,
                description: key.description,
                managementId: session.managementId,
                updatedAt: now
              },
              $setOnInsert: {
                createdAt: now
              }
            },
            upsert: true
          }
        }))

        if (operations.length > 0) {
          await collection.bulkWrite(operations)
        }

        // Clean up old student-specific keys (keys with ObjectId patterns in the path)
        const objectIdPattern = /^[0-9a-f]{24}$/i
        const allKeys = await collection.find({
          managementId: session.managementId
        }).toArray()
        
        const keysToDelete = allKeys.filter(key => {
          const path = key.placeholderKey || key.dbFieldPath || ''
          const parts = path.split('.')
          // Check if any part of the path looks like an ObjectId (24 hex characters)
          return parts.some(part => objectIdPattern.test(part))
        })
        
        if (keysToDelete.length > 0) {
          const deleteIds = keysToDelete.map(k => k._id)
          await collection.deleteMany({
            _id: { $in: deleteIds },
            managementId: session.managementId
          })
          console.log(`Cleaned up ${keysToDelete.length} old student-specific keys`)
        }

        // Fetch the newly created keys (after cleanup)
        dataFieldKeys = await collection.find({
          managementId: session.managementId
        }).sort({ label: 1 }).toArray()
      } else {
        // No data found in any collection
      return NextResponse.json({
          dataFieldKeys: [],
          message: 'No data found. Create students, marks, or subjects first to discover database fields.'
      })
      }
    }

    // Filter out student-specific keys (keys that contain MongoDB ObjectId patterns in the path)
    // Pattern: marks.students.{objectId}.marks or marks.students.{objectId}.maxMarks
    const objectIdPattern = /^[0-9a-f]{24}$/i
    const filteredKeys = dataFieldKeys.filter(key => {
      const path = key.placeholderKey || key.dbFieldPath || ''
      // Skip keys that have ObjectId patterns in the path (student-specific keys)
      const parts = path.split('.')
      for (let i = 0; i < parts.length; i++) {
        // Check if this part looks like an ObjectId (24 hex characters)
        if (objectIdPattern.test(parts[i])) {
          return false // This is a student-specific key, filter it out
        }
      }
      return true // Keep this key
    })

    return NextResponse.json({
      dataFieldKeys: filteredKeys.map(key => ({
        id: key._id.toString(),
        placeholderKey: key.placeholderKey,
        dbFieldPath: key.dbFieldPath,
        label: key.label,
        icon: key.icon,
        existsInDb: key.existsInDb,
        defaultValue: key.defaultValue,
        dataType: key.dataType,
        description: key.description,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching data field keys:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data field keys' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/data-field-keys
 * Initialize or update data field keys for the current management
 * Scans actual database fields from student documents and stores the mapping
 */
export async function POST(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { validateFromDb = true, customKeys = null, keyName = null, customKeySet = null, isEdit = false, keySetId = null } = body // Support custom keys

    const db = await getDb(DB_NAME)
    const collection = db.collection(COLLECTIONS.DATA_FIELD_KEYS)
    const studentsCollection = db.collection(COLLECTIONS.STUDENTS)
    const marksCollection = db.collection(COLLECTIONS.MARKS)
    const subjectsCollection = db.collection(COLLECTIONS.SUBJECTS)

    let validatedKeys = []
    
    if (validateFromDb) {
      // Discover all unique fields across multiple collections
      const discoveredFields = new Set()
      const fieldSamples = {} // Store sample values to determine data types
      
      // Helper function to recursively discover fields
      const discoverFields = (obj, prefix = '', skipKeys = []) => {
        for (const [key, value] of Object.entries(obj)) {
          // Skip MongoDB internal fields and ObjectId
          if (key === '_id' || key === '__v') continue
          
          // Skip specified keys (like 'students' which contains dynamic student IDs)
          if (skipKeys.includes(key)) continue
          
          const fullPath = prefix ? `${prefix}.${key}` : key
          
          if (value === null || value === undefined) {
            discoveredFields.add(fullPath)
            if (!fieldSamples[fullPath]) {
              fieldSamples[fullPath] = null
            }
          } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Nested object - recurse
            discoverFields(value, fullPath, skipKeys)
          } else {
            // Primitive value or array
            discoveredFields.add(fullPath)
            if (!fieldSamples[fullPath]) {
              fieldSamples[fullPath] = value
            }
          }
        }
      }

      // 1. Discover fields from students collection
      const sampleStudents = await studentsCollection.find({
        managementId: session.managementId
      }).limit(100).toArray()

      if (sampleStudents.length > 0) {
        sampleStudents.forEach(student => {
          discoverFields(student)
        })
      }

      // 2. Discover fields from marks collection
      const sampleMarks = await marksCollection.find({
        managementId: session.managementId
      }).limit(50).toArray()

      if (sampleMarks.length > 0) {
        sampleMarks.forEach(mark => {
          // Discover top-level marks fields, but skip 'students' (it contains dynamic student IDs)
          discoverFields(mark, 'marks', ['students'])
        })
        
        // Handle marks.students structure specially - extract generic structure from first student
        const firstMark = sampleMarks[0]
        if (firstMark && firstMark.students && typeof firstMark.students === 'object') {
          // Get first student's marks structure to discover the generic pattern
          const firstStudentMarks = Object.values(firstMark.students)[0]
          if (firstStudentMarks && typeof firstStudentMarks === 'object') {
            // Discover the structure of student marks (marks, maxMarks, etc.)
            // This creates generic keys like marks.students.student.marks (not student-specific)
            discoverFields(firstStudentMarks, 'marks.students.student')
            
            // Also create direct access keys for easier use
            if (firstStudentMarks.marks !== undefined) {
              discoveredFields.add('marks')
              if (!fieldSamples['marks']) fieldSamples['marks'] = firstStudentMarks.marks
            }
            if (firstStudentMarks.maxMarks !== undefined) {
              discoveredFields.add('maxMarks')
              if (!fieldSamples['maxMarks']) fieldSamples['maxMarks'] = firstStudentMarks.maxMarks
            }
          }
        }
        
        // Add direct/aliased fields for easier access (using first mark as sample)
        if (firstMark) {
          // Top-level marks fields
          if (firstMark.testId) {
            discoveredFields.add('testId')
            if (!fieldSamples['testId']) fieldSamples['testId'] = firstMark.testId
          }
          if (firstMark.subjectId) {
            discoveredFields.add('marksSubjectId')
            if (!fieldSamples['marksSubjectId']) fieldSamples['marksSubjectId'] = firstMark.subjectId
          }
          if (firstMark.classId) {
            discoveredFields.add('marksClassId')
            if (!fieldSamples['marksClassId']) fieldSamples['marksClassId'] = firstMark.classId
          }
        }
      }

      // 3. Discover fields from subjects collection
      const sampleSubjects = await subjectsCollection.find({
        managementId: session.managementId
      }).limit(50).toArray()

      if (sampleSubjects.length > 0) {
        sampleSubjects.forEach(subject => {
          discoverFields(subject, 'subject')
        })
        
        // Add direct subject fields without prefix for easier access
        const firstSubject = sampleSubjects[0]
        if (firstSubject) {
          if (firstSubject.subjectId) {
            discoveredFields.add('subjectId')
            if (!fieldSamples['subjectId']) fieldSamples['subjectId'] = firstSubject.subjectId
          }
          if (firstSubject.name) {
            discoveredFields.add('subjectName')
            if (!fieldSamples['subjectName']) fieldSamples['subjectName'] = firstSubject.name
          }
          if (firstSubject.classId) {
            discoveredFields.add('subjectClassId')
            if (!fieldSamples['subjectClassId']) fieldSamples['subjectClassId'] = firstSubject.classId
          }
        }
      }

      if (discoveredFields.size > 0) {

        // Helper function to generate label from field path
        const generateLabel = (fieldPath) => {
          return fieldPath
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).replace(/([A-Z])/g, ' $1'))
            .join(' ')
        }

        // Helper function to suggest icon based on field name
        const suggestIcon = (fieldPath) => {
          const lower = fieldPath.toLowerCase()
          if (lower.includes('name') || lower.includes('parent') || lower.includes('father') || lower.includes('mother')) return 'user'
          if (lower.includes('email')) return 'mail'
          if (lower.includes('phone')) return 'phone'
          if (lower.includes('id') || lower.includes('roll')) return 'hash'
          if (lower.includes('class') || lower.includes('school')) return 'school'
          if (lower.includes('batch') || lower.includes('section')) return 'layout'
          if (lower.includes('photo') || lower.includes('image') || lower.includes('picture')) return 'image'
          if (lower.includes('date') || lower.includes('dob') || lower.includes('birth')) return 'calendar'
          if (lower.includes('address') || lower.includes('village') || lower.includes('home')) return 'home'
          if (lower.includes('attendance')) return 'check'
          if (lower.includes('mark') || lower.includes('score') || lower.includes('grade')) return 'calculator'
          if (lower.includes('percentage') || lower.includes('percent')) return 'percent'
          if (lower.includes('rank')) return 'trophy'
          if (lower.includes('result')) return 'flag'
          return 'database'
        }

        // Create validated keys from discovered fields
        discoveredFields.forEach(dbFieldPath => {
          const sampleValue = fieldSamples[dbFieldPath]
          let dataType = 'string'
          if (sampleValue !== null && sampleValue !== undefined) {
            if (typeof sampleValue === 'number') {
              dataType = 'number'
            } else if (sampleValue instanceof Date) {
              dataType = 'date'
            } else if (Array.isArray(sampleValue)) {
              dataType = 'array'
            } else if (typeof sampleValue === 'boolean') {
              dataType = 'boolean'
            }
          }

          validatedKeys.push({
            placeholderKey: dbFieldPath,
            dbFieldPath: dbFieldPath,
            label: generateLabel(dbFieldPath),
            icon: suggestIcon(dbFieldPath),
            existsInDb: true,
            defaultValue: sampleValue !== null && sampleValue !== undefined ? String(sampleValue) : '',
            dataType: dataType,
            description: `Field from database: ${dbFieldPath}`
          })
        })

        // Sort by label for better UX
        validatedKeys.sort((a, b) => a.label.localeCompare(b.label))
      } else {
        // No data found in any collection
        return NextResponse.json({
          success: false,
          message: 'No data found. Create students, marks, or subjects first to discover database fields.',
          count: 0,
          validatedFromDb: true,
          keys: []
        })
      }
    } else {
      // If validateFromDb is false, return error - we require database validation
      return NextResponse.json({
        success: false,
        error: 'Database validation is required. Set validateFromDb to true or omit it.',
        message: 'This API only works with real database fields. Please ensure students exist in the database.'
      }, { status: 400 })
    }

    // Upsert each key
    const now = new Date()
    const operations = validatedKeys.map(key => ({
      updateOne: {
        filter: {
          placeholderKey: key.placeholderKey,
          managementId: session.managementId
        },
        update: {
          $set: {
            placeholderKey: key.placeholderKey,
            dbFieldPath: key.dbFieldPath,
            label: key.label,
            icon: key.icon,
            existsInDb: key.existsInDb,
            defaultValue: key.defaultValue,
            dataType: key.dataType,
            description: key.description,
            managementId: session.managementId,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        upsert: true
      }
    }))

    // Handle custom key sets (nested structure from field keys generator)
    if (customKeySet && typeof customKeySet === 'object') {
      const now = new Date()
      const keySetData = {
        placeholderKey: `custom_keyset_${customKeySet.name.toLowerCase().replace(/\s+/g, '_')}`,
        dbFieldPath: `custom.keyset.${customKeySet.name.toLowerCase().replace(/\s+/g, '_')}`,
        label: customKeySet.name,
        icon: 'key',
        existsInDb: false,
        defaultValue: '',
        dataType: 'object',
        description: `Custom key set: ${customKeySet.name} (Batch: ${customKeySet.batchName})`,
        managementId: session.managementId,
        keyName: customKeySet.name,
        customKeySet: customKeySet,
        updatedAt: now
      }

      if (isEdit && keySetId) {
        // Update existing key set
        const result = await collection.updateOne(
          { _id: new ObjectId(keySetId), managementId: session.managementId },
          { $set: keySetData }
        )
        
        if (result.matchedCount === 0) {
          return NextResponse.json({ error: 'Key set not found' }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          message: `Successfully updated key set "${customKeySet.name}"`,
          keySetId: keySetId
        })
      } else {
        // Create new key set
        keySetData.createdAt = now
        const result = await collection.insertOne(keySetData)
        
        return NextResponse.json({
          success: true,
          message: `Successfully saved key set "${customKeySet.name}"`,
          keySetId: result.insertedId.toString(),
          keySet: customKeySet
        })
      }
    }

    // Handle legacy custom keys (from field keys generator) - for backward compatibility
    if (customKeys && Array.isArray(customKeys) && customKeys.length > 0) {
      const now = new Date()
      const customKeyOperations = customKeys.map(key => {
        const placeholderKey = key.placeholder || `custom.${key.keyId}`
        const dbFieldPath = key.type === 'calculation' 
          ? `calculation.${key.keyId}` 
          : `custom.${key.keyId}`
        
        return {
          updateOne: {
            filter: {
              placeholderKey: placeholderKey,
              managementId: session.managementId,
              keyName: keyName
            },
            update: {
              $set: {
                placeholderKey: placeholderKey,
                dbFieldPath: dbFieldPath,
                label: key.label || key.name || 'Custom Key',
                icon: key.type === 'calculation' ? 'calculator' : 'key',
                existsInDb: false,
                defaultValue: '',
                dataType: key.type === 'calculation' ? 'number' : 'string',
                description: key.type === 'calculation' 
                  ? `Calculation key: ${key.subjectName || 'N/A'} - ${key.calculationConfig?.formula || 'N/A'}`
                  : `Custom key: ${key.label || 'N/A'}`,
                managementId: session.managementId,
                keyName: keyName,
                keyType: key.type || 'custom',
                subjectName: key.subjectName || null,
                calculationConfig: key.calculationConfig || null,
                updatedAt: now
              },
              $setOnInsert: {
                createdAt: now
              }
            },
            upsert: true
          }
        }
      })

      if (customKeyOperations.length > 0) {
        await collection.bulkWrite(customKeyOperations)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully saved ${customKeys.length} custom key(s) as "${keyName}"`,
        count: customKeys.length,
        keyName: keyName,
        keys: customKeys
      })
    }

    if (operations.length > 0) {
      await collection.bulkWrite(operations)
    }

    // Clean up old student-specific keys (keys with ObjectId patterns in the path)
    const objectIdPattern = /^[0-9a-f]{24}$/i
    const allKeys = await collection.find({
      managementId: session.managementId
    }).toArray()
    
    const keysToDelete = allKeys.filter(key => {
      const path = key.placeholderKey || key.dbFieldPath || ''
      const parts = path.split('.')
      // Check if any part of the path looks like an ObjectId (24 hex characters)
      return parts.some(part => objectIdPattern.test(part))
    })
    
    if (keysToDelete.length > 0) {
      const deleteIds = keysToDelete.map(k => k._id)
      await collection.deleteMany({
        _id: { $in: deleteIds },
        managementId: session.managementId
      })
      console.log(`[POST] Cleaned up ${keysToDelete.length} old student-specific keys`)
    }

    return NextResponse.json({
      success: true,
      message: `${validatedKeys.length} data field keys initialized/updated from database`,
      count: validatedKeys.length,
      validatedFromDb: validateFromDb,
      keys: validatedKeys
    })
  } catch (error) {
    console.error('Error initializing data field keys:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize data field keys' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/data-field-keys
 * Delete a custom key set
 */
export async function DELETE(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keySetId } = body

    if (!keySetId) {
      return NextResponse.json(
        { error: 'Key set ID is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const collection = db.collection(COLLECTIONS.DATA_FIELD_KEYS)

    const result = await collection.deleteOne({
      _id: new ObjectId(keySetId),
      managementId: session.managementId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Key set not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Key set deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting key set:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete key set' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/data-field-keys
 * Update a specific data field key mapping
 */
export async function PUT(request) {
  try {
    await initializeCollections(DB_NAME)
    
    const session = await getSession(request)
    if (!session?.managementId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, placeholderKey, dbFieldPath, label, icon, defaultValue, dataType, description } = body

    if (!id && !placeholderKey) {
      return NextResponse.json(
        { error: 'ID or placeholderKey is required' },
        { status: 400 }
      )
    }

    const db = await getDb(DB_NAME)
    const collection = db.collection(COLLECTIONS.DATA_FIELD_KEYS)

    const filter = id
      ? { _id: new ObjectId(id), managementId: session.managementId }
      : { placeholderKey, managementId: session.managementId }

    const updateData = {
      updatedAt: new Date()
    }

    if (dbFieldPath !== undefined) updateData.dbFieldPath = dbFieldPath
    if (label !== undefined) updateData.label = label
    if (icon !== undefined) updateData.icon = icon
    if (defaultValue !== undefined) updateData.defaultValue = defaultValue
    if (dataType !== undefined) updateData.dataType = dataType
    if (description !== undefined) updateData.description = description

    const result = await collection.updateOne(filter, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Data field key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Data field key updated successfully'
    })
  } catch (error) {
    console.error('Error updating data field key:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update data field key' },
      { status: 500 }
    )
  }
}
