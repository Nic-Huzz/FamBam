import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Debug() {
  const [output, setOutput] = useState('')

  // Check env vars immediately
  const envCheck = {
    url: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
    keyPrefix: import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20) || 'NOT SET'
  }

  const log = (msg) => {
    const text = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg)
    console.log(text)
    setOutput(prev => prev + text + '\n')
  }

  const testSession = async () => {
    setOutput('')
    log('Testing session...')

    const result = await supabase.auth.getSession()
    log('Result:')
    log(result)
  }

  const testTable = async (table) => {
    setOutput('')
    log(`Testing ${table} table...`)

    const result = await supabase.from(table).select('*').limit(3)
    log('Result:')
    log(result)
  }

  const createProfileAndFamily = async () => {
    setOutput('')
    log('Creating profile and family...')

    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    // Get session from localStorage
    const storageKey = `sb-${url.split('//')[1].split('.')[0]}-auth-token`
    const stored = localStorage.getItem(storageKey)

    if (!stored) {
      log('ERROR: No session found in localStorage')
      log('Storage key checked: ' + storageKey)
      return
    }

    const session = JSON.parse(stored)
    const userId = session.user?.id
    const userEmail = session.user?.email
    const accessToken = session.access_token

    if (!userId) {
      log('ERROR: No user ID in session')
      log(session)
      return
    }

    log('User ID: ' + userId)
    log('Email: ' + userEmail)

    try {
      // Create family first
      const familyCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      log('Creating family with code: ' + familyCode)

      const familyRes = await fetch(`${url}/rest/v1/families`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: 'My Family',
          invite_code: familyCode
        })
      })

      log('Family response status: ' + familyRes.status)
      const familyData = await familyRes.json()
      log('Family data: ' + JSON.stringify(familyData))

      if (!familyRes.ok) {
        log('ERROR creating family')
        return
      }

      const familyId = familyData[0]?.id
      log('Family ID: ' + familyId)

      // Create user profile
      log('Creating user profile...')
      const userRes = await fetch(`${url}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0],
          family_id: familyId,
          points_total: 0,
          streak_days: 0
        })
      })

      log('User response status: ' + userRes.status)
      const userData = await userRes.json()
      log('User data: ' + JSON.stringify(userData))

      if (userRes.ok) {
        log('')
        log('SUCCESS! Now click "Go to Feed"')
      }

    } catch (e) {
      log('Error: ' + e.message)
    }
  }

  const testRawFetch = async (table = 'challenges') => {
    setOutput('')
    log(`Testing raw fetch to ${table}...`)

    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    try {
      const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=3`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      })

      log('Status: ' + response.status)
      const data = await response.json()
      log('Data:')
      log(data)
    } catch (e) {
      log('Fetch error: ' + e.message)
    }
  }

  const style = {
    container: { padding: 20, fontFamily: 'monospace', background: '#1a1a1a', color: '#0f0', minHeight: '100vh' },
    btn: { padding: '10px 16px', margin: 4, fontSize: 14, cursor: 'pointer', background: '#333', color: '#0f0', border: '1px solid #0f0' },
    output: { background: '#000', padding: 16, marginTop: 20, whiteSpace: 'pre-wrap', borderRadius: 8, minHeight: 200 },
    env: { background: '#222', padding: 12, borderRadius: 8, marginBottom: 16 }
  }

  return (
    <div style={style.container}>
      <h1>FamBam Debug Console</h1>

      <div style={style.env}>
        <strong>Environment Check:</strong><br/>
        URL: {envCheck.url}<br/>
        Key: {envCheck.keyPrefix}...
      </div>

      <div>
        <button style={style.btn} onClick={() => testRawFetch('challenges')}>Raw: Challenges</button>
        <button style={style.btn} onClick={() => testRawFetch('users')}>Raw: Users</button>
        <button style={style.btn} onClick={() => testRawFetch('families')}>Raw: Families</button>
        <button style={style.btn} onClick={testSession}>Test Session</button>
        <button style={style.btn} onClick={createProfileAndFamily}>Create My Profile + Family</button>
        <button style={style.btn} onClick={() => window.location.href = '/feed'}>Go to Feed</button>
      </div>

      <div style={style.output}>{output || 'Click a button to test'}</div>
    </div>
  )
}
