import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { checkAllBadges } from '../lib/badges'
import { getConnectionStats } from '../lib/connections'
import BottomNav from '../components/BottomNav'
import ChallengeCard from '../components/ChallengeCard'
import Modal from '../components/Modal'
import Confetti from '../components/Confetti'
import './Challenges.css'

export default function Challenges() {
  const { profile, family, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [completionCounts, setCompletionCounts] = useState({}) // { challengeId: count }
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [completedChallenge, setCompletedChallenge] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Family member selector state (with connection stats for smart nudges)
  const [familyMembers, setFamilyMembers] = useState([])
  const [showMemberSelector, setShowMemberSelector] = useState(false)
  const [pendingChallenge, setPendingChallenge] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [otherMemberName, setOtherMemberName] = useState('')
  const [suggestedMember, setSuggestedMember] = useState(null)

  const weekNumber = getCurrentWeekNumber()

  // Check if challenge requires family member selection
  const requiresMemberSelection = (challenge) => {
    const title = challenge.title.toLowerCase()
    return title.includes('visit') || title.includes('call')
  }

  const fetchFamilyMembers = async () => {
    if (!family?.id || !profile?.id) return

    try {
      // Get connection stats (sorted by least recently connected)
      const stats = await getConnectionStats(profile.id, family.id)
      setFamilyMembers(stats)

      // Set the suggested member (least recently connected)
      if (stats.length > 0) {
        setSuggestedMember(stats[0])
      }
    } catch (error) {
      console.error('Error fetching family members:', error)
    }
  }

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
      fetchFamilyMembers()
    }
  }, [profile?.id, family?.id])

  const handleComplete = async (challenge) => {
    // For visit/call challenges, show the member selector first
    if (requiresMemberSelection(challenge)) {
      setPendingChallenge(challenge)
      setSelectedMemberId('')
      setOtherMemberName('')
      setShowMemberSelector(true)
      return
    }

    // For other challenges, complete directly
    await completeChallenge(challenge, null, null)
  }

  const completeChallenge = async (challenge, selectedMember, otherName) => {
    try {
      // Calculate the next completion number
      const currentCount = completionCounts[challenge.id] || 0
      const nextCompletionNumber = currentCount + 1

      // Record completion with completion_number and target_user_id (for visit/call tracking)
      const { error: completeError } = await supabase
        .from('completed_challenges')
        .insert({
          user_id: profile.id,
          challenge_id: challenge.id,
          week_number: weekNumber,
          completion_number: nextCompletionNumber,
          target_user_id: selectedMember?.id || null, // Track who was visited/called
        })

      if (completeError) throw completeError

      // Calculate streak update
      const lastWeek = profile.last_challenge_week
      let newStreakDays = profile.streak_days || 0

      if (lastWeek === null || lastWeek === undefined) {
        newStreakDays = 1
      } else if (lastWeek === weekNumber) {
        // Already completed a challenge this week, no streak change
      } else if (lastWeek === weekNumber - 1) {
        newStreakDays += 1
      } else {
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

      // For visit/call challenges, also award points to selected family member and create a post
      const memberName = selectedMember?.name || otherName
      if (requiresMemberSelection(challenge) && memberName) {
        // Create a post to show in the feed
        const actionWord = challenge.title.toLowerCase().includes('visit') ? 'visited' : 'called'
        const postMessage = selectedMember
          ? `${actionWord} ${memberName}! 🎉`
          : `${actionWord} ${memberName}! 🎉`

        await supabase
          .from('posts')
          .insert({
            user_id: profile.id,
            family_id: family.id,
            content_type: 'text',
            message: postMessage,
            post_type: challenge.title.toLowerCase().includes('visit') ? 'visit' : 'call',
          })

        // If a family member from the app was selected, award them points too
        if (selectedMember) {
          // Get their current profile
          const { data: memberProfile } = await supabase
            .from('users')
            .select('points_total, streak_days, last_challenge_week')
            .eq('id', selectedMember.id)
            .single()

          if (memberProfile) {
            // Calculate their streak update
            let memberStreakDays = memberProfile.streak_days || 0
            const memberLastWeek = memberProfile.last_challenge_week

            if (memberLastWeek === null || memberLastWeek === undefined) {
              memberStreakDays = 1
            } else if (memberLastWeek === weekNumber) {
              // Already has activity this week
            } else if (memberLastWeek === weekNumber - 1) {
              memberStreakDays += 1
            } else {
              memberStreakDays = 1
            }

            // Award them the same points
            await supabase
              .from('users')
              .update({
                points_total: (memberProfile.points_total || 0) + challenge.points_value,
                streak_days: memberStreakDays,
                last_challenge_week: weekNumber
              })
              .eq('id', selectedMember.id)

            // Also record a challenge completion for them
            const { data: memberCompletions } = await supabase
              .from('completed_challenges')
              .select('id')
              .eq('user_id', selectedMember.id)
              .eq('challenge_id', challenge.id)
              .eq('week_number', weekNumber)

            const memberCompletionCount = memberCompletions?.length || 0
            if (memberCompletionCount < challenge.max_completions_per_week) {
              await supabase
                .from('completed_challenges')
                .insert({
                  user_id: selectedMember.id,
                  challenge_id: challenge.id,
                  week_number: weekNumber,
                  completion_number: memberCompletionCount + 1,
                })
            }
          }
        }
      }

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

      // Check and award any badges earned
      await checkAllBadges(profile.id, {
        ...profile,
        points_total: (profile.points_total || 0) + challenge.points_value,
        streak_days: newStreakDays,
        last_challenge_week: weekNumber
      }, family.id, challenge.title, selectedMember?.id || null)
    } catch (error) {
      console.error('Error completing challenge:', error)
    }
  }

  const handleMemberSelectorSubmit = async () => {
    if (!pendingChallenge) return

    const selectedMember = selectedMemberId && selectedMemberId !== 'other'
      ? familyMembers.find(m => m.id === selectedMemberId)
      : null

    const otherName = selectedMemberId === 'other' ? otherMemberName.trim() : null

    if (!selectedMember && !otherName) return

    setShowMemberSelector(false)
    await completeChallenge(pendingChallenge, selectedMember, otherName)
    setPendingChallenge(null)
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
    // Reflect: surprise, curiosity, weekend, struggle
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

      {/* Family Member Selector Modal */}
      {showMemberSelector && pendingChallenge && (
        <Modal onClose={() => {
          setShowMemberSelector(false)
          setPendingChallenge(null)
        }}>
          <div className="member-selector-modal">
            <span className="selector-emoji">
              {pendingChallenge.title.toLowerCase().includes('visit') ? '🏠' : '📞'}
            </span>
            <h2>Who did you {pendingChallenge.title.toLowerCase().includes('visit') ? 'visit' : 'call'}?</h2>

            {/* Smart Nudge Suggestion */}
            {suggestedMember && suggestedMember.needsReconnect && !selectedMemberId && (
              <div className="smart-nudge">
                <span className="nudge-icon">💡</span>
                <div className="nudge-content">
                  <span className="nudge-text">
                    {suggestedMember.daysSinceLastConnection === null
                      ? `You haven't connected with ${suggestedMember.name} yet!`
                      : `It's been ${suggestedMember.daysSinceLastConnection} days since you connected with ${suggestedMember.name}`}
                  </span>
                  <button
                    className="nudge-select-btn"
                    onClick={() => setSelectedMemberId(suggestedMember.id)}
                  >
                    Select {suggestedMember.name}
                  </button>
                </div>
              </div>
            )}

            <div className="member-selector-form">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="member-dropdown"
              >
                <option value="">Select a family member...</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.streak > 0 ? ` 🔥${member.streak}` : ''}
                    {member.needsReconnect ? ' ⚠️' : ''}
                  </option>
                ))}
                <option value="other">Other (not in app)</option>
              </select>

              {selectedMemberId === 'other' && (
                <input
                  type="text"
                  placeholder="Enter their name..."
                  value={otherMemberName}
                  onChange={(e) => setOtherMemberName(e.target.value)}
                  className="other-name-input"
                  autoFocus
                />
              )}

              {selectedMemberId && selectedMemberId !== 'other' && (
                <div className="member-stats">
                  {(() => {
                    const member = familyMembers.find(m => m.id === selectedMemberId)
                    if (!member) return null
                    return (
                      <>
                        <p className="bonus-info">
                          {member.name} will also earn +{pendingChallenge.points_value} points!
                        </p>
                        {member.streak > 0 && (
                          <p className="streak-info">
                            🔥 {member.streak} week streak with {member.name}!
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="completion-actions">
              <button
                className="btn-primary"
                onClick={handleMemberSelectorSubmit}
                disabled={!selectedMemberId || (selectedMemberId === 'other' && !otherMemberName.trim())}
              >
                Complete Challenge
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowMemberSelector(false)
                  setPendingChallenge(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

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
