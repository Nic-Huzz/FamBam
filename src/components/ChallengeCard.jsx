import { useState } from 'react'
import { getCallConversationTopics, isAIEnabled } from '../lib/ai'
import './ChallengeCard.css'

export default function ChallengeCard({ challenge, completedCount, maxCompletions, onComplete }) {
  const isFullyComplete = completedCount >= maxCompletions
  const isRepeatable = maxCompletions > 1
  const isCallChallenge = challenge.title.toLowerCase().includes('call')

  const [showTopics, setShowTopics] = useState(false)
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  const handleGetTopics = async () => {
    if (showTopics) {
      setShowTopics(false)
      return
    }

    setShowTopics(true)
    if (topics.length === 0 && isAIEnabled()) {
      setLoadingTopics(true)
      try {
        const suggestions = await getCallConversationTopics()
        setTopics(suggestions)
      } catch (err) {
        console.error('Error fetching topics:', err)
      } finally {
        setLoadingTopics(false)
      }
    }
  }

  const handleComplete = () => {
    if (!isFullyComplete) {
      onComplete(challenge)
      setShowTopics(false)
    }
  }

  return (
    <div className={`challenge-card card ${isFullyComplete ? 'completed' : ''} ${showTopics ? 'expanded' : ''}`}>
      <div className="challenge-main">
        <div className="challenge-checkbox">
          <input
            type="checkbox"
            checked={isFullyComplete}
            onChange={handleComplete}
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

      {/* Call conversation topics button */}
      {isCallChallenge && !isFullyComplete && isAIEnabled() && (
        <button
          className="topics-toggle"
          onClick={handleGetTopics}
        >
          <span className="topics-icon">✨</span>
          {showTopics ? 'Hide conversation ideas' : 'Get conversation ideas'}
          <span className={`topics-arrow ${showTopics ? 'open' : ''}`}>▼</span>
        </button>
      )}

      {/* Conversation topics dropdown */}
      {showTopics && (
        <div className="topics-section">
          {loadingTopics ? (
            <div className="topics-loading">
              <span>✨</span> Getting ideas...
            </div>
          ) : (
            <div className="topics-list">
              {topics.map((topic, i) => (
                <div key={i} className="topic-chip">
                  💬 {topic}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
