/**
 * Connection badge checks
 * Contains: checkVisitorBadge, checkConnectorBadge, checkRoundRobinBadge,
 *           checkBridgeBuilderBadge, checkInnerCircleBadge
 */

import { supabase } from '../supabase'
import { getCurrentWeekNumber } from '../dateUtils'
import { isConnectionChallenge } from '../connectionUtils'
import { awardBadge } from './core'

/**
 * Check Visitor badge - visited 3 different family members (all-time)
 */
export async function checkVisitorBadge(userId) {
  try {
    // Get unique target_user_ids from visit challenges
    const { data: visits, error } = await supabase
      .from('completed_challenges')
      .select(`
        target_user_id,
        challenge:challenges!inner(title)
      `)
      .eq('user_id', userId)
      .not('target_user_id', 'is', null)
      .ilike('challenge.title', '%visit%')

    if (error) return

    // Count unique targets
    const uniqueTargets = new Set(visits?.map(v => v.target_user_id).filter(Boolean))
    if (uniqueTargets.size >= 3) {
      await awardBadge(userId, 'Visitor', null)
    }
  } catch (err) {
    console.error('Error checking visitor badge:', err)
  }
}

/**
 * Check Connector badge - called 5 different family members (all-time)
 */
export async function checkConnectorBadge(userId) {
  try {
    // Get unique target_user_ids from call challenges
    const { data: calls, error } = await supabase
      .from('completed_challenges')
      .select(`
        target_user_id,
        challenge:challenges!inner(title)
      `)
      .eq('user_id', userId)
      .not('target_user_id', 'is', null)
      .ilike('challenge.title', '%call%')

    if (error) return

    // Count unique targets
    const uniqueTargets = new Set(calls?.map(c => c.target_user_id).filter(Boolean))
    if (uniqueTargets.size >= 5) {
      await awardBadge(userId, 'Connector', null)
    }
  } catch (err) {
    console.error('Error checking connector badge:', err)
  }
}

/**
 * Check Round Robin badge - connected with every family member in one week
 */
export async function checkRoundRobinBadge(userId, familyId, weekNumber) {
  try {
    // Get all family members except self
    const { data: familyMembers, error: membersError } = await supabase
      .from('users')
      .select('id')
      .eq('family_id', familyId)
      .neq('id', userId)

    if (membersError || !familyMembers || familyMembers.length === 0) return

    const familyMemberIds = new Set(familyMembers.map(m => m.id))

    // Get unique target_user_ids from this week's visit/call challenges
    const { data: connections, error: connError } = await supabase
      .from('completed_challenges')
      .select(`
        target_user_id,
        challenge:challenges!inner(title)
      `)
      .eq('user_id', userId)
      .eq('week_number', weekNumber)
      .not('target_user_id', 'is', null)

    if (connError) return

    // Filter to only visit/call challenges
    const visitCallConnections = connections?.filter(c =>
      isConnectionChallenge(c.challenge?.title)
    ) || []

    const connectedIds = new Set(visitCallConnections.map(c => c.target_user_id).filter(Boolean))

    // Check if connected with ALL family members
    const allConnected = [...familyMemberIds].every(id => connectedIds.has(id))

    if (allConnected) {
      await awardBadge(userId, 'Round Robin', weekNumber)
    }
  } catch (err) {
    console.error('Error checking round robin badge:', err)
  }
}

/**
 * Check Bridge Builder badge - most connected person in the family this week
 */
export async function checkBridgeBuilderBadge(familyId, weekNumber) {
  try {
    // Get all family members
    const { data: familyMembers, error: membersError } = await supabase
      .from('users')
      .select('id')
      .eq('family_id', familyId)

    if (membersError || !familyMembers) return

    const userIds = familyMembers.map(m => m.id)

    // Get all connections (visit/call) for this week
    const { data: connections, error: connError } = await supabase
      .from('completed_challenges')
      .select(`
        user_id,
        target_user_id,
        challenge:challenges!inner(title)
      `)
      .eq('week_number', weekNumber)
      .in('user_id', userIds)
      .not('target_user_id', 'is', null)

    if (connError) return

    // Filter to only visit/call and count per user
    const connectionCounts = {}
    connections?.forEach(c => {
      if (isConnectionChallenge(c.challenge?.title)) {
        connectionCounts[c.user_id] = (connectionCounts[c.user_id] || 0) + 1
      }
    })

    // Find the user with most connections
    let mostConnected = null
    let maxConnections = 0

    for (const [odUserId, count] of Object.entries(connectionCounts)) {
      if (count > maxConnections) {
        maxConnections = count
        mostConnected = odUserId
      }
    }

    if (mostConnected && maxConnections > 0) {
      await awardBadge(mostConnected, 'Bridge Builder', weekNumber)
    }
  } catch (err) {
    console.error('Error checking bridge builder badge:', err)
  }
}

/**
 * Check Inner Circle badge - connected with same person 4 weeks in a row
 */
export async function checkInnerCircleBadge(userId, targetUserId) {
  if (!targetUserId) return

  try {
    const currentWeek = getCurrentWeekNumber()

    // Check the last 4 weeks for connections with this target
    const weeksToCheck = [currentWeek, currentWeek - 1, currentWeek - 2, currentWeek - 3]

    const { data: connections, error } = await supabase
      .from('completed_challenges')
      .select(`
        week_number,
        challenge:challenges!inner(title)
      `)
      .eq('user_id', userId)
      .eq('target_user_id', targetUserId)
      .in('week_number', weeksToCheck)

    if (error) return

    // Filter to visit/call and get unique weeks
    const connectedWeeks = new Set()
    connections?.forEach(c => {
      if (isConnectionChallenge(c.challenge?.title)) {
        connectedWeeks.add(c.week_number)
      }
    })

    // Check if all 4 weeks have connections
    const hasStreak = weeksToCheck.every(week => connectedWeeks.has(week))

    if (hasStreak) {
      await awardBadge(userId, 'Inner Circle', null)
    }
  } catch (err) {
    console.error('Error checking inner circle badge:', err)
  }
}
