import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook to fetch family members
 * @param {string} familyId - The family ID to fetch members for
 * @returns {{ members: array, loading: boolean, refresh: function, setMembers: function }}
 */
export default function useFamilyMembers(familyId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = async () => {
    if (!familyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, points_total')
        .eq('family_id', familyId)
        .order('name')

      if (!error && data) {
        setMembers(data)
      }
    } catch (err) {
      console.error('Error fetching family members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [familyId])

  return { members, loading, refresh: fetchMembers, setMembers }
}
