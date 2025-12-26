import { useState, useEffect } from 'react'
import { supabase, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getWeeklyBadgesForFamily, calculateWeeklyBadges } from '../lib/badges'
import { InlineBadges } from '../components/BadgeDisplay'
import BottomNav from '../components/BottomNav'
import './Leaderboard.css'

export default function Leaderboard() {
  const { profile, family } = useAuth()
  const [members, setMembers] = useState([])
  const [view, setView] = useState('all') // 'all' or 'week'
  const [loading, setLoading] = useState(true)
  const [weeklyBadges, setWeeklyBadges] = useState({})

  const fetchLeaderboard = async () => {
    if (!family?.id) return

    try {
      if (view === 'all') {
        // All-time leaderboard
        const { data, error } = await supabase
          .from('users')
          .select('id, name, avatar_url, points_total')
          .eq('family_id', family.id)
          .order('points_total', { ascending: false })

        if (error) throw error
        setMembers(data?.map(m => ({ ...m, points: m.points_total })) || [])
      } else {
        // Weekly leaderboard
        const weekNumber = getCurrentWeekNumber()

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('family_id', family.id)

        if (usersError) throw usersError

        // Get user IDs from family to filter completed challenges
        const familyUserIds = usersData?.map(u => u.id) || []

        // Only fetch completed challenges for family members
        const { data: completedData, error: completedError } = await supabase
          .from('completed_challenges')
          .select(`
            user_id,
            challenge:challenges(points_value)
          `)
          .eq('week_number', weekNumber)
          .in('user_id', familyUserIds)

        if (completedError) throw completedError

        // Calculate weekly points
        const weeklyPoints = {}
        completedData?.forEach(c => {
          const userId = c.user_id
          const points = c.challenge?.points_value || 0
          weeklyPoints[userId] = (weeklyPoints[userId] || 0) + points
        })

        // Merge with user data
        const membersWithPoints = usersData?.map(u => ({
          ...u,
          points: weeklyPoints[u.id] || 0,
        })) || []

        // Sort by points
        membersWithPoints.sort((a, b) => b.points - a.points)
        setMembers(membersWithPoints)

        // Calculate weekly badges (awards Gold/Silver/Bronze)
        await calculateWeeklyBadges(family.id, weekNumber)

        // Fetch weekly badges for display
        const badges = await getWeeklyBadgesForFamily(family.id, weekNumber)
        setWeeklyBadges(badges)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard()
  }, [family?.id, view])

  return (
    <div className="page leaderboard-page">
      <header className="page-header">
        <h1>Family Leaderboard</h1>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'week' ? 'active' : ''}`}
            onClick={() => setView('week')}
          >
            This Week
          </button>
          <button
            className={`toggle-btn ${view === 'all' ? 'active' : ''}`}
            onClick={() => setView('all')}
          >
            All Time
          </button>
        </div>
      </header>

      <main className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏆</span>
            <h2>No one here yet</h2>
            <p>Complete challenges to climb the leaderboard!</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {members.map((member, index) => (
              <div
                key={member.id}
                className={`leaderboard-item ${member.id === profile?.id ? 'current-user' : ''}`}
              >
                <div className="rank">
                  {index === 0 ? '👑' : index + 1}
                </div>
                <img
                  src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF6B6B&color=fff`}
                  alt={member.name}
                  className="avatar avatar-md"
                />
                <div className="member-info">
                  <span className="member-name">
                    {member.name}
                    {member.id === profile?.id && <span className="you-tag">(You)</span>}
                    {view === 'week' && weeklyBadges[member.id] && (
                      <InlineBadges badges={weeklyBadges[member.id]} />
                    )}
                  </span>
                </div>
                <div className="member-points">
                  <span className="points-badge">{member.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
