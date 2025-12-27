import { useState, useEffect } from 'react'
import { supabase, getCurrentWeekNumber } from '../lib/supabase'

/**
 * Hook to fetch weekly challenge completion stats for a user
 * @param {string} userId - The user ID to fetch stats for
 * @returns {{ weeklyCompleted: number, loading: boolean, refresh: function }}
 */
export default function useWeeklyStats(userId) {
  const [weeklyCompleted, setWeeklyCompleted] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const weekNumber = getCurrentWeekNumber()
      const { count } = await supabase
        .from('completed_challenges')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('week_number', weekNumber)

      setWeeklyCompleted(count || 0)
    } catch (err) {
      console.error('Error fetching weekly stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [userId])

  return { weeklyCompleted, loading, refresh: fetchStats }
}
