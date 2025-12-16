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
