/**
 * Badge system entry point
 * Re-exports all badge functions for backward compatibility
 */

import { getCurrentWeekNumber } from '../dateUtils'
import { isConnectionChallenge } from '../connectionUtils'

// Re-export core utilities
export { BADGE_ICONS, awardBadge, getUserBadges, getWeeklyBadgesForFamily } from './core'

// Re-export milestone badge checks
export { checkMilestoneBadges, checkStreakBadge, checkComebackBadge } from './milestones'

// Re-export activity badge checks
export { checkStorytellerBadge, checkPerfectWeekBadge } from './activity'

// Re-export connection badge checks
export {
  checkVisitorBadge,
  checkConnectorBadge,
  checkRoundRobinBadge,
  checkBridgeBuilderBadge,
  checkInnerCircleBadge
} from './connections'

// Re-export leaderboard calculations
export { calculateWeeklyBadges } from './leaderboard'

// Import for use in checkAllBadges
import { checkMilestoneBadges, checkStreakBadge, checkComebackBadge } from './milestones'
import { checkStorytellerBadge, checkPerfectWeekBadge } from './activity'
import {
  checkVisitorBadge,
  checkConnectorBadge,
  checkRoundRobinBadge,
  checkBridgeBuilderBadge,
  checkInnerCircleBadge
} from './connections'
import { calculateWeeklyBadges } from './leaderboard'

/**
 * Check all badges after a challenge completion
 * This is the main orchestrator function called after completing a challenge
 */
export async function checkAllBadges(userId, profile, familyId, challengeTitle = null, targetUserId = null) {
  const weekNumber = getCurrentWeekNumber()

  // Check milestone badges
  await checkMilestoneBadges(userId, profile.points_total || 0)

  // Check streak badge
  await checkStreakBadge(userId, profile.streak_days || 0)

  // Check comeback badge
  await checkComebackBadge(userId, profile.last_challenge_week, weekNumber)

  // Check Storyteller badge (posts per week)
  await checkStorytellerBadge(userId, weekNumber)

  // Check Visitor and Connector badges for visit/call challenges
  if (challengeTitle) {
    const title = challengeTitle.toLowerCase()
    if (title.includes('visit')) {
      await checkVisitorBadge(userId)
    }
    if (title.includes('call')) {
      await checkConnectorBadge(userId)
    }

    // Check connection-based badges for visit/call
    if (isConnectionChallenge(challengeTitle)) {
      // Round Robin - connected with everyone this week
      await checkRoundRobinBadge(userId, familyId, weekNumber)

      // Inner Circle - 4 week streak with same person
      if (targetUserId) {
        await checkInnerCircleBadge(userId, targetUserId)
      }

      // Bridge Builder - most connected in family
      await checkBridgeBuilderBadge(familyId, weekNumber)
    }
  }

  // Check Perfect Week badge
  await checkPerfectWeekBadge(userId, weekNumber)

  // Calculate weekly badges for the family
  await calculateWeeklyBadges(familyId, weekNumber)
}
