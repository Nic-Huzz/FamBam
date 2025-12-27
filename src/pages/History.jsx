import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentWeekNumber, getWeekDateRange } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import './History.css'

export default function History() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(null)

  const currentWeek = getCurrentWeekNumber()

  useEffect(() => {
    if (profile?.id) {
      fetchHistory()
    }
  }, [profile?.id])

  const fetchHistory = async () => {
    try {
      // Fetch all completed challenges for this user
      const { data: completions, error: completionsError } = await supabase
        .from('completed_challenges')
        .select(`
          id,
          week_number,
          completion_number,
          completed_at,
          challenge:challenges(id, title, icon, points_value)
        `)
        .eq('user_id', profile.id)
        .order('completed_at', { ascending: false })

      if (completionsError) throw completionsError

      // Group by week
      const weekMap = {}
      completions?.forEach(c => {
        const week = c.week_number
        if (!weekMap[week]) {
          weekMap[week] = {
            weekNumber: week,
            completions: [],
            totalPoints: 0,
            dateRange: getWeekDateRange(week),
          }
        }
        weekMap[week].completions.push(c)
        weekMap[week].totalPoints += c.challenge?.points_value || 0
      })

      // Convert to array and sort by week descending
      const weeks = Object.values(weekMap).sort((a, b) => b.weekNumber - a.weekNumber)
      setWeeklyData(weeks)

      // Auto-select most recent past week
      if (weeks.length > 0) {
        const pastWeek = weeks.find(w => w.weekNumber < currentWeek) || weeks[0]
        setSelectedWeek(pastWeek.weekNumber)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedWeekData = weeklyData.find(w => w.weekNumber === selectedWeek)

  // Calculate stats
  const totalWeeksActive = weeklyData.length
  const totalPointsEarned = weeklyData.reduce((sum, w) => sum + w.totalPoints, 0)
  const totalCompletions = weeklyData.reduce((sum, w) => sum + w.completions.length, 0)

  return (
    <div className="page history-page">
      <header className="page-header">
        <h1>Challenge History</h1>
        <p className="header-subtitle">Your progress over time</p>
      </header>

      {/* Navigation Tabs */}
      <div className="challenges-nav">
        <Link to="/challenges" className="nav-tab">This Week</Link>
        <Link to="/history" className="nav-tab active">History</Link>
        <Link to="/recap" className="nav-tab">Recap</Link>
      </div>

      <main className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : weeklyData.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎯</span>
            <h2>No history yet</h2>
            <p>Complete your first challenge to start building your streak!</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/challenges')}
            >
              Start a Challenge
            </button>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="history-stats">
              <div className="stat-item">
                <span className="stat-value">{totalWeeksActive}</span>
                <span className="stat-label">Weeks Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{totalCompletions}</span>
                <span className="stat-label">Challenges Done</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{totalPointsEarned}</span>
                <span className="stat-label">Total Points</span>
              </div>
            </div>

            {/* Week Selector */}
            <div className="week-selector">
              <h2>Select Week</h2>
              <div className="week-pills">
                {weeklyData.map(week => (
                  <button
                    key={week.weekNumber}
                    className={`week-pill ${selectedWeek === week.weekNumber ? 'active' : ''} ${week.weekNumber === currentWeek ? 'current' : ''}`}
                    onClick={() => setSelectedWeek(week.weekNumber)}
                  >
                    <span className="week-num">
                      {week.weekNumber === currentWeek ? 'This Week' : week.dateRange}
                    </span>
                    <span className="week-points">+{week.totalPoints} pts</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Week Details */}
            {selectedWeekData && (
              <div className="week-details">
                <div className="week-header">
                  <h2>
                    {selectedWeek === currentWeek ? 'This Week' : selectedWeekData.dateRange}
                  </h2>
                </div>

                <div className="week-summary card">
                  <div className="summary-row">
                    <span>Challenges Completed</span>
                    <strong>{selectedWeekData.completions.length}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Points Earned</span>
                    <strong className="points">+{selectedWeekData.totalPoints}</strong>
                  </div>
                </div>

                <h3>Completed Challenges</h3>
                <div className="completions-list">
                  {selectedWeekData.completions.map(completion => (
                    <div key={completion.id} className="completion-item card">
                      <span className="completion-icon">{completion.challenge?.icon}</span>
                      <div className="completion-info">
                        <span className="completion-title">{completion.challenge?.title}</span>
                        <span className="completion-date">
                          {new Date(completion.completed_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <span className="completion-points">+{completion.challenge?.points_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
