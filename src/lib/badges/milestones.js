/**
 * Milestone badge checks
 * Contains: checkMilestoneBadges, checkStreakBadge, checkComebackBadge
 */

import { awardBadge } from './core'

/**
 * Check and award milestone badges based on points
 * - Century Club (100 points)
 * - High Roller (500 points)
 * - Legend (1000 points)
 */
export async function checkMilestoneBadges(userId, pointsTotal) {
  const thresholds = [
    { name: 'Century Club', points: 100 },
    { name: 'High Roller', points: 500 },
    { name: 'Legend', points: 1000 },
  ]

  for (const threshold of thresholds) {
    if (pointsTotal >= threshold.points) {
      await awardBadge(userId, threshold.name, null)
    }
  }
}

/**
 * Check and award streak badge
 * - Streak Master (4+ consecutive weeks)
 */
export async function checkStreakBadge(userId, streakWeeks) {
  if (streakWeeks >= 4) {
    await awardBadge(userId, 'Streak Master', null)
  }
}

/**
 * Check and award comeback badge
 * - Comeback Kid (missed at least one week and came back)
 */
export async function checkComebackBadge(userId, lastChallengeWeek, currentWeek) {
  if (lastChallengeWeek && currentWeek - lastChallengeWeek > 1) {
    await awardBadge(userId, 'Comeback Kid', null)
  }
}
