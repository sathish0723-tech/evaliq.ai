/**
 * Get user initials from name
 * @param {string} name - User's full name
 * @returns {string} - Initials (e.g., "John Doe" -> "JD")
 */
export function getUserInitials(name) {
  if (!name || typeof name !== 'string') {
    return 'U'
  }

  const parts = name.trim().split(/\s+/)
  
  if (parts.length === 0) {
    return 'U'
  }

  if (parts.length === 1) {
    // Single name - take first 2 letters
    return parts[0].substring(0, 2).toUpperCase()
  }

  // Multiple names - take first letter of first and last name
  const firstInitial = parts[0][0]?.toUpperCase() || ''
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || ''
  
  return (firstInitial + lastInitial) || 'U'
}













