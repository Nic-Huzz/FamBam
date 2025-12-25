import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabaseFetch } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import { FeedSkeleton } from '../components/Skeleton'
import './Feed.css'

export default function Feed() {
  const { profile, family, error: authError } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const contentRef = useRef(null)
  const startY = useRef(0)
  const isPulling = useRef(false)

  useEffect(() => {
    // If no family, stop loading and show appropriate state
    if (!family?.id) {
      setLoading(false)
      return
    }

    fetchPosts()
  }, [family?.id])

  const fetchPosts = async () => {
    if (!family?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch posts using raw fetch
      const { data: postsData, error: fetchError } = await supabaseFetch('posts', {
        select: '*',
        filters: [{ column: 'family_id', op: 'eq', value: family.id }]
      })

      if (fetchError) {
        console.error('Error fetching posts:', fetchError)
        setError(fetchError.message || 'Failed to load posts')
        return
      }

      // Fetch authors for posts
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id)

        // Fetch users, comments, reactions, and media in parallel
        const [usersRes, commentsRes, reactionsRes, mediaRes] = await Promise.all([
          supabaseFetch('users', { select: 'id,name,avatar_url' }),
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

        // Build user map for authors
        const userMap = {}
        usersRes.data?.forEach(u => userMap[u.id] = u)

        // Group comments by post_id and add author info
        const commentsByPost = {}
        commentsRes.data?.forEach(comment => {
          if (!commentsByPost[comment.post_id]) {
            commentsByPost[comment.post_id] = []
          }
          commentsByPost[comment.post_id].push({
            ...comment,
            author: userMap[comment.user_id] || { name: 'Unknown' }
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

        // Group media by post_id and sort by display_order
        const mediaByPost = {}
        mediaRes.data?.forEach(media => {
          if (!mediaByPost[media.post_id]) {
            mediaByPost[media.post_id] = []
          }
          mediaByPost[media.post_id].push(media)
        })
        // Sort each post's media by display_order
        Object.values(mediaByPost).forEach(mediaList => {
          mediaList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        })

        // Add author, comments, reactions, and media to posts
        const postsWithData = postsData.map(post => ({
          ...post,
          author: userMap[post.user_id] || { name: 'Unknown' },
          reactions: reactionsByPost[post.id] || [],
          comments: commentsByPost[post.id] || [],
          media: mediaByPost[post.id] || []
        }))

        // Sort by created_at descending
        postsWithData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        setPosts(postsWithData)
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
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
      fetchPosts()
    }
    setPullDistance(0)
    isPulling.current = false
  }, [pullDistance, refreshing])

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
            <h2>Welcome!</h2>
            <p>Your profile isn't set up yet. Please sign out and sign up again to complete setup.</p>
            <Link to="/profile" className="btn-primary">Go to Profile</Link>
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
            <h2>No Family Yet</h2>
            <p>You're not part of a family group yet. Join one with an invite code or create a new family.</p>
            <Link to="/profile" className="btn-primary">Set Up Family</Link>
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
            <h1>{family?.name || 'Family Feed'}</h1>
          </div>
        </header>
        <main className="page-content">
          <div className="empty-state">
            <span className="empty-icon">⚠️</span>
            <h2>Something went wrong</h2>
            <p>{authError || error}</p>
            <button onClick={fetchPosts} className="btn-primary">Try Again</button>
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
                🔥 {profile.streak_days} day streak
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
              {refreshing ? '↻' : pullDistance > 80 ? '↓ Release' : '↓ Pull'}
            </div>
          </div>
        )}

        {loading && !refreshing ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📸</span>
            <h2>No posts yet</h2>
            <p>Be the first to share an update with your family!</p>
            <Link to="/post/new" className="btn-primary">Share Something</Link>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
          ))
        )}
      </main>

      <Link to="/post/new" className="fab">
        <span>+</span>
      </Link>

      <BottomNav />
    </div>
  )
}
