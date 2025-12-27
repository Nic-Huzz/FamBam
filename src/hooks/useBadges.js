import { useState, useEffect } from 'react'
import { getUserBadges } from '../lib/badges'

/**
 * Hook to fetch badges for a user
 * @param {string} userId - The user ID to fetch badges for
 * @returns {{ badges: array, loading: boolean, refresh: function }}
 */
export default function useBadges(userId) {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBadges = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await getUserBadges(userId)
      setBadges(result)
    } catch (err) {
      console.error('Error fetching badges:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBadges()
  }, [userId])

  return { badges, loading, refresh: fetchBadges }
}
