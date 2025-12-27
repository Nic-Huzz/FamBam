/**
 * Leaderboard badge calculations
 * Contains: calculateWeeklyBadges
 */

import { supabase } from '../supabase'
import { awardBadge } from './core'

/**
 * Calculate and award weekly leaderboard badges for a family
 * - Gold (1st place)
 * - Silver (2nd place)
 * - Bronze (3rd place)
 * - Most Improved (biggest improvement vs previous week)
 */
export async function calculateWeeklyBadges(familyId, weekNumber) {
  try {
    // Get all family members
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('family_id', familyId)

    if (usersError || !users) return

    const userIds = users.map(u => u.id)

    // Get completed challenges for this week
    const { data: completions, error: completionsError } = await supabase
      .from('completed_challenges')
      .select(`
        user_id,
        challenge:challenges(points_value)
      `)
      .eq('week_number', weekNumber)
      .in('user_id', userIds)

    if (completionsError) return

    // Calculate points per user
    const weeklyPoints = {}
    userIds.forEach(id => weeklyPoints[id] = 0)

    completions?.forEach(c => {
      const points = c.challenge?.points_value || 0
      weeklyPoints[c.user_id] = (weeklyPoints[c.user_id] || 0) + points
    })

    // Sort by points
    const rankings = Object.entries(weeklyPoints)
      .map(([odUserId, points]) => ({ odUserId, points }))
      .sort((a, b) => b.points - a.points)

    // Award badges to top 3 (only if they have points)
    const badgeNames = ['Gold', 'Silver', 'Bronze']
    for (let i = 0; i < Math.min(3, rankings.length); i++) {
      if (rankings[i].points > 0) {
        await awardBadge(rankings[i].odUserId, badgeNames[i], weekNumber)
      }
    }

    // Calculate Most Improved (compare to previous week)
    const prevWeek = weekNumber - 1
    const { data: prevCompletions } = await supabase
      .from('completed_challenges')
      .select(`
        user_id,
        challenge:challenges(points_value)
      `)
      .eq('week_number', prevWeek)
      .in('user_id', userIds)

    const prevWeeklyPoints = {}
    userIds.forEach(id => prevWeeklyPoints[id] = 0)

    prevCompletions?.forEach(c => {
      const points = c.challenge?.points_value || 0
      prevWeeklyPoints[c.user_id] = (prevWeeklyPoints[c.user_id] || 0) + points
    })

    // Find most improved
    let mostImproved = null
    let maxImprovement = 0

    for (const { odUserId, points } of rankings) {
      const prevPoints = prevWeeklyPoints[odUserId] || 0
      const improvement = points - prevPoints
      if (improvement > maxImprovement && points > 0) {
        maxImprovement = improvement
        mostImproved = odUserId
      }
    }

    if (mostImproved && maxImprovement > 0) {
      await awardBadge(mostImproved, 'Most Improved', weekNumber)
    }

  } catch (err) {
    console.error('Error calculating weekly badges:', err)
  }
}
