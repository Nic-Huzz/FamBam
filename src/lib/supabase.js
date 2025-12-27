import { createClient } from '@supabase/supabase-js'
import { getCurrentWeekNumber } from './dateUtils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found.')
}

// Create client with explicit options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'fambam-web'
    }
  }
})

// Raw fetch helper that bypasses SDK (for when SDK hangs)
export async function supabaseFetch(table, options = {}) {
  const { method = 'GET', body, select = '*', filters = [], single = false, order, limit } = options

  // Get access token from localStorage
  const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
  const stored = localStorage.getItem(storageKey)
  const session = stored ? JSON.parse(stored) : null
  const accessToken = session?.access_token || supabaseAnonKey

  let url = `${supabaseUrl}/rest/v1/${table}?select=${select}`

  // Add filters
  filters.forEach(f => {
    url += `&${f.column}=${f.op}.${f.value}`
  })

  // Add ordering
  if (order) {
    const direction = order.ascending ? 'asc' : 'desc'
    url += `&order=${order.column}.${direction}`
  }

  // Add limit
  if (limit) {
    url += `&limit=${limit}`
  }

  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation'
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await response.json()

  if (!response.ok) {
    return { data: null, error: data }
  }

  return {
    data: single ? (data[0] || null) : data,
    error: null
  }
}

// Re-export for backward compatibility (imported at top of file)
export { getCurrentWeekNumber }

// Generate random invite code
export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Calculate streak from completed_challenges history
// Returns the number of consecutive days with activity, counting back from today
export async function calculateStreakFromHistory(userId) {
  try {
    // Fetch all completed challenges for this user, ordered by date
    const { data, error } = await supabase
      .from('completed_challenges')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return 1 // First activity
    }

    // Get unique dates (in local timezone)
    const uniqueDates = [...new Set(
      data.map(c => new Date(c.completed_at).toLocaleDateString('en-CA'))
    )].sort().reverse() // Most recent first

    if (uniqueDates.length === 0) return 1

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toLocaleDateString('en-CA')

    // Check if the most recent activity is today or yesterday
    const mostRecentDate = uniqueDates[0]
    const mostRecent = new Date(mostRecentDate)
    mostRecent.setHours(0, 0, 0, 0)

    const daysSinceMostRecent = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24))

    // If most recent activity is more than 1 day ago, streak is broken
    if (daysSinceMostRecent > 1) {
      return 1
    }

    // Count consecutive days going backwards
    let streak = 0
    let checkDate = daysSinceMostRecent === 0 ? today : new Date(today.getTime() - 24 * 60 * 60 * 1000)

    for (const dateStr of uniqueDates) {
      const checkDateStr = checkDate.toLocaleDateString('en-CA')

      if (dateStr === checkDateStr) {
        streak++
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000) // Go back one day
      } else if (dateStr < checkDateStr) {
        // Missed a day, streak ends
        break
      }
      // If dateStr > checkDateStr, skip (multiple completions on same day)
    }

    return Math.max(streak, 1)
  } catch (err) {
    console.error('Error calculating streak from history:', err)
    return 1
  }
}

// Map post content type to challenge title
const POST_TYPE_TO_CHALLENGE = {
  'photo': 'Share a photo update',
  'video': 'Share a vlog update',
  'audio': 'Share a vlog update', // Voice notes count as vlog updates
}

// Auto-complete a challenge when posting content
// If isChallengeTitle is true, contentTypeOrTitle is treated as the challenge title directly
export async function autoCompleteChallenge(userId, contentTypeOrTitle, userProfile, isChallengeTitle = false) {
  const challengeTitle = isChallengeTitle ? contentTypeOrTitle : POST_TYPE_TO_CHALLENGE[contentTypeOrTitle]
  if (!challengeTitle) return null // text posts don't auto-complete

  try {
    const weekNumber = getCurrentWeekNumber()

    // Find the challenge by title (use limit(1) to handle duplicates gracefully)
    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select('id, points_value, max_completions_per_week')
      .eq('title', challengeTitle)
      .eq('is_active', true)
      .limit(1)

    const challenge = challenges?.[0]
    if (challengeError || !challenge) {
      console.log('Challenge not found:', challengeTitle)
      return null
    }

    // Check how many times already completed this week
    const { data: completions, error: countError } = await supabase
      .from('completed_challenges')
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .eq('week_number', weekNumber)

    if (countError) {
      console.error('Error checking completions:', countError)
      return null
    }

    const currentCount = completions?.length || 0

    // Check if already at max completions for the week
    if (currentCount >= challenge.max_completions_per_week) {
      console.log('Challenge already maxed out this week')
      return null
    }

    // Record the completion
    const { error: insertError } = await supabase
      .from('completed_challenges')
      .insert({
        user_id: userId,
        challenge_id: challenge.id,
        week_number: weekNumber,
        completion_number: currentCount + 1,
      })

    if (insertError) {
      // If it's a unique constraint violation, the challenge was already completed
      if (insertError.code === '23505') {
        console.log('Challenge already completed this time')
        return null
      }
      // For RLS or other errors, log but don't block
      console.error('Error recording completion:', insertError)
      return null
    }

    // Calculate daily streak update
    const lastActive = userProfile?.last_active ? new Date(userProfile.last_active) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let newStreakDays = userProfile?.streak_days || 0

    if (!lastActive) {
      // No last_active - calculate from history
      newStreakDays = await calculateStreakFromHistory(userId)
    } else {
      const lastActiveDay = new Date(lastActive)
      lastActiveDay.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor((today - lastActiveDay) / (1000 * 60 * 60 * 24))

      if (daysDiff === 0) {
        // Already active today, no streak change
      } else if (daysDiff === 1) {
        // Active yesterday, increment streak
        newStreakDays += 1
      } else if (daysDiff > 1) {
        // last_active is stale - recalculate from history instead of resetting
        newStreakDays = await calculateStreakFromHistory(userId)
      }
    }

    // Update user points, streak, and last_active
    const { error: updateError } = await supabase
      .from('users')
      .update({
        points_total: (userProfile?.points_total || 0) + challenge.points_value,
        streak_days: newStreakDays,
        last_active: new Date().toISOString(),
        last_challenge_week: weekNumber
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user points:', updateError)
    }

    return {
      challengeTitle,
      pointsEarned: challenge.points_value,
    }
  } catch (err) {
    console.error('Error auto-completing challenge:', err)
    return null
  }
}
