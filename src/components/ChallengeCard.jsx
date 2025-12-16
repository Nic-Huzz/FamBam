import './ChallengeCard.css'

export default function ChallengeCard({ challenge, completed, onComplete }) {
  return (
    <div className={`challenge-card card ${completed ? 'completed' : ''}`}>
      <div className="challenge-checkbox">
        <input
          type="checkbox"
          checked={completed}
          onChange={() => !completed && onComplete(challenge)}
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
      </div>

      <div className="challenge-points">
        <span className="points-badge">{challenge.points_value} pts</span>
      </div>
    </div>
  )
}
