/**
 * Activity badge checks
 * Contains: checkStorytellerBadge, checkPerfectWeekBadge
 */

import { supabase } from '../supabase'
import { getWeekStartDate } from '../dateUtils'
import { awardBadge } from './core'

/**
 * Check Storyteller badge - shared 3 posts in a single week
 */
export async function checkStorytellerBadge(userId, weekNumber) {
  try {
    // Get posts created this week
    const weekStart = getWeekStartDate(weekNumber)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())

    if (!error && count >= 3) {
      await awardBadge(userId, 'Storyteller', null)
    }
  } catch (err) {
    console.error('Error checking storyteller badge:', err)
  }
}

/**
 * Check Perfect Week badge - completed every available challenge to max
 */
export async function checkPerfectWeekBadge(userId, weekNumber) {
  try {
    // Get all active challenges
    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select('id, max_completions_per_week')
      .eq('is_active', true)

    if (challengeError || !challenges) return

    // Get user's completions for this week
    const { data: completions, error: completionError } = await supabase
      .from('completed_challenges')
      .select('challenge_id')
      .eq('user_id', userId)
      .eq('week_number', weekNumber)

    if (completionError) return

    // Count completions per challenge
    const completionCounts = {}
    completions?.forEach(c => {
      completionCounts[c.challenge_id] = (completionCounts[c.challenge_id] || 0) + 1
    })

    // Check if all challenges are fully completed
    const isPerfect = challenges.every(challenge => {
      const count = completionCounts[challenge.id] || 0
      return count >= challenge.max_completions_per_week
    })

    if (isPerfect) {
      await awardBadge(userId, 'Perfect Week', weekNumber)
    }
  } catch (err) {
    console.error('Error checking perfect week badge:', err)
  }
}
