import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabaseFetch } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import './Feed.css'

export default function Feed() {
  const { profile, family, error: authError } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const userIds = [...new Set(postsData.map(p => p.user_id))]
        const { data: users } = await supabaseFetch('users', {
          select: 'id,name,avatar_url'
        })

        const userMap = {}
        users?.forEach(u => userMap[u.id] = u)

        // Add author info to posts
        const postsWithAuthors = postsData.map(post => ({
          ...post,
          author: userMap[post.user_id] || { name: 'Unknown' },
          reactions: [],
          comments: []
        }))

        // Sort by created_at descending
        postsWithAuthors.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        setPosts(postsWithAuthors)
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

      <main className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
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
