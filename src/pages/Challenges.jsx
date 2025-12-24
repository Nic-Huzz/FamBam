import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  const [completionCounts, setCompletionCounts] = useState({}) // { challengeId: count }
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

      // Count completions per challenge
      const counts = {}
      completedData?.forEach(c => {
        counts[c.challenge_id] = (counts[c.challenge_id] || 0) + 1
      })

      setChallenges(challengeData || [])
      setCompletionCounts(counts)
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
      // Calculate the next completion number
      const currentCount = completionCounts[challenge.id] || 0
      const nextCompletionNumber = currentCount + 1

      // Record completion with completion_number
      const { error: completeError } = await supabase
        .from('completed_challenges')
        .insert({
          user_id: profile.id,
          challenge_id: challenge.id,
          week_number: weekNumber,
          completion_number: nextCompletionNumber,
        })

      if (completeError) throw completeError

      // Calculate streak update
      const lastWeek = profile.last_challenge_week
      let newStreakDays = profile.streak_days || 0

      if (lastWeek === null || lastWeek === undefined) {
        // First time completing a challenge
        newStreakDays = 1
      } else if (lastWeek === weekNumber) {
        // Already completed a challenge this week, no streak change
      } else if (lastWeek === weekNumber - 1) {
        // Consecutive week - increment streak
        newStreakDays += 1
      } else {
        // Missed a week - reset streak to 1
        newStreakDays = 1
      }

      // Update user points, streak, and last_challenge_week
      const { error: updateError } = await supabase
        .from('users')
        .update({
          points_total: (profile.points_total || 0) + challenge.points_value,
          streak_days: newStreakDays,
          last_challenge_week: weekNumber
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // Update local state
      setCompletionCounts(prev => ({
        ...prev,
        [challenge.id]: nextCompletionNumber
      }))
      setCompletedChallenge(challenge)
      setShowModal(true)
      setShowConfetti(true)

      // Refresh profile to get updated points and streak
      await refreshProfile()
    } catch (error) {
      console.error('Error completing challenge:', error)
    }
  }

  // Calculate total completions and max possible
  const totalCompletions = Object.values(completionCounts).reduce((sum, count) => sum + count, 0)
  const maxPossibleCompletions = challenges.reduce((sum, c) => sum + (c.max_completions_per_week || 1), 0)
  const progressPercent = maxPossibleCompletions > 0 ? (totalCompletions / maxPossibleCompletions) * 100 : 0

  // Group challenges into categories
  const categorizeChallenge = (challenge) => {
    const title = challenge.title.toLowerCase()
    // Connect: call, reply, visit
    if (title.includes('call') || title.includes('reply') || title.includes('visit')) {
      return 'connect'
    }
    // Share: photo, vlog, video
    if (title.includes('photo') || title.includes('vlog') || title.includes('video') || title.includes('memory')) {
      return 'share'
    }
    // Celebrate: good news, win, grateful, learning
    if (title.includes('good news') || title.includes('win') || title.includes('grateful') || title.includes('learning')) {
      return 'celebrate'
    }
    // Reflect: surprise, curiosity, weekend
    return 'reflect'
  }

  const categories = {
    connect: { title: 'Connect', icon: '💬', challenges: [] },
    share: { title: 'Share Updates', icon: '📸', challenges: [] },
    celebrate: { title: 'Celebrate', icon: '🎉', challenges: [] },
    reflect: { title: 'Reflect & Discover', icon: '💭', challenges: [] },
  }

  challenges.forEach(challenge => {
    const category = categorizeChallenge(challenge)
    categories[category].challenges.push(challenge)
  })

  const categoryOrder = ['connect', 'share', 'celebrate', 'reflect']

  return (
    <div className="page challenges-page">
      {showConfetti && <Confetti />}

      <header className="page-header">
        <h1>Challenges</h1>
        <div className="progress-info">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">
            {totalCompletions} of {maxPossibleCompletions} complete
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="challenges-nav">
        <Link to="/challenges" className="nav-tab active">This Week</Link>
        <Link to="/history" className="nav-tab">History</Link>
        <Link to="/recap" className="nav-tab">Recap</Link>
      </div>

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
          categoryOrder.map(categoryKey => {
            const category = categories[categoryKey]
            if (category.challenges.length === 0) return null
            return (
              <section key={categoryKey} className="challenge-section">
                <h2 className="section-header">
                  <span className="section-icon">{category.icon}</span>
                  {category.title}
                </h2>
                <div className="section-challenges">
                  {category.challenges.map(challenge => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      completedCount={completionCounts[challenge.id] || 0}
                      maxCompletions={challenge.max_completions_per_week || 1}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </section>
            )
          })
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
