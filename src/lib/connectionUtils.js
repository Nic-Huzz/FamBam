/**
 * Connection challenge utilities for FamBam
 * Single source of truth for identifying visit/call challenges
 */

/**
 * Check if a challenge title indicates a connection-type challenge
 */
export function isConnectionChallenge(title) {
  if (!title) return false
  const lower = title.toLowerCase()
  return lower.includes('visit') || lower.includes('call')
}

/**
 * Get the connection type from a challenge title
 * @returns {'visit' | 'call' | null}
 */
export function getConnectionType(title) {
  if (!title) return null
  const lower = title.toLowerCase()
  if (lower.includes('visit')) return 'visit'
  if (lower.includes('call')) return 'call'
  return null
}

/**
 * Filter an array of challenges/completions to only connection types
 * Handles both challenge objects and completed_challenge objects
 */
export function filterConnectionChallenges(items) {
  return (items || []).filter(item => {
    const title = item.challenge?.title || item.title || ''
    return isConnectionChallenge(title)
  })
}

/**
 * Get the appropriate icon for a connection challenge
 */
export function getConnectionIcon(title) {
  return getConnectionType(title) === 'visit' ? '🏠' : '📞'
}

/**
 * Get the past-tense action word for a connection challenge
 */
export function getConnectionActionWord(title) {
  return getConnectionType(title) === 'visit' ? 'visited' : 'called'
}
