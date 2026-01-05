import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabaseFetch } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import './PostDetail.css'

export default function PostDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, family } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      fetchPost()
    }
  }, [id])

  const fetchPost = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch the post
      const { data: postData, error: postError } = await supabaseFetch('posts', {
        select: '*',
        filters: [{ column: 'id', op: 'eq', value: id }]
      })

      if (postError) throw postError
      if (!postData || postData.length === 0) {
        setError(t('errors.notFound'))
        return
      }

      const postItem = postData[0]

      // Check if user has access (is in the same family)
      if (family && postItem.family_id !== family.id) {
        setError(t('errors.unauthorized'))
        return
      }

      // Fetch related data in parallel
      const [usersRes, commentsRes, reactionsRes, mediaRes] = await Promise.all([
        supabaseFetch('users', { select: 'id,name,avatar_url' }),
        supabaseFetch('comments', {
          select: '*',
          filters: [{ column: 'post_id', op: 'eq', value: id }]
        }),
        supabaseFetch('reactions', {
          select: '*',
          filters: [{ column: 'post_id', op: 'eq', value: id }]
        }),
        supabaseFetch('post_media', {
          select: '*',
          filters: [{ column: 'post_id', op: 'eq', value: id }]
        })
      ])

      // Build user map
      const userMap = {}
      usersRes.data?.forEach(u => userMap[u.id] = u)

      // Add author info to comments
      const commentsWithAuthors = (commentsRes.data || []).map(comment => ({
        ...comment,
        author: userMap[comment.user_id] || { name: 'Unknown' }
      }))

      // Sort media by display_order
      const sortedMedia = (mediaRes.data || []).sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      )

      // Build complete post object
      const completePost = {
        ...postItem,
        author: userMap[postItem.user_id] || { name: 'Unknown' },
        reactions: reactionsRes.data || [],
        comments: commentsWithAuthors,
        media: sortedMedia
      }

      setPost(completePost)
    } catch (err) {
      console.error('Error fetching post:', err)
      setError(err.message || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page post-detail-page">
        <header className="post-detail-header">
          <Link to="/feed" className="back-btn">← {t('common.back')}</Link>
          <h1>{t('post.title')}</h1>
          <div style={{ width: 60 }}></div>
        </header>
        <main className="page-content">
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page post-detail-page">
        <header className="post-detail-header">
          <Link to="/feed" className="back-btn">← {t('common.back')}</Link>
          <h1>{t('post.title')}</h1>
          <div style={{ width: 60 }}></div>
        </header>
        <main className="page-content">
          <div className="empty-state">
            <span className="empty-icon">😕</span>
            <h2>{error}</h2>
            <p>{t('post.notFoundDesc')}</p>
            <Link to="/feed" className="btn-primary">{t('nav.feed')}</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page post-detail-page">
      <header className="post-detail-header">
        <Link to="/feed" className="back-btn">← {t('common.back')}</Link>
        <h1>{t('post.title')}</h1>
        <div style={{ width: 60 }}></div>
      </header>

      <main className="page-content">
        {post && (
          <PostCard
            post={post}
            onUpdate={fetchPost}
            hideShare={true}
          />
        )}
      </main>
    </div>
  )
}
