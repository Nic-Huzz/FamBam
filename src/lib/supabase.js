import { createClient } from '@supabase/supabase-js'

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
  const { method = 'GET', body, select = '*', filters = [], single = false } = options

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

// Helper to get current week number
export function getCurrentWeekNumber() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now - start
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.ceil(diff / oneWeek)
}

// Generate random invite code
export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Map post content type to challenge title
const POST_TYPE_TO_CHALLENGE = {
  'photo': 'Share a photo update',
  'video': 'Share a vlog update',
  'audio': 'Share a vlog update', // Voice notes count as vlog updates
}

// Auto-complete a challenge when posting content
export async function autoCompleteChallenge(userId, contentType, userProfile) {
  const challengeTitle = POST_TYPE_TO_CHALLENGE[contentType]
  if (!challengeTitle) return null // text posts don't auto-complete

  try {
    const weekNumber = getCurrentWeekNumber()

    // Find the challenge by title
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, points_value, max_completions_per_week')
      .eq('title', challengeTitle)
      .eq('is_active', true)
      .single()

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
      console.error('Error recording completion:', insertError)
      return null
    }

    // Calculate streak update
    const lastWeek = userProfile?.last_challenge_week
    let newStreakDays = userProfile?.streak_days || 0

    if (lastWeek === null || lastWeek === undefined) {
      newStreakDays = 1
    } else if (lastWeek === weekNumber) {
      // Already completed a challenge this week, no streak change
    } else if (lastWeek === weekNumber - 1) {
      newStreakDays += 1
    } else {
      newStreakDays = 1
    }

    // Update user points and streak
    const { error: updateError } = await supabase
      .from('users')
      .update({
        points_total: (userProfile?.points_total || 0) + challenge.points_value,
        streak_days: newStreakDays,
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
