import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './PostCard.css'

const REACTION_EMOJIS = ['❤️', '😂', '😮', '🙌', '🎉']

export default function PostCard({ post, onUpdate }) {
  const { profile } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const handleReaction = async (emoji) => {
    if (!profile) return

    const existingReaction = post.reactions?.find(
      r => r.user_id === profile.id && r.emoji === emoji
    )

    if (existingReaction) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id)
    } else {
      await supabase
        .from('reactions')
        .insert({
          post_id: post.id,
          user_id: profile.id,
          emoji,
        })
    }

    if (onUpdate) onUpdate()
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: profile.id,
          message: newComment.trim(),
        })
      setNewComment('')
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getReactionCounts = () => {
    const counts = {}
    post.reactions?.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1
    })
    return counts
  }

  const hasUserReacted = (emoji) => {
    return post.reactions?.some(r => r.user_id === profile?.id && r.emoji === emoji)
  }

  const reactionCounts = getReactionCounts()

  return (
    <div className="post-card card">
      <div className="post-header">
        <img
          src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=FF6B6B&color=fff`}
          alt={post.author?.name}
          className="avatar avatar-md"
        />
        <div className="post-meta">
          <span className="post-author">{post.author?.name}</span>
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
      </div>

      <div className="post-content">
        {post.message && <p className="post-message">{post.message}</p>}
        {post.content_url && post.content_type === 'photo' && (
          <img src={post.content_url} alt="Post" className="post-image" />
        )}
      </div>

      <div className="post-reactions">
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            className={`reaction-btn ${hasUserReacted(emoji) ? 'active' : ''}`}
            onClick={() => handleReaction(emoji)}
          >
            {emoji}
            {reactionCounts[emoji] > 0 && (
              <span className="reaction-count">{reactionCounts[emoji]}</span>
            )}
          </button>
        ))}
      </div>

      <button
        className="comments-toggle"
        onClick={() => setShowComments(!showComments)}
      >
        💬 {post.comments?.length || 0} comments
      </button>

      {showComments && (
        <div className="comments-section">
          {post.comments?.map(comment => (
            <div key={comment.id} className="comment">
              <img
                src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.name || 'User')}&background=FF6B6B&color=fff`}
                alt={comment.author?.name}
                className="avatar avatar-sm"
              />
              <div className="comment-content">
                <span className="comment-author">{comment.author?.name}</span>
                <p className="comment-text">{comment.message}</p>
              </div>
            </div>
          ))}

          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" disabled={!newComment.trim() || submitting}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
