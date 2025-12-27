/**
 * Core badge utilities
 * Contains: awardBadge, getUserBadges, getWeeklyBadgesForFamily, BADGE_ICONS
 */

import { supabase } from '../supabase'

// Badge definitions (should match database)
export const BADGE_ICONS = {
  'Gold': '🥇',
  'Silver': '🥈',
  'Bronze': '🥉',
  'Most Improved': '📈',
  'Century Club': '💯',
  'High Roller': '🎰',
  'Legend': '👑',
  'Streak Master': '🔥',
  'Comeback Kid': '💪',
  'Storyteller': '📖',
  'Visitor': '🏠',
  'Connector': '📞',
  'Perfect Week': '⭐',
  'Round Robin': '🎯',
  'Bridge Builder': '🌉',
  'Inner Circle': '💫',
}

/**
 * Award a badge to a user (handles duplicates gracefully)
 */
export async function awardBadge(userId, badgeName, weekNumber) {
  try {
    // Get badge ID (use limit(1) to handle duplicates gracefully)
    const { data: badges, error: badgeError } = await supabase
      .from('badges')
      .select('id')
      .eq('name', badgeName)
      .limit(1)

    const badge = badges?.[0]
    if (badgeError || !badge) {
      console.log('Badge not found:', badgeName)
      return false
    }

    // Try to insert (will fail silently if already exists due to unique constraint)
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.id,
        week_number: weekNumber,
      })

    if (insertError) {
      // Unique constraint violation means they already have it - that's fine
      if (insertError.code === '23505') {
        return false
      }
      console.error('Error awarding badge:', insertError)
      return false
    }

    return true // Badge was newly awarded
  } catch (err) {
    console.error('Error in awardBadge:', err)
    return false
  }
}

/**
 * Get all badges for a user (deduplicated by badge name)
 */
export async function getUserBadges(userId) {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        week_number,
        earned_at,
        badge:badges(id, name, description, icon, badge_type)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) throw error

    // Deduplicate by badge name (keep first occurrence, which is most recent due to ordering)
    const seen = new Set()
    const deduplicated = (data || []).filter(item => {
      const badgeName = item.badge?.name
      if (!badgeName || seen.has(badgeName)) return false
      seen.add(badgeName)
      return true
    })

    return deduplicated
  } catch (err) {
    console.error('Error getting user badges:', err)
    return []
  }
}

/**
 * Get weekly badges for current week for a family (for leaderboard display)
 */
export async function getWeeklyBadgesForFamily(familyId, weekNumber) {
  try {
    // Get family members
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('family_id', familyId)

    if (!users) return {}

    const userIds = users.map(u => u.id)

    // Get weekly badges
    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select(`
        user_id,
        badge:badges(name, icon)
      `)
      .eq('week_number', weekNumber)
      .in('user_id', userIds)

    if (error) throw error

    // Group by user_id
    const badgesByUser = {}
    userBadges?.forEach(ub => {
      if (!badgesByUser[ub.user_id]) {
        badgesByUser[ub.user_id] = []
      }
      badgesByUser[ub.user_id].push(ub.badge)
    })

    return badgesByUser
  } catch (err) {
    console.error('Error getting weekly badges:', err)
    return {}
  }
}
