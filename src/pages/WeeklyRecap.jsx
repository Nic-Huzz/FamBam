import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getCurrentWeekNumber, getWeekStartDate, getWeekEndDate, getWeekDateRange } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'
import { generateWeeklyDigest, isAIEnabled } from '../lib/ai'
import BottomNav from '../components/BottomNav'
import './WeeklyRecap.css'

export default function WeeklyRecap() {
  const { t } = useTranslation()
  const { profile, family } = useAuth()
  const [weekData, setWeekData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiDigest, setAiDigest] = useState('')
  const [digestLoading, setDigestLoading] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber())

  const currentWeek = getCurrentWeekNumber()

  useEffect(() => {
    if (family?.id) {
      fetchWeekData(selectedWeek)
    }
  }, [family?.id, selectedWeek])

  const fetchWeekData = async (weekNum) => {
    setLoading(true)
    setAiDigest('')

    try {
      // Get week date range
      const dateRange = getWeekDateRange(weekNum)

      // Fetch posts for the week
      const weekStart = getWeekStartDate(weekNum)
      const weekEnd = getWeekEndDate(weekNum)

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          message,
          content_type,
          created_at,
          author:users!posts_user_id_fkey(id, name, avatar_url)
        `)
        .eq('family_id', family.id)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: false })

      if (postsError) throw postsError

      // Fetch reactions for the week's posts
      const postIds = posts?.map(p => p.id) || []
      let totalReactions = 0
      let totalComments = 0

      if (postIds.length > 0) {
        const { count: reactionsCount } = await supabase
          .from('reactions')
          .select('id', { count: 'exact' })
          .in('post_id', postIds)

        const { count: commentsCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact' })
          .in('post_id', postIds)

        totalReactions = reactionsCount || 0
        totalComments = commentsCount || 0
      }

      // Calculate top contributors
      const contributorCounts = {}
      posts?.forEach(post => {
        const name = post.author?.name || 'Unknown'
        contributorCounts[name] = (contributorCounts[name] || 0) + 1
      })

      const topContributors = Object.entries(contributorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)

      // Content type breakdown
      const contentTypes = { text: 0, photo: 0, video: 0, audio: 0 }
      posts?.forEach(post => {
        contentTypes[post.content_type] = (contentTypes[post.content_type] || 0) + 1
      })

      // Fetch challenge completions for the week
      const { data: completions } = await supabase
        .from('completed_challenges')
        .select('user_id')
        .eq('week_number', weekNum)

      // Count family member completions (we'd need to filter by family, but for now count all)
      const challengeCompletions = completions?.length || 0

      setWeekData({
        weekNumber: weekNum,
        dateRange,
        posts: posts || [],
        totalPosts: posts?.length || 0,
        totalReactions,
        totalComments,
        topContributors,
        contentTypes,
        challengeCompletions,
      })

    } catch (error) {
      console.error('Error fetching week data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateDigest = async () => {
    if (!weekData || !isAIEnabled()) return

    setDigestLoading(true)
    try {
      const digest = await generateWeeklyDigest({
        posts: weekData.posts.map(p => ({
          authorName: p.author?.name,
          message: p.message,
          contentType: p.content_type,
        })),
        topContributors: weekData.topContributors,
        totalReactions: weekData.totalReactions,
        totalComments: weekData.totalComments,
        familyName: family?.name,
      })
      setAiDigest(digest)
    } catch (error) {
      console.error('Error generating digest:', error)
    } finally {
      setDigestLoading(false)
    }
  }

  // Calculate the week number when the family was created
  const getFamilyCreatedWeek = () => {
    if (!family?.created_at) return 1
    const createdDate = new Date(family.created_at)
    // Use same epoch as dateUtils (Jan 1, 2024)
    const epoch = new Date('2024-01-01T00:00:00Z')
    const diff = createdDate - epoch
    const oneWeek = 1000 * 60 * 60 * 24 * 7
    return Math.max(1, Math.ceil(diff / oneWeek))
  }

  const familyCreatedWeek = getFamilyCreatedWeek()

  // Generate available weeks (only since family was created, max 8)
  const availableWeeks = []
  for (let i = 0; i < 8; i++) {
    const week = currentWeek - i
    if (week >= familyCreatedWeek && week > 0) {
      availableWeeks.push({
        number: week,
        label: week === currentWeek ? t('weeklyRecap.thisWeek') : t('weeklyRecap.week', { number: week }),
        dateRange: getWeekDateRange(week),
      })
    }
  }

  return (
    <div className="page recap-page">
      <header className="page-header">
        <h1>{t('weeklyRecap.title')}</h1>
        <p className="header-subtitle">{t('weeklyRecap.subtitle', { name: family?.name })}</p>
      </header>

      {/* Navigation Tabs */}
      <div className="challenges-nav">
        <Link to="/challenges" className="nav-tab">{t('weeklyRecap.nav.thisWeek')}</Link>
        <Link to="/history" className="nav-tab">{t('weeklyRecap.nav.history')}</Link>
        <Link to="/recap" className="nav-tab active">{t('weeklyRecap.nav.recap')}</Link>
      </div>

      <main className="page-content">
        {/* Week Selector */}
        <div className="week-tabs">
          {availableWeeks.slice(0, 4).map(week => (
            <button
              key={week.number}
              className={`week-tab ${selectedWeek === week.number ? 'active' : ''}`}
              onClick={() => setSelectedWeek(week.number)}
            >
              {week.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : weekData ? (
          <>
            {/* Week Header */}
            <div className="recap-header">
              <span className="recap-date">{weekData.dateRange}</span>
            </div>

            {/* Stats Grid */}
            <div className="recap-stats">
              <div className="recap-stat">
                <span className="stat-icon">📝</span>
                <span className="stat-value">{weekData.totalPosts}</span>
                <span className="stat-label">{t('weeklyRecap.stats.posts')}</span>
              </div>
              <div className="recap-stat">
                <span className="stat-icon">❤️</span>
                <span className="stat-value">{weekData.totalReactions}</span>
                <span className="stat-label">{t('weeklyRecap.stats.reactions')}</span>
              </div>
              <div className="recap-stat">
                <span className="stat-icon">💬</span>
                <span className="stat-value">{weekData.totalComments}</span>
                <span className="stat-label">{t('weeklyRecap.stats.comments')}</span>
              </div>
              <div className="recap-stat">
                <span className="stat-icon">🎯</span>
                <span className="stat-value">{weekData.challengeCompletions}</span>
                <span className="stat-label">{t('weeklyRecap.stats.challenges')}</span>
              </div>
            </div>

            {/* Content Breakdown */}
            {weekData.totalPosts > 0 && (
              <div className="card content-breakdown">
                <h3>{t('weeklyRecap.contentShared')}</h3>
                <div className="breakdown-items">
                  {weekData.contentTypes.photo > 0 && (
                    <div className="breakdown-item">
                      <span className="breakdown-icon">📸</span>
                      <span>{t('weeklyRecap.content.photos', { count: weekData.contentTypes.photo })}</span>
                    </div>
                  )}
                  {weekData.contentTypes.video > 0 && (
                    <div className="breakdown-item">
                      <span className="breakdown-icon">🎬</span>
                      <span>{t('weeklyRecap.content.videos', { count: weekData.contentTypes.video })}</span>
                    </div>
                  )}
                  {weekData.contentTypes.audio > 0 && (
                    <div className="breakdown-item">
                      <span className="breakdown-icon">🎤</span>
                      <span>{t('weeklyRecap.content.voiceNotes', { count: weekData.contentTypes.audio })}</span>
                    </div>
                  )}
                  {weekData.contentTypes.text > 0 && (
                    <div className="breakdown-item">
                      <span className="breakdown-icon">✏️</span>
                      <span>{t('weeklyRecap.content.textPosts', { count: weekData.contentTypes.text })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Contributors */}
            {weekData.topContributors.length > 0 && (
              <div className="card top-contributors">
                <h3>{t('weeklyRecap.mostActive')}</h3>
                <div className="contributors-list">
                  {weekData.topContributors.map((name, index) => (
                    <div key={name} className="contributor">
                      <span className="contributor-rank">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="contributor-name">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Digest */}
            {isAIEnabled() && (
              <div className="card ai-digest">
                <h3>
                  <span className="ai-sparkle">✨</span>
                  {t('weeklyRecap.ai.title')}
                </h3>
                {aiDigest ? (
                  <p className="digest-text">{aiDigest}</p>
                ) : (
                  <button
                    className="generate-digest-btn"
                    onClick={generateDigest}
                    disabled={digestLoading || weekData.totalPosts === 0}
                  >
                    {digestLoading ? t('weeklyRecap.ai.generating') : t('weeklyRecap.ai.generate')}
                  </button>
                )}
                {weekData.totalPosts === 0 && !aiDigest && (
                  <p className="no-activity">{t('weeklyRecap.ai.noPosts')}</p>
                )}
              </div>
            )}

            {/* Empty State */}
            {weekData.totalPosts === 0 && (
              <div className="empty-week">
                <span className="empty-icon">📭</span>
                <h3>{t('weeklyRecap.empty.title')}</h3>
                <p>{t('weeklyRecap.empty.subtitle')}</p>
                {selectedWeek === currentWeek && (
                  <Link to="/post/new" className="btn-primary">
                    {t('weeklyRecap.empty.cta')}
                  </Link>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  )
}
