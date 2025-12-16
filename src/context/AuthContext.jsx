import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseFetch } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    checkSession()

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Small delay to allow profile creation to complete (for signup flow)
        if (event === 'SIGNED_IN') {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setFamily(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    } catch (e) {
      console.error('Session check error:', e)
      setLoading(false)
    }
  }

  async function fetchProfile(userId) {
    console.log('Fetching profile for:', userId)
    setError(null)

    try {
      // Use raw fetch instead of SDK
      const { data: profileData, error: profileError } = await supabaseFetch('users', {
        filters: [{ column: 'id', op: 'eq', value: userId }],
        single: true
      })

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        setError(profileError.message || 'Failed to fetch profile')
        setLoading(false)
        return
      }

      if (!profileData) {
        console.log('No profile found for user')
        setProfile(null)
        setFamily(null)
        setLoading(false)
        return
      }

      console.log('Profile found:', profileData)
      setProfile(profileData)

      if (profileData.family_id) {
        const { data: familyData, error: familyError } = await supabaseFetch('families', {
          filters: [{ column: 'id', op: 'eq', value: profileData.family_id }],
          single: true
        })

        if (familyError) {
          console.error('Family fetch error:', familyError)
        } else {
          console.log('Family found:', familyData)
          setFamily(familyData)
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
    setFamily(null)
  }

  async function refreshProfile() {
    if (user) {
      setLoading(true)
      await fetchProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    family,
    loading,
    error,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
