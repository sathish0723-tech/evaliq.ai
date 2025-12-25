// Legacy file - redirects to new location
// This file is kept for backward compatibility
// New code should use @/lib/db/collections instead

export { 
  getDb, 
  getUsersCollection, 
  getManagementCollection,
  DB_NAME,
  COLLECTIONS,
  initializeCollections
} from '@/lib/db/collections'

export { default as clientPromise } from '@/lib/db/connection'
