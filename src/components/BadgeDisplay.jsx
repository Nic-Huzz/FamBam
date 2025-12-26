import './BadgeDisplay.css'

export default function BadgeDisplay({ badges, size = 'md', showEmpty = false }) {
  if (!badges || badges.length === 0) {
    if (showEmpty) {
      return (
        <div className="badge-display-empty">
          <span className="empty-badge-icon">🏅</span>
          <p>No badges yet - keep going!</p>
        </div>
      )
    }
    return null
  }

  // Group badges by type
  const grouped = {
    weekly: badges.filter(b => b.badge?.badge_type === 'weekly'),
    milestone: badges.filter(b => b.badge?.badge_type === 'milestone'),
    achievement: badges.filter(b => b.badge?.badge_type === 'achievement'),
  }

  return (
    <div className={`badge-display badge-${size}`}>
      {grouped.milestone.length > 0 && (
        <div className="badge-group">
          <span className="badge-group-label">Milestones</span>
          <div className="badge-icons">
            {grouped.milestone.map(ub => (
              <span
                key={ub.id}
                className="badge-icon"
                title={`${ub.badge.name}: ${ub.badge.description}`}
              >
                {ub.badge.icon}
              </span>
            ))}
          </div>
        </div>
      )}

      {grouped.achievement.length > 0 && (
        <div className="badge-group">
          <span className="badge-group-label">Achievements</span>
          <div className="badge-icons">
            {grouped.achievement.map(ub => (
              <span
                key={ub.id}
                className="badge-icon"
                title={`${ub.badge.name}: ${ub.badge.description}`}
              >
                {ub.badge.icon}
              </span>
            ))}
          </div>
        </div>
      )}

      {grouped.weekly.length > 0 && (
        <div className="badge-group">
          <span className="badge-group-label">This Week</span>
          <div className="badge-icons">
            {grouped.weekly.map(ub => (
              <span
                key={ub.id}
                className="badge-icon weekly-badge"
                title={`${ub.badge.name}: ${ub.badge.description}`}
              >
                {ub.badge.icon}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple inline badges for leaderboard
export function InlineBadges({ badges }) {
  if (!badges || badges.length === 0) return null

  return (
    <span className="inline-badges">
      {badges.map((badge, i) => (
        <span key={i} className="inline-badge" title={badge.name}>
          {badge.icon}
        </span>
      ))}
    </span>
  )
}
