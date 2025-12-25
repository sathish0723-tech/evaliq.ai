import { getManagementCollection, DB_NAME } from '@/lib/db/collections'

/**
 * Generate a unique management ID
 * Format: mgmt_ followed by random alphanumeric string
 */
export async function generateManagementId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let managementId
  let isUnique = false
  const managementCollection = await getManagementCollection(DB_NAME)

  while (!isUnique) {
    // Generate random 12-character string
    managementId = 'mgmt_' + Array.from({ length: 12 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    // Check if it already exists
    const existing = await managementCollection.findOne({ managementId })
    if (!existing) {
      isUnique = true
    }
  }

  return managementId
}

/**
 * Extract email domain from email address
 * @param {string} email - Email address
 * @returns {string} - Domain (e.g., 'company.com')
 */
export function extractEmailDomain(email) {
  if (!email || !email.includes('@')) {
    return null
  }
  return email.split('@')[1].toLowerCase()
}

