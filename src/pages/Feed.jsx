import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabaseFetch } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import { FeedSkeleton } from '../components/Skeleton'
import './Feed.css'

const POSTS_PER_PAGE = 10

// Get date key for grouping (YYYY-MM-DD)
const getDateKey = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-CA') // Returns YYYY-MM-DD
}

export default function Feed() {
  const { t, i18n } = useTranslation()
  const { profile, family, error: authError } = useAuth()

  // Format date for day separator
  const formatDayLabel = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return t('feed.today') || 'Today'
    if (isYesterday) return t('feed.yesterday') || 'Yesterday'

    return date.toLocaleDateString(i18n.language, { weekday: 'long', month: 'short', day: 'numeric' })
  }
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [userMap, setUserMap] = useState({})
  const contentRef = useRef(null)
  const startY = useRef(0)
  const isPulling = useRef(false)

  useEffect(() => {
    if (!family?.id) {
      setLoading(false)
      return
    }
    fetchPosts(true)
  }, [family?.id])

  const fetchPosts = async (reset = false) => {
    if (!family?.id) {
      setLoading(false)
      return
    }

    if (reset) {
      setLoading(true)
      setPosts([])
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      // Get the oldest post date for cursor pagination
      const oldestDate = !reset && posts.length > 0
        ? posts[posts.length - 1].created_at
        : null

      // Build filters
      const filters = [{ column: 'family_id', op: 'eq', value: family.id }]
      if (oldestDate) {
        filters.push({ column: 'created_at', op: 'lt', value: oldestDate })
      }

      // Fetch posts with pagination
      const { data: postsData, error: fetchError } = await supabaseFetch('posts', {
        select: '*',
        filters,
        order: { column: 'created_at', ascending: false },
        limit: POSTS_PER_PAGE + 1 // Fetch one extra to check if there's more
      })

      if (fetchError) {
        console.error('Error fetching posts:', fetchError)
        setError(fetchError.message || 'Failed to load posts')
        return
      }

      // Check if there are more posts
      const hasMorePosts = postsData && postsData.length > POSTS_PER_PAGE
      setHasMore(hasMorePosts)

      // Remove the extra post we fetched for checking
      const postsToProcess = hasMorePosts ? postsData.slice(0, POSTS_PER_PAGE) : (postsData || [])

      if (postsToProcess.length > 0) {
        const postIds = postsToProcess.map(p => p.id)

        // Fetch users if we don't have them cached
        let currentUserMap = userMap
        if (Object.keys(currentUserMap).length === 0) {
          const usersRes = await supabaseFetch('users', { select: 'id,name,avatar_url' })
          currentUserMap = {}
          usersRes.data?.forEach(u => currentUserMap[u.id] = u)
          setUserMap(currentUserMap)
        }

        // Fetch comments, reactions, and media for these posts
        const [commentsRes, reactionsRes, mediaRes] = await Promise.all([
          supabaseFetch('comments', {
            select: '*',
            filters: [{ column: 'post_id', op: 'in', value: `(${postIds.join(',')})` }]
          }),
          supabaseFetch('reactions', {
            select: '*',
            filters: [{ column: 'post_id', op: 'in', value: `(${postIds.join(',')})` }]
          }),
          supabaseFetch('post_media', {
            select: '*',
            filters: [{ column: 'post_id', op: 'in', value: `(${postIds.join(',')})` }]
          })
        ])

        // Group comments by post_id
        const commentsByPost = {}
        commentsRes.data?.forEach(comment => {
          if (!commentsByPost[comment.post_id]) {
            commentsByPost[comment.post_id] = []
          }
          commentsByPost[comment.post_id].push({
            ...comment,
            author: currentUserMap[comment.user_id] || { name: 'Unknown' }
          })
        })

        // Group reactions by post_id
        const reactionsByPost = {}
        reactionsRes.data?.forEach(reaction => {
          if (!reactionsByPost[reaction.post_id]) {
            reactionsByPost[reaction.post_id] = []
          }
          reactionsByPost[reaction.post_id].push(reaction)
        })

        // Group media by post_id
        const mediaByPost = {}
        mediaRes.data?.forEach(media => {
          if (!mediaByPost[media.post_id]) {
            mediaByPost[media.post_id] = []
          }
          mediaByPost[media.post_id].push(media)
        })
        Object.values(mediaByPost).forEach(mediaList => {
          mediaList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        })

        // Add author, comments, reactions, and media to posts
        const postsWithData = postsToProcess.map(post => ({
          ...post,
          author: currentUserMap[post.user_id] || { name: 'Unknown' },
          reactions: reactionsByPost[post.id] || [],
          comments: commentsByPost[post.id] || [],
          media: mediaByPost[post.id] || []
        }))

        if (reset) {
          setPosts(postsWithData)
        } else {
          setPosts(prev => [...prev, ...postsWithData])
        }
      } else if (reset) {
        setPosts([])
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(false)
    }
  }

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e) => {
    const content = contentRef.current
    if (content && content.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || refreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0 && diff < 150) {
      setPullDistance(diff)
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80 && !refreshing) {
      setRefreshing(true)
      fetchPosts(true)
    }
    setPullDistance(0)
    isPulling.current = false
  }, [pullDistance, refreshing])

  // Group posts by day for rendering
  const renderPostsWithDaySeparators = () => {
    const elements = []
    let currentDateKey = null

    posts.forEach((post, index) => {
      const postDateKey = getDateKey(post.created_at)

      // Add day separator if this is a new day
      if (postDateKey !== currentDateKey) {
        currentDateKey = postDateKey
        elements.push(
          <div key={`day-${postDateKey}`} className="day-separator">
            <span>{formatDayLabel(post.created_at)}</span>
          </div>
        )
      }

      elements.push(
        <PostCard
          key={post.id}
          post={post}
          onUpdate={() => fetchPosts(true)}
          onReactionUpdate={(postId, newReactions) => {
            setPosts(prev => prev.map(p =>
              p.id === postId ? { ...p, reactions: newReactions } : p
            ))
          }}
        />
      )
    })

    return elements
  }

  // Show setup prompt if user has no profile or no family
  if (!profile) {
    return (
      <div className="page feed-page">
        <header className="feed-header">
          <div className="feed-header-content">
            <h1>FamBam</h1>
          </div>
        </header>
        <main className="page-content">
          <div className="empty-state">
            <span className="empty-icon">👋</span>
            <h2>{t('feed.welcome')}</h2>
            <p>{t('feed.setupProfile')}</p>
            <Link to="/profile" className="btn-primary">{t('nav.profile')}</Link>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (!family) {
    return (
      <div className="page feed-page">
        <header className="feed-header">
          <div className="feed-header-content">
            <h1>FamBam</h1>
            <div className="header-points">
              <span className="points-badge">{profile?.points_total || 0} pts</span>
            </div>
          </div>
        </header>
        <main className="page-content">
          <div className="empty-state">
            <span className="empty-icon">👨‍👩‍👧‍👦</span>
            <h2>{t('feed.noFamily')}</h2>
            <p>{t('feed.noFamilyDesc')}</p>
            <Link to="/profile" className="btn-primary">{t('feed.setupFamily')}</Link>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (authError || error) {
    return (
      <div className="page feed-page">
        <header className="feed-header">
          <div className="feed-header-content">
            <h1>{family?.name || t('feed.title')}</h1>
          </div>
        </header>
        <main className="page-content">
          <div className="empty-state">
            <span className="empty-icon">⚠️</span>
            <h2>{t('errors.generic')}</h2>
            <p>{authError || error}</p>
            <button onClick={() => fetchPosts(true)} className="btn-primary">{t('feed.tryAgain')}</button>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="page feed-page">
      <header className="feed-header">
        <div className="feed-header-content">
          <h1>{family.name}</h1>
          <div className="header-points">
            <span className="points-badge">{profile?.points_total || 0} pts</span>
            {profile?.streak_days > 0 && (
              <span className="streak-badge">
                🔥 {t('challenges.streak.days', { count: profile.streak_days })}
              </span>
            )}
          </div>
        </div>
      </header>

      <main
        className="page-content"
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="pull-refresh-indicator"
            style={{ height: refreshing ? 50 : pullDistance * 0.5 }}
          >
            <div className={`refresh-spinner ${refreshing ? 'spinning' : ''}`}>
              {refreshing ? '↻' : pullDistance > 80 ? `↓ ${t('feed.release')}` : `↓ ${t('feed.pull')}`}
            </div>
          </div>
        )}

        {loading && !refreshing ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📸</span>
            <h2>{t('feed.empty.title')}</h2>
            <p>{t('feed.empty.subtitle')}</p>
            <Link to="/post/new" className="btn-primary">{t('feed.empty.cta')}</Link>
          </div>
        ) : (
          <>
            {renderPostsWithDaySeparators()}

            {/* Load more button */}
            {hasMore && (
              <button
                className="load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t('common.loading') : t('feed.loadMore')}
              </button>
            )}

            {!hasMore && posts.length > POSTS_PER_PAGE && (
              <div className="end-of-feed">
                {t('feed.endOfFeed')}
              </div>
            )}
          </>
        )}
      </main>

      <Link to="/post/new" className="fab">
        <span>+</span>
      </Link>

      <BottomNav />
    </div>
  )
}
