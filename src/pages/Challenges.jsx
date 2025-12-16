import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import ChallengeCard from '../components/ChallengeCard'
import Modal from '../components/Modal'
import Confetti from '../components/Confetti'
import './Challenges.css'

export default function Challenges() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [completedChallenge, setCompletedChallenge] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const weekNumber = getCurrentWeekNumber()

  const fetchChallenges = async () => {
    try {
      // Fetch active challenges
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('points_value', { ascending: false })

      if (challengeError) throw challengeError

      // Fetch completed challenges for this week
      const { data: completedData, error: completedError } = await supabase
        .from('completed_challenges')
        .select('challenge_id')
        .eq('user_id', profile?.id)
        .eq('week_number', weekNumber)

      if (completedError) throw completedError

      setChallenges(challengeData || [])
      setCompletedIds(new Set(completedData?.map(c => c.challenge_id) || []))
    } catch (error) {
      console.error('Error fetching challenges:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.id) {
      fetchChallenges()
    }
  }, [profile?.id])

  const handleComplete = async (challenge) => {
    try {
      // Record completion
      const { error: completeError } = await supabase
        .from('completed_challenges')
        .insert({
          user_id: profile.id,
          challenge_id: challenge.id,
          week_number: weekNumber,
        })

      if (completeError) throw completeError

      // Update user points
      const { error: pointsError } = await supabase
        .from('users')
        .update({ points_total: (profile.points_total || 0) + challenge.points_value })
        .eq('id', profile.id)

      if (pointsError) throw pointsError

      // Update local state
      setCompletedIds(prev => new Set([...prev, challenge.id]))
      setCompletedChallenge(challenge)
      setShowModal(true)
      setShowConfetti(true)

      // Refresh profile to get updated points
      await refreshProfile()
    } catch (error) {
      console.error('Error completing challenge:', error)
    }
  }

  const completedCount = completedIds.size
  const totalCount = challenges.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="page challenges-page">
      {showConfetti && <Confetti />}

      <header className="page-header">
        <h1>This Week's Challenges</h1>
        <div className="progress-info">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">
            {completedCount} of {totalCount} complete
          </span>
        </div>
      </header>

      <main className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎯</span>
            <h2>No challenges yet</h2>
            <p>Check back soon for new challenges!</p>
          </div>
        ) : (
          challenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              completed={completedIds.has(challenge.id)}
              onComplete={handleComplete}
            />
          ))
        )}
      </main>

      {showModal && completedChallenge && (
        <Modal onClose={() => {
          setShowModal(false)
          setShowConfetti(false)
        }}>
          <div className="completion-modal">
            <span className="completion-emoji">🎉</span>
            <h2>Nice!</h2>
            <p className="completion-points">+{completedChallenge.points_value} points</p>
            <p className="completion-message">
              You completed "{completedChallenge.title}"
            </p>
            <div className="completion-actions">
              <button
                className="btn-primary"
                onClick={() => navigate('/leaderboard')}
              >
                View Leaderboard
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowModal(false)
                  setShowConfetti(false)
                }}
              >
                Keep Going
              </button>
            </div>
          </div>
        </Modal>
      )}

      <BottomNav />
    </div>
  )
}
