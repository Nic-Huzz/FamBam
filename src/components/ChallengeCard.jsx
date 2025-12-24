import './ChallengeCard.css'

export default function ChallengeCard({ challenge, completedCount, maxCompletions, onComplete }) {
  const isFullyComplete = completedCount >= maxCompletions
  const isRepeatable = maxCompletions > 1

  return (
    <div className={`challenge-card card ${isFullyComplete ? 'completed' : ''}`}>
      <div className="challenge-checkbox">
        <input
          type="checkbox"
          checked={isFullyComplete}
          onChange={() => !isFullyComplete && onComplete(challenge)}
          id={`challenge-${challenge.id}`}
        />
        <label htmlFor={`challenge-${challenge.id}`}>
          <span className="checkmark"></span>
        </label>
      </div>

      <div className="challenge-icon">{challenge.icon}</div>

      <div className="challenge-info">
        <h3 className="challenge-title">{challenge.title}</h3>
        <p className="challenge-description">{challenge.description}</p>
        {isRepeatable && (
          <div className="challenge-progress">
            <div className="challenge-progress-bar">
              <div
                className="challenge-progress-fill"
                style={{ width: `${(completedCount / maxCompletions) * 100}%` }}
              />
            </div>
            <span className="challenge-progress-text">
              {completedCount}/{maxCompletions}
            </span>
          </div>
        )}
      </div>

      <div className="challenge-points">
        <span className="points-badge">{challenge.points_value} pts</span>
        {isRepeatable && !isFullyComplete && completedCount > 0 && (
          <span className="points-earned">+{completedCount * challenge.points_value}</span>
        )}
      </div>
    </div>
  )
}
