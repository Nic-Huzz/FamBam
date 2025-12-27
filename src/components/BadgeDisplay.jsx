import { useState } from 'react'
import './BadgeDisplay.css'

function BadgeIcon({ badge, userBadge, isSelected, onClick }) {
  return (
    <button
      className={`badge-icon ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`${badge.name}: ${badge.description}`}
    >
      {badge.icon}
    </button>
  )
}

function BadgeDetails({ badge, onClose }) {
  if (!badge) return null

  return (
    <div className="badge-details">
      <span className="badge-details-icon">{badge.icon}</span>
      <div className="badge-details-text">
        <span className="badge-details-name">{badge.name}</span>
        <span className="badge-details-desc">{badge.description}</span>
      </div>
      <button className="badge-details-close" onClick={onClose}>×</button>
    </div>
  )
}

export default function BadgeDisplay({ badges, size = 'md', showEmpty = false }) {
  const [selectedBadge, setSelectedBadge] = useState(null)

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

  const handleBadgeClick = (badge) => {
    if (selectedBadge?.name === badge.name) {
      setSelectedBadge(null)
    } else {
      setSelectedBadge(badge)
    }
  }

  return (
    <div className={`badge-display badge-${size}`}>
      {grouped.milestone.length > 0 && (
        <div className="badge-group">
          <span className="badge-group-label">Milestones</span>
          <div className="badge-icons">
            {grouped.milestone.map(ub => (
              <BadgeIcon
                key={ub.id}
                badge={ub.badge}
                userBadge={ub}
                isSelected={selectedBadge?.name === ub.badge.name}
                onClick={() => handleBadgeClick(ub.badge)}
              />
            ))}
          </div>
        </div>
      )}

      {grouped.achievement.length > 0 && (
        <div className="badge-group">
          <span className="badge-group-label">Achievements</span>
          <div className="badge-icons">
            {grouped.achievement.map(ub => (
              <BadgeIcon
                key={ub.id}
                badge={ub.badge}
                userBadge={ub}
                isSelected={selectedBadge?.name === ub.badge.name}
                onClick={() => handleBadgeClick(ub.badge)}
              />
            ))}
          </div>
        </div>
      )}

      {grouped.weekly.length > 0 && (
        <div className="badge-group">
          <span className="badge-group-label">This Week</span>
          <div className="badge-icons">
            {grouped.weekly.map(ub => (
              <BadgeIcon
                key={ub.id}
                badge={ub.badge}
                userBadge={ub}
                isSelected={selectedBadge?.name === ub.badge.name}
                onClick={() => handleBadgeClick(ub.badge)}
              />
            ))}
          </div>
        </div>
      )}

      <BadgeDetails badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
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
