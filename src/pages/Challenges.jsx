import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, calculateStreakFromHistory } from '../lib/supabase'
import { getCurrentWeekNumber } from '../lib/dateUtils'
import { isConnectionChallenge, getConnectionType, getConnectionIcon, getConnectionActionWord } from '../lib/connectionUtils'
import { useAuth } from '../context/AuthContext'
import { checkAllBadges } from '../lib/badges'
import { getConnectionStats } from '../lib/connections'
import BottomNav from '../components/BottomNav'
import ChallengeCard from '../components/ChallengeCard'
import Modal from '../components/Modal'
import Confetti from '../components/Confetti'
import './Challenges.css'

export default function Challenges() {
  const { t } = useTranslation()
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
    return isConnectionChallenge(challenge.title)
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

      // Calculate daily streak update
      const lastActive = profile.last_active ? new Date(profile.last_active) : null
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let newStreakDays = profile.streak_days || 0

      if (!lastActive) {
        // No last_active - calculate from history
        newStreakDays = await calculateStreakFromHistory(profile.id)
      } else {
        const lastActiveDay = new Date(lastActive)
        lastActiveDay.setHours(0, 0, 0, 0)
        const daysDiff = Math.floor((today - lastActiveDay) / (1000 * 60 * 60 * 24))

        if (daysDiff === 0) {
          // Already active today, no streak change
        } else if (daysDiff === 1) {
          newStreakDays += 1
        } else if (daysDiff > 1) {
          // last_active is stale - recalculate from history
          newStreakDays = await calculateStreakFromHistory(profile.id)
        }
      }

      // Update user points, streak, and last_active
      const { error: updateError } = await supabase
        .from('users')
        .update({
          points_total: (profile.points_total || 0) + challenge.points_value,
          streak_days: newStreakDays,
          last_active: new Date().toISOString(),
          last_challenge_week: weekNumber
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // For visit/call challenges, also award points to selected family member and create a post
      const memberName = selectedMember?.name || otherName
      if (requiresMemberSelection(challenge) && memberName) {
        // Create a post to show in the feed
        const actionWord = getConnectionActionWord(challenge.title)
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
            post_type: getConnectionType(challenge.title),
          })

        // If a family member from the app was selected, award them points too
        if (selectedMember) {
          // Get their current profile
          const { data: memberProfile } = await supabase
            .from('users')
            .select('points_total, streak_days, last_active')
            .eq('id', selectedMember.id)
            .single()

          if (memberProfile) {
            // Calculate their daily streak update
            const memberLastActive = memberProfile.last_active ? new Date(memberProfile.last_active) : null
            let memberStreakDays = memberProfile.streak_days || 0

            if (!memberLastActive) {
              // No last_active - calculate from history
              memberStreakDays = await calculateStreakFromHistory(selectedMember.id)
            } else {
              const memberLastDay = new Date(memberLastActive)
              memberLastDay.setHours(0, 0, 0, 0)
              const memberDaysDiff = Math.floor((today - memberLastDay) / (1000 * 60 * 60 * 24))

              if (memberDaysDiff === 0) {
                // Already active today
              } else if (memberDaysDiff === 1) {
                memberStreakDays += 1
              } else if (memberDaysDiff > 1) {
                // last_active is stale - recalculate from history
                memberStreakDays = await calculateStreakFromHistory(selectedMember.id)
              }
            }

            // Award them the same points
            await supabase
              .from('users')
              .update({
                points_total: (memberProfile.points_total || 0) + challenge.points_value,
                streak_days: memberStreakDays,
                last_active: new Date().toISOString(),
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
    connect: { title: t('challenges.categories.connect'), icon: '💬', challenges: [] },
    share: { title: t('challenges.categories.share'), icon: '📸', challenges: [] },
    celebrate: { title: t('challenges.categories.celebrate'), icon: '🎉', challenges: [] },
    reflect: { title: t('challenges.categories.reflect'), icon: '💭', challenges: [] },
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
        <h1>{t('challenges.title')}</h1>
        <div className="progress-info">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">
            {t('challenges.progress.of', { completed: totalCompletions, total: maxPossibleCompletions })}
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="challenges-nav">
        <Link to="/challenges" className="nav-tab active">{t('challenges.thisWeek')}</Link>
        <Link to="/history" className="nav-tab">{t('challenges.nav.history')}</Link>
        <Link to="/recap" className="nav-tab">{t('challenges.nav.recap')}</Link>
      </div>

      <main className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎯</span>
            <h2>{t('challenges.empty.title')}</h2>
            <p>{t('challenges.empty.subtitle')}</p>
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
              {getConnectionIcon(pendingChallenge.title)}
            </span>
            <h2>{t('challenges.selectMemberPrompt', { action: t(`challenges.connection.${getConnectionType(pendingChallenge.title)}`) })}</h2>

            {/* Smart Nudge Suggestion */}
            {suggestedMember && suggestedMember.needsReconnect && !selectedMemberId && (
              <div className="smart-nudge">
                <span className="nudge-icon">💡</span>
                <div className="nudge-content">
                  <span className="nudge-text">
                    {suggestedMember.daysSinceLastConnection === null
                      ? t('challenges.nudge.notConnected', { name: suggestedMember.name })
                      : t('challenges.nudge.daysSince', { days: suggestedMember.daysSinceLastConnection, name: suggestedMember.name })}
                  </span>
                  <button
                    className="nudge-select-btn"
                    onClick={() => setSelectedMemberId(suggestedMember.id)}
                  >
                    {t('challenges.nudge.select', { name: suggestedMember.name })}
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
                <option value="">{t('challenges.selectPlaceholder')}</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.streak > 0 ? ` 🔥${member.streak}` : ''}
                    {member.needsReconnect ? ' ⚠️' : ''}
                  </option>
                ))}
                <option value="other">{t('challenges.otherOption')}</option>
              </select>

              {selectedMemberId === 'other' && (
                <input
                  type="text"
                  placeholder={t('challenges.enterName')}
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
                          {t('challenges.memberStats.bonus', { name: member.name, points: pendingChallenge.points_value })}
                        </p>
                        {member.streak > 0 && (
                          <p className="streak-info">
                            🔥 {t('challenges.memberStats.streak', { weeks: member.streak, name: member.name })}
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
                {t('challenges.modal.completeChallenge')}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowMemberSelector(false)
                  setPendingChallenge(null)
                }}
              >
                {t('common.cancel')}
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
            <h2>{t('challenges.modal.nice')}</h2>
            <p className="completion-points">{t('challenges.modal.pointsEarned', { points: completedChallenge.points_value })}</p>
            <p className="completion-message">
              {t('challenges.modal.completedMessage', { title: completedChallenge.title })}
            </p>
            <div className="completion-actions">
              <button
                className="btn-primary"
                onClick={() => navigate('/leaderboard')}
              >
                {t('challenges.modal.viewLeaderboard')}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowModal(false)
                  setShowConfetti(false)
                }}
              >
                {t('challenges.modal.keepGoing')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <BottomNav />
    </div>
  )
}
