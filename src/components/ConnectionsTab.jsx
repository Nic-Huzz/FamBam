import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getConnectionStats, getWeeklyConnectionProgress, getConnectionRank, getTotalConnections } from '../lib/connections'
import './ConnectionsTab.css'

export default function ConnectionsTab() {
  const { profile, family } = useAuth()
  const [connectionStats, setConnectionStats] = useState([])
  const [weeklyProgress, setWeeklyProgress] = useState(null)
  const [connectionRank, setConnectionRank] = useState(null)
  const [totalConnections, setTotalConnections] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id && family?.id) {
      fetchConnectionData()
    }
  }, [profile?.id, family?.id])

  const fetchConnectionData = async () => {
    try {
      const [stats, weekly, rank, total] = await Promise.all([
        getConnectionStats(profile.id, family.id),
        getWeeklyConnectionProgress(profile.id, family.id),
        getConnectionRank(profile.id, family.id),
        getTotalConnections(profile.id)
      ])

      setConnectionStats(stats)
      setWeeklyProgress(weekly)
      setConnectionRank(rank)
      setTotalConnections(total)
    } catch (err) {
      console.error('Error fetching connection data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDaysAgo = (days) => {
    if (days === null) return 'Never'
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 14) return '1 week ago'
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`
  }

  const getConnectionBarWidth = (count, maxCount) => {
    if (maxCount === 0) return 0
    return Math.min(100, (count / maxCount) * 100)
  }

  if (loading) {
    return (
      <div className="connections-tab">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  const maxConnections = Math.max(...connectionStats.map(s => s.totalConnections), 1)

  return (
    <div className="connections-tab">
      {/* Round Robin Progress */}
      {weeklyProgress && weeklyProgress.total > 0 && (
        <div className={`round-robin-card ${weeklyProgress.isComplete ? 'complete' : ''}`}>
          <div className="round-robin-header">
            <span className="round-robin-icon">
              {weeklyProgress.isComplete ? '🎯' : '🎯'}
            </span>
            <div className="round-robin-info">
              <h3>
                {weeklyProgress.isComplete
                  ? 'Round Robin Complete!'
                  : 'Connect with everyone this week'}
              </h3>
              <p className="round-robin-progress">
                {weeklyProgress.connected}/{weeklyProgress.total} family members
              </p>
            </div>
          </div>
          <div className="round-robin-members">
            {weeklyProgress.members.map(member => (
              <span
                key={member.id}
                className={`member-chip ${member.connected ? 'connected' : ''}`}
                title={member.name}
              >
                {member.connected ? '✓' : ''} {member.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Family Connections List */}
      <div className="connections-section">
        <h3 className="section-title">Family Connections</h3>

        {connectionStats.length === 0 ? (
          <div className="empty-connections">
            <span className="empty-icon">👋</span>
            <p>Start connecting with your family!</p>
            <p className="empty-hint">Complete Visit or Call challenges to track your connections.</p>
          </div>
        ) : (
          <div className="connections-list">
            {connectionStats.map(member => (
              <div key={member.id} className={`connection-item ${member.needsReconnect ? 'needs-reconnect' : ''}`}>
                <img
                  src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF6B6B&color=fff`}
                  alt={member.name}
                  className="connection-avatar"
                />
                <div className="connection-details">
                  <div className="connection-name-row">
                    <span className="connection-name">{member.name}</span>
                    {member.streak > 0 && (
                      <span className="connection-streak">🔥 {member.streak} weeks</span>
                    )}
                  </div>
                  <div className="connection-bar-container">
                    <div
                      className="connection-bar"
                      style={{ width: `${getConnectionBarWidth(member.totalConnections, maxConnections)}%` }}
                    />
                  </div>
                  <div className="connection-meta">
                    <span className="connection-count">{member.totalConnections} connections</span>
                    <span className={`connection-last ${member.needsReconnect ? 'warning' : ''}`}>
                      {member.needsReconnect && member.daysSinceLastConnection !== null && '⚠️ '}
                      Last: {formatDaysAgo(member.daysSinceLastConnection)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Impact */}
      <div className="impact-section">
        <h3 className="section-title">Your Impact</h3>
        <div className="impact-stats">
          <div className="impact-stat">
            <span className="impact-icon">📊</span>
            <div className="impact-info">
              <span className="impact-value">{totalConnections}</span>
              <span className="impact-label">total connections made</span>
            </div>
          </div>
          {connectionRank && (
            <div className="impact-stat">
              <span className="impact-icon">🏆</span>
              <div className="impact-info">
                <span className="impact-value">#{connectionRank.rank}</span>
                <span className="impact-label">
                  {connectionRank.isTop
                    ? 'most connected this week!'
                    : `of ${connectionRank.total} in family this week`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
