import { supabase, getCurrentWeekNumber } from './supabase'

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

// Check and award milestone badges based on points
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

// Check and award streak badge
export async function checkStreakBadge(userId, streakWeeks) {
  if (streakWeeks >= 4) {
    await awardBadge(userId, 'Streak Master', null)
  }
}

// Check and award comeback badge
export async function checkComebackBadge(userId, lastChallengeWeek, currentWeek) {
  // If they missed at least one week and came back
  if (lastChallengeWeek && currentWeek - lastChallengeWeek > 1) {
    await awardBadge(userId, 'Comeback Kid', null)
  }
}

// Check Storyteller badge - shared 3 posts in a single week
export async function checkStorytellerBadge(userId, weekNumber) {
  try {
    // Get posts created this week (using week_number from timestamp)
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

// Check Visitor badge - visited 3 different family members (all-time)
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

// Check Connector badge - called 5 different family members (all-time)
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

// Check Perfect Week badge - completed every available challenge
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

// Helper to get week start date from week number
function getWeekStartDate(weekNumber) {
  // Week number is calculated from a fixed epoch (Jan 1, 2024)
  const epoch = new Date('2024-01-01T00:00:00Z')
  const daysToAdd = (weekNumber - 1) * 7
  const weekStart = new Date(epoch)
  weekStart.setDate(epoch.getDate() + daysToAdd)
  return weekStart
}

// Check Round Robin badge - connected with every family member in one week
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
    const visitCallConnections = connections?.filter(c => {
      const title = c.challenge?.title?.toLowerCase() || ''
      return title.includes('visit') || title.includes('call')
    }) || []

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

// Check Bridge Builder badge - most connected person in the family this week
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
      const title = c.challenge?.title?.toLowerCase() || ''
      if (title.includes('visit') || title.includes('call')) {
        connectionCounts[c.user_id] = (connectionCounts[c.user_id] || 0) + 1
      }
    })

    // Find the user with most connections
    let mostConnected = null
    let maxConnections = 0

    for (const [userId, count] of Object.entries(connectionCounts)) {
      if (count > maxConnections) {
        maxConnections = count
        mostConnected = userId
      }
    }

    if (mostConnected && maxConnections > 0) {
      await awardBadge(mostConnected, 'Bridge Builder', weekNumber)
    }
  } catch (err) {
    console.error('Error checking bridge builder badge:', err)
  }
}

// Check Inner Circle badge - connected with same person 4 weeks in a row
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
      const title = c.challenge?.title?.toLowerCase() || ''
      if (title.includes('visit') || title.includes('call')) {
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

// Award a badge to a user (handles duplicates gracefully)
export async function awardBadge(userId, badgeName, weekNumber) {
  try {
    // Get badge ID
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('id')
      .eq('name', badgeName)
      .single()

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

// Calculate and award weekly leaderboard badges for a family
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
      .map(([userId, points]) => ({ userId, points }))
      .sort((a, b) => b.points - a.points)

    // Award badges to top 3 (only if they have points)
    const badgeNames = ['Gold', 'Silver', 'Bronze']
    for (let i = 0; i < Math.min(3, rankings.length); i++) {
      if (rankings[i].points > 0) {
        await awardBadge(rankings[i].userId, badgeNames[i], weekNumber)
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

    for (const { userId, points } of rankings) {
      const prevPoints = prevWeeklyPoints[userId] || 0
      const improvement = points - prevPoints
      if (improvement > maxImprovement && points > 0) {
        maxImprovement = improvement
        mostImproved = userId
      }
    }

    if (mostImproved && maxImprovement > 0) {
      await awardBadge(mostImproved, 'Most Improved', weekNumber)
    }

  } catch (err) {
    console.error('Error calculating weekly badges:', err)
  }
}

// Get all badges for a user
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

    return data || []
  } catch (err) {
    console.error('Error getting user badges:', err)
    return []
  }
}

// Get weekly badges for current week for a family (for leaderboard display)
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

// Check all badges after a challenge completion
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
    if (title.includes('visit') || title.includes('call')) {
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
