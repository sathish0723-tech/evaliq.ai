/**
 * Script to fix batch data issues in the database
 * - Ensures all batches from students are in the batches collection
 * - Normalizes batch names (e.g., "4" -> "Batch-4")
 * - Cleans up invalid batch data
 * Usage: node scripts/fix-batches.js
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority'

const DB_NAME = 'student_management'

async function fixBatches() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = await MongoClient.connect(MONGODB_URI)
    const db = client.db(DB_NAME)
    
    const studentsCollection = db.collection('students')
    const batchesCollection = db.collection('batches')
    
    console.log('\n=== Fixing Batch Data ===\n')
    
    // Get all unique management IDs
    const managementIds = await studentsCollection.distinct('managementId')
    console.log(`Found ${managementIds.length} management(s)`)
    
    for (const managementId of managementIds) {
      console.log(`\n--- Processing Management: ${managementId} ---`)
      
      // Get all unique batches from students
      const studentBatches = await studentsCollection.distinct('batch', {
        managementId: managementId,
        batch: { $exists: true, $ne: '' }
      })
      
      console.log(`Found ${studentBatches.length} unique batch(es) in students:`)
      studentBatches.forEach(b => console.log(`  - "${b}"`))
      
      // Normalize batch names and ensure they're in batches collection
      const normalizedBatches = new Set()
      
      for (const batch of studentBatches) {
        let normalizedBatch = batch.trim()
        
        // Normalize batch names
        // Remove spaces around dashes (e.g., "Batch - 5" -> "Batch-5")
        normalizedBatch = normalizedBatch.replace(/\s*-\s*/g, '-')
        
        // If it's just a number, add "Batch-" prefix
        if (/^\d+$/.test(normalizedBatch)) {
          normalizedBatch = `Batch-${normalizedBatch}`
        } else if (!normalizedBatch.startsWith('Batch-')) {
          // If it doesn't start with "Batch-", add it
          const numMatch = normalizedBatch.match(/(\d+)/)
          if (numMatch) {
            normalizedBatch = `Batch-${numMatch[1]}`
          }
        }
        
        normalizedBatches.add(normalizedBatch)
        
        // Check if batch exists in batches collection
        const existingBatch = await batchesCollection.findOne({
          batchName: normalizedBatch,
          managementId: managementId,
        })
        
        if (!existingBatch) {
          // Create batch in batches collection
          const now = new Date()
          await batchesCollection.insertOne({
            batchName: normalizedBatch,
            managementId: managementId,
            createdAt: now,
            updatedAt: now,
          })
          console.log(`  ✓ Created batch: "${normalizedBatch}"`)
        } else {
          console.log(`  ✓ Batch already exists: "${normalizedBatch}"`)
        }
        
        // Update students with normalized batch name if different
        if (batch !== normalizedBatch) {
          const result = await studentsCollection.updateMany(
            {
              managementId: managementId,
              batch: batch,
            },
            {
              $set: {
                batch: normalizedBatch,
                updatedAt: new Date(),
              },
            }
          )
          
          if (result.modifiedCount > 0) {
            console.log(`  ✓ Updated ${result.modifiedCount} student(s) from "${batch}" to "${normalizedBatch}"`)
          }
        }
      }
      
      // Get all batches from batches collection for this management
      const dbBatches = await batchesCollection
        .find({ managementId: managementId })
        .toArray()
      
      console.log(`\nTotal batches in batches collection: ${dbBatches.length}`)
      
      // Check for orphaned batches and normalize existing batch names
      for (const dbBatch of dbBatches) {
        let normalizedName = dbBatch.batchName.trim()
        // Remove spaces around dashes
        normalizedName = normalizedName.replace(/\s*-\s*/g, '-')
        
        const studentCount = await studentsCollection.countDocuments({
          managementId: managementId,
          batch: dbBatch.batchName,
        })
        
        // Check if normalized name matches any students
        const normalizedStudentCount = await studentsCollection.countDocuments({
          managementId: managementId,
          batch: normalizedName,
        })
        
        // If batch name needs normalization
        if (dbBatch.batchName !== normalizedName) {
          // Check if normalized batch already exists
          const existingNormalized = await batchesCollection.findOne({
            batchName: normalizedName,
            managementId: managementId,
          })
          
          if (existingNormalized) {
            // Update students to use normalized name
            await studentsCollection.updateMany(
              {
                managementId: managementId,
                batch: dbBatch.batchName,
              },
              {
                $set: {
                  batch: normalizedName,
                  updatedAt: new Date(),
                },
              }
            )
            // Delete the old batch with spaces
            await batchesCollection.deleteOne({ _id: dbBatch._id })
            console.log(`  ✓ Normalized batch "${dbBatch.batchName}" -> "${normalizedName}"`)
          } else {
            // Update batch name in batches collection
            await batchesCollection.updateOne(
              { _id: dbBatch._id },
              {
                $set: {
                  batchName: normalizedName,
                  updatedAt: new Date(),
                },
              }
            )
            // Update students
            await studentsCollection.updateMany(
              {
                managementId: managementId,
                batch: dbBatch.batchName,
              },
              {
                $set: {
                  batch: normalizedName,
                  updatedAt: new Date(),
                },
              }
            )
            console.log(`  ✓ Normalized batch "${dbBatch.batchName}" -> "${normalizedName}"`)
          }
        } else if (studentCount === 0) {
          console.log(`  ⚠ Batch "${dbBatch.batchName}" has no students (orphaned)`)
        }
      }
      
      // Summary
      const allBatches = await batchesCollection
        .find({ managementId: managementId })
        .sort({ batchName: 1 })
        .toArray()
      
      console.log(`\nFinal batch list for management ${managementId}:`)
      for (const b of allBatches) {
        const studentCount = await studentsCollection.countDocuments({
          managementId: managementId,
          batch: b.batchName,
        })
        console.log(`  - ${b.batchName}: ${studentCount} student(s)`)
      }
    }
    
    console.log('\n=== Batch Data Fix Complete ===\n')
    
  } catch (error) {
    console.error('Error fixing batches:', error)
    throw error
  } finally {
    if (client) {
      await client.close()
      console.log('MongoDB connection closed')
    }
  }
}

// Run the script
fixBatches()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

