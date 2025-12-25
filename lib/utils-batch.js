/**
 * Utility functions for batch management
 */

/**
 * Get the current batch based on the current year
 * @returns {string} The current batch (e.g., "2024-2025")
 */
export function getCurrentBatch() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-indexed
  
  // Academic year typically starts in June/July
  // If we're in Jan-May, we're in the previous year's batch
  if (month <= 5) {
    return `${year - 1}-${year}`
  }
  return `${year}-${year + 1}`
}

/**
 * Normalize batch name by removing spaces around dashes
 * @param {string} batchName - The batch name to normalize
 * @returns {string} Normalized batch name (e.g., "Batch - 7" -> "Batch-7")
 */
export function normalizeBatchName(batchName) {
  if (!batchName) return ''
  // Remove spaces around dashes: "Batch - 7" -> "Batch-7"
  return batchName.trim().replace(/\s*-\s*/g, '-')
}

/**
 * Get the selected batch from localStorage
 * @returns {string} The selected batch name or empty string
 */
export function getSelectedBatch() {
  if (typeof window === 'undefined') {
    return ''
  }
  const batch = localStorage.getItem('selectedBatch') || ''
  // Normalize the batch name before returning
  return normalizeBatchName(batch)
}

/**
 * Build a URL with batch parameter if batch is selected
 * @param {string} baseUrl - The base URL
 * @param {Object} params - Additional query parameters
 * @returns {string} The URL with batch parameter appended
 */
export function buildUrlWithBatch(baseUrl, params = {}) {
  if (typeof window === 'undefined') {
    // Server-side: just return baseUrl with params
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.set(key, value)
      }
    })
    const queryString = searchParams.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }
  
  const batch = getSelectedBatch()
  const url = new URL(baseUrl, window.location.origin)
  
  // Add batch parameter if it exists (already normalized by getSelectedBatch)
  if (batch) {
    url.searchParams.set('batch', batch)
  }
  
  // Add other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  
  return url.pathname + url.search
}

