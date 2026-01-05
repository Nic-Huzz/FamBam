import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, autoCompleteChallenge } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCommentSuggestions, isAIEnabled } from '../lib/ai'
import LazyImage from './LazyImage'
import PhotoCarousel from './PhotoCarousel'
import './PostCard.css'

const REACTION_EMOJIS = ['❤️', '😂', '😮', '🙌', '🎉']

export default function PostCard({ post, onUpdate, onReactionUpdate, hideShare = false }) {
  const { t } = useTranslation()
  const { profile, refreshProfile } = useAuth()

  // Map post_type values to display labels and icons
  const POST_TYPE_LABELS = {
    'good_news': { label: t('postTypes.goodNews'), icon: '🎉' },
    'win': { label: t('postTypes.celebrating'), icon: '🏆' },
    'surprise': { label: t('postTypes.surprise'), icon: '😲' },
    'curiosity': { label: t('postTypes.curiosity'), icon: '🔍' },
    'learning': { label: t('postTypes.learning'), icon: '💡' },
    'grateful': { label: t('postTypes.grateful'), icon: '🙏' },
    'weekend': { label: t('postTypes.weekend'), icon: '📅' },
    'struggle': { label: t('postTypes.struggle'), icon: '💪' },
    'visit': { label: t('postTypes.visit'), icon: '🏠' },
    'call': { label: t('postTypes.call'), icon: '📞' },
  }
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentSuggestions, setCommentSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [challengeCompleted, setChallengeCompleted] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAuthor = profile?.id === post.user_id

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return t('post.timeAgo.now')
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return t('post.timeAgo.minutes', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('post.timeAgo.hours', { count: hours })
    const days = Math.floor(hours / 24)
    return t('post.timeAgo.days', { count: days })
  }

  const handleReaction = async (emoji) => {
    if (!profile) return

    const existingReaction = post.reactions?.find(
      r => r.user_id === profile.id && r.emoji === emoji
    )

    let newReactions

    if (existingReaction) {
      // Optimistically remove reaction from local state
      newReactions = post.reactions.filter(r => r.id !== existingReaction.id)

      await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id)
    } else {
      // Optimistically add reaction to local state
      const tempReaction = {
        id: `temp-${Date.now()}`,
        post_id: post.id,
        user_id: profile.id,
        emoji,
      }
      newReactions = [...(post.reactions || []), tempReaction]

      const { data } = await supabase
        .from('reactions')
        .insert({
          post_id: post.id,
          user_id: profile.id,
          emoji,
        })
        .select()
        .single()

      // Replace temp reaction with real one if we got data back
      if (data) {
        newReactions = newReactions.map(r =>
          r.id === tempReaction.id ? data : r
        )
      }
    }

    // Update just this post's reactions without refreshing the whole feed
    if (onReactionUpdate) {
      onReactionUpdate(post.id, newReactions)
    }
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

      // Auto-complete "Reply to a post" challenge
      const result = await autoCompleteChallenge(profile.id, 'Reply to a post', profile, true)
      if (result) {
        setChallengeCompleted(result)
        await refreshProfile()
        // Hide toast after 3 seconds
        setTimeout(() => setChallengeCompleted(null), 3000)
      }

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

  const handleToggleComments = async () => {
    const willShow = !showComments
    setShowComments(willShow)

    // Fetch AI suggestions when opening comments (only if no comments yet from user)
    if (willShow && isAIEnabled() && commentSuggestions.length === 0) {
      setLoadingSuggestions(true)
      try {
        const suggestions = await getCommentSuggestions(
          post.message || `a ${post.content_type} post`,
          post.author?.name || 'a family member'
        )
        setCommentSuggestions(suggestions)
      } catch (err) {
        console.error('Error fetching comment suggestions:', err)
      } finally {
        setLoadingSuggestions(false)
      }
    }
  }

  const useSuggestion = (suggestion) => {
    setNewComment(suggestion)
    setCommentSuggestions([]) // Hide after use
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`
    const shareText = post.message
      ? `${post.author?.name} shared: "${post.message.slice(0, 100)}${post.message.length > 100 ? '...' : ''}"`
      : `${post.author?.name} shared a post on FamBam`

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FamBam Post',
          text: shareText,
          url: postUrl
        })
        return
      } catch (err) {
        // User cancelled or error, fall through to clipboard
        if (err.name === 'AbortError') return
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(postUrl)
      setShareMessage('Link copied!')
      setTimeout(() => setShareMessage(''), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setShareMessage('Failed to copy')
      setTimeout(() => setShareMessage(''), 2000)
    }
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error deleting post:', err)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
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
          <div className="post-meta-top">
            <span className="post-author">{post.author?.name}</span>
            {post.post_type && POST_TYPE_LABELS[post.post_type] && (
              <span className="post-type-tag">
                {POST_TYPE_LABELS[post.post_type].icon} {POST_TYPE_LABELS[post.post_type].label}
              </span>
            )}
          </div>
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
        {isAuthor && (
          <div className="post-menu">
            {showDeleteConfirm ? (
              <div className="delete-confirm">
                <span>{t('post.delete.button')}?</span>
                <button
                  className="confirm-yes"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? '...' : t('common.confirm')}
                </button>
                <button
                  className="confirm-no"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                className="post-menu-btn"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete post"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      <div className="post-content">
        {post.message && <p className="post-message">{post.message}</p>}

        {/* Multiple photos/videos from post_media */}
        {post.media && post.media.length > 0 ? (
          <PhotoCarousel media={post.media} />
        ) : (
          <>
            {/* Fallback to legacy single content_url */}
            {post.content_url && post.content_type === 'photo' && (
              <LazyImage src={post.content_url} alt="Post" className="post-image" />
            )}
            {post.content_url && post.content_type === 'video' && (
              <video src={post.content_url} controls className="post-video" />
            )}
          </>
        )}

        {/* Audio posts (always use content_url) */}
        {post.content_url && post.content_type === 'audio' && (
          <div className="post-audio">
            <span className="audio-icon">🎤</span>
            <audio src={post.content_url} controls />
          </div>
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

      <div className="post-actions-row">
        <button
          className="comments-toggle"
          onClick={handleToggleComments}
        >
          💬 {post.comments?.length === 1 ? t('post.comments.countOne') : t('post.comments.count', { count: post.comments?.length || 0 })}
        </button>

        {!hideShare && (
          <button className="share-btn" onClick={handleShare}>
            {shareMessage || `↗ ${t('post.share.button')}`}
          </button>
        )}
      </div>

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

          {/* AI Comment Suggestions */}
          {loadingSuggestions && (
            <div className="ai-suggestions-loading">
              <span>✨</span> {t('newPost.aiSuggestions.loading')}
            </div>
          )}

          {commentSuggestions.length > 0 && !newComment && (
            <div className="ai-comment-suggestions">
              <span className="suggestions-label">✨ {t('post.quickReplies')}:</span>
              <div className="suggestions-list">
                {commentSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="suggestion-chip"
                    onClick={() => useSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              placeholder={t('post.comments.placeholder')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" disabled={!newComment.trim() || submitting}>
              {t('post.comments.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Challenge completion toast */}
      {challengeCompleted && (
        <div className="comment-challenge-toast">
          +{challengeCompleted.pointsEarned} pts!
        </div>
      )}
    </div>
  )
}
