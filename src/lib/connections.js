import { supabase } from './supabase'
import { getCurrentWeekNumber } from './dateUtils'
import { isConnectionChallenge } from './connectionUtils'

// Get connection stats for a user with all family members
export async function getConnectionStats(userId, familyId) {
  try {
    // Get all family members except self
    const { data: familyMembers, error: membersError } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('family_id', familyId)
      .neq('id', userId)

    if (membersError || !familyMembers) return []

    // Get all connections (visit/call) for this user
    const { data: connections, error: connError } = await supabase
      .from('completed_challenges')
      .select(`
        target_user_id,
        week_number,
        completed_at,
        challenge:challenges!inner(title)
      `)
      .eq('user_id', userId)
      .not('target_user_id', 'is', null)
      .order('completed_at', { ascending: false })

    if (connError) return []

    // Filter to only visit/call challenges
    const visitCallConnections = connections?.filter(c =>
      isConnectionChallenge(c.challenge?.title)
    ) || []

    // Calculate stats per family member
    const currentWeek = getCurrentWeekNumber()
    const stats = familyMembers.map(member => {
      const memberConnections = visitCallConnections.filter(c => c.target_user_id === member.id)
      const totalConnections = memberConnections.length
      const lastConnection = memberConnections[0]?.completed_at
      const thisWeekConnections = memberConnections.filter(c => c.week_number === currentWeek).length

      // Calculate streak (consecutive weeks)
      const streak = calculateStreak(memberConnections, currentWeek)

      // Calculate days since last connection
      let daysSinceLastConnection = null
      if (lastConnection) {
        const lastDate = new Date(lastConnection)
        const now = new Date()
        daysSinceLastConnection = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
      }

      return {
        ...member,
        totalConnections,
        thisWeekConnections,
        lastConnection,
        daysSinceLastConnection,
        streak,
        needsReconnect: daysSinceLastConnection === null || daysSinceLastConnection > 14
      }
    })

    // Sort by days since last connection (longest first for nudges)
    stats.sort((a, b) => {
      // Never connected goes to top
      if (a.daysSinceLastConnection === null) return -1
      if (b.daysSinceLastConnection === null) return 1
      return b.daysSinceLastConnection - a.daysSinceLastConnection
    })

    return stats
  } catch (err) {
    console.error('Error getting connection stats:', err)
    return []
  }
}

// Calculate consecutive weeks of connection with a person
function calculateStreak(connections, currentWeek) {
  if (!connections || connections.length === 0) return 0

  const weeksWithConnections = new Set(connections.map(c => c.week_number))
  let streak = 0

  // Count backwards from current week
  for (let week = currentWeek; week > 0; week--) {
    if (weeksWithConnections.has(week)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

// Get family members sorted by least recently connected (for smart nudges)
export async function getLeastConnectedMembers(userId, familyId, limit = 3) {
  const stats = await getConnectionStats(userId, familyId)
  return stats.slice(0, limit)
}

// Get this week's connection progress for Round Robin badge
export async function getWeeklyConnectionProgress(userId, familyId) {
  try {
    const currentWeek = getCurrentWeekNumber()

    // Get all family members except self
    const { data: familyMembers, error: membersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('family_id', familyId)
      .neq('id', userId)

    if (membersError || !familyMembers) return { connected: 0, total: 0, members: [] }

    // Get this week's connections
    const { data: connections, error: connError } = await supabase
      .from('completed_challenges')
      .select(`
        target_user_id,
        challenge:challenges!inner(title)
      `)
      .eq('user_id', userId)
      .eq('week_number', currentWeek)
      .not('target_user_id', 'is', null)

    if (connError) return { connected: 0, total: familyMembers.length, members: [] }

    // Filter to visit/call and get unique targets
    const connectedIds = new Set()
    connections?.forEach(c => {
      if (isConnectionChallenge(c.challenge?.title) && c.target_user_id) {
        connectedIds.add(c.target_user_id)
      }
    })

    // Mark which members are connected
    const membersWithStatus = familyMembers.map(m => ({
      ...m,
      connected: connectedIds.has(m.id)
    }))

    return {
      connected: connectedIds.size,
      total: familyMembers.length,
      members: membersWithStatus,
      isComplete: connectedIds.size >= familyMembers.length
    }
  } catch (err) {
    console.error('Error getting weekly connection progress:', err)
    return { connected: 0, total: 0, members: [] }
  }
}

// Get user's rank in family for connections this week
export async function getConnectionRank(userId, familyId) {
  try {
    const currentWeek = getCurrentWeekNumber()

    // Get all family members
    const { data: familyMembers, error: membersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('family_id', familyId)

    if (membersError || !familyMembers) return null

    const userIds = familyMembers.map(m => m.id)

    // Get all connections for this week
    const { data: connections, error: connError } = await supabase
      .from('completed_challenges')
      .select(`
        user_id,
        challenge:challenges!inner(title)
      `)
      .eq('week_number', currentWeek)
      .in('user_id', userIds)
      .not('target_user_id', 'is', null)

    if (connError) return null

    // Count connections per user
    const connectionCounts = {}
    userIds.forEach(id => connectionCounts[id] = 0)

    connections?.forEach(c => {
      if (isConnectionChallenge(c.challenge?.title)) {
        connectionCounts[c.user_id] = (connectionCounts[c.user_id] || 0) + 1
      }
    })

    // Sort by count and find rank
    const sorted = Object.entries(connectionCounts)
      .sort((a, b) => b[1] - a[1])

    const rank = sorted.findIndex(([id]) => id === userId) + 1
    const userCount = connectionCounts[userId] || 0
    const topCount = sorted[0]?.[1] || 0

    return {
      rank,
      total: familyMembers.length,
      userConnections: userCount,
      topConnections: topCount,
      isTop: rank === 1 && userCount > 0
    }
  } catch (err) {
    console.error('Error getting connection rank:', err)
    return null
  }
}

// Get total all-time connections for a user
export async function getTotalConnections(userId) {
  try {
    const { count, error } = await supabase
      .from('completed_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('target_user_id', 'is', null)

    if (error) return 0
    return count || 0
  } catch (err) {
    console.error('Error getting total connections:', err)
    return 0
  }
}
