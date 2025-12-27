/**
 * Canonical date utilities for FamBam
 * Single source of truth for all week/date calculations
 *
 * Uses fixed epoch of Jan 1, 2024 for stable week numbering
 */

// Fixed epoch - do not change (all historical data depends on this)
const EPOCH = new Date('2024-01-01T00:00:00Z')

/**
 * Get the current week number (from epoch)
 */
export function getCurrentWeekNumber() {
  const now = new Date()
  const diff = now - EPOCH
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.ceil(diff / oneWeek)
}

/**
 * Get the start date of a given week number
 */
export function getWeekStartDate(weekNumber) {
  const daysToAdd = (weekNumber - 1) * 7
  const weekStart = new Date(EPOCH)
  weekStart.setUTCDate(EPOCH.getUTCDate() + daysToAdd)
  return weekStart
}

/**
 * Get the end date of a given week number (Sunday 23:59:59)
 */
export function getWeekEndDate(weekNumber) {
  const weekStart = getWeekStartDate(weekNumber)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)
  return weekEnd
}

/**
 * Get a formatted date range string for display
 * e.g., "Dec 23 - Dec 29"
 */
export function getWeekDateRange(weekNumber) {
  const startDate = getWeekStartDate(weekNumber)
  const endDate = getWeekEndDate(weekNumber)

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function timeAgo(date) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
