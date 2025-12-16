import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import './Feed.css'

export default function Feed() {
  const { profile, family } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    if (!family?.id) return

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_user_id_fkey(id, name, avatar_url),
          reactions(*),
          comments(
            *,
            author:users!comments_user_id_fkey(id, name, avatar_url)
          )
        `)
        .eq('family_id', family.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [family?.id])

  return (
    <div className="page feed-page">
      <header className="feed-header">
        <div className="feed-header-content">
          <h1>{family?.name || 'Family Feed'}</h1>
          <div className="header-points">
            <span className="points-badge">{profile?.points_total || 0} pts</span>
            {profile?.streak_days > 0 && (
              <span className="streak-badge">
                {profile.streak_days} day streak
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
