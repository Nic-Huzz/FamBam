import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, autoCompleteChallenge, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { checkStorytellerBadge } from '../lib/badges'
import AudioRecorder from '../components/AudioRecorder'
import { AiPostPrompts, AiCaptionSuggestions } from '../components/AiSuggestions'
import { compressImage } from '../lib/imageCompression'
import './NewPost.css'

// Post type options that map to challenges
const POST_TYPE_OPTIONS = [
  { value: '', label: 'Just sharing...', challenge: null },
  { value: 'good_news', label: 'Good news', challenge: 'Share good news' },
  { value: 'win', label: 'Celebrating a win', challenge: 'Celebrate a win' },
  { value: 'surprise', label: 'Surprise of the week', challenge: 'Surprise of the week' },
  { value: 'curiosity', label: 'Curiosity of the week', challenge: 'Curiosity of the week' },
  { value: 'learning', label: 'Learning of the week', challenge: 'Learning of the week' },
  { value: 'grateful', label: 'Grateful for...', challenge: "Share what you're grateful for" },
  { value: 'weekend', label: 'Weekend plans', challenge: 'Weekend plans check-in' },
  { value: 'struggle', label: 'Something I struggled with', challenge: 'Share a struggle' },
]

const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PHOTOS = 10

export default function NewPost() {
  const { profile, family, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [postType, setPostType] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [audioFile, setAudioFile] = useState(null)
  const [audioPreview, setAudioPreview] = useState(null)
  const [audioTime, setAudioTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [challengeCompleted, setChallengeCompleted] = useState(null)
  const [showCaptions, setShowCaptions] = useState(true)

  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (mediaFiles.length + files.length > MAX_PHOTOS) {
      setError(`You can only add up to ${MAX_PHOTOS} photos/videos per post`)
      return
    }

    setError('')
    const newMediaItems = []

    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

      if (file.size > maxSize) {
        setError(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`)
        continue
      }

      let processedFile = file
      if (!isVideo && file.type.startsWith('image/')) {
        try {
          processedFile = await compressImage(file)
        } catch (err) {
          console.error('Compression failed, using original:', err)
        }
      }

      const preview = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(processedFile)
      })

      newMediaItems.push({
        file: processedFile,
        preview,
        type: isVideo ? 'video' : 'photo',
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
    }

    setMediaFiles(prev => [...prev, ...newMediaItems])
  }

  const removeMediaItem = (id) => {
    setMediaFiles(prev => prev.filter(m => m.id !== id))
  }

  const handleRecordingComplete = (file, preview, time) => {
    setAudioFile(file)
    setAudioPreview(preview)
    setAudioTime(time)
    setIsRecording(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!message.trim() && mediaFiles.length === 0 && !audioFile) {
      setError('Please add a message, photo, video, or voice note')
      return
    }

    setLoading(true)
    setError('')

    try {
      let contentUrl = null
      let contentType = 'text'

      if (audioFile) {
        contentType = 'audio'
      } else if (mediaFiles.length > 0) {
        const hasVideo = mediaFiles.some(m => m.type === 'video')
        contentType = hasVideo ? 'video' : 'photo'
      }

      // Upload audio if present
      if (audioFile) {
        const fileExt = audioFile.name.split('.').pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, audioFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName)

        contentUrl = publicUrl
      }

      // Create post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          family_id: family.id,
          content_type: contentType,
          content_url: contentUrl,
          message: message.trim(),
          post_type: postType || null,
        })
        .select('id')
        .single()

      if (postError) throw postError

      // Upload photos/videos to post_media table
      if (mediaFiles.length > 0) {
        const mediaUploads = []

        for (let i = 0; i < mediaFiles.length; i++) {
          const mediaItem = mediaFiles[i]
          const fileExt = mediaItem.file.name.split('.').pop()
          const fileName = `${profile.id}-${Date.now()}-${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, mediaItem.file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName)

          mediaUploads.push({
            post_id: postData.id,
            media_url: publicUrl,
            media_type: mediaItem.type,
            display_order: i
          })
        }

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaUploads)

        if (mediaError) throw mediaError
      }

      // Auto-complete challenges
      let mediaResult = null
      let postTypeResult = null

      if (contentType !== 'text') {
        mediaResult = await autoCompleteChallenge(profile.id, contentType, profile)
      }

      if (postType) {
        const selectedOption = POST_TYPE_OPTIONS.find(opt => opt.value === postType)
        if (selectedOption?.challenge) {
          postTypeResult = await autoCompleteChallenge(profile.id, selectedOption.challenge, profile, true)
        }
      }

      const result = postTypeResult || mediaResult

      await checkStorytellerBadge(profile.id, getCurrentWeekNumber())

      if (result) {
        setChallengeCompleted(result)
        await refreshProfile()
        setTimeout(() => navigate('/feed'), 1500)
        return
      }

      navigate('/feed')
    } catch (err) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const canPost = message.trim() || mediaFiles.length > 0 || audioFile
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="new-post-page">
      <header className="new-post-header">
        <Link to="/feed" className="close-btn">×</Link>
        <h1>Share an Update</h1>
        <button
          className="post-btn"
          onClick={handleSubmit}
          disabled={!canPost || loading || isRecording}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </header>

      <main className="new-post-content">
        {error && <div className="auth-error">{error}</div>}

        <div className="post-author-preview">
          <img
            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=FF6B6B&color=fff`}
            alt={profile?.name}
            className="avatar avatar-md"
          />
          <span className="author-name">{profile?.name}</span>
        </div>

        {/* Post Type Selector */}
        <div className="post-type-selector">
          <label htmlFor="postType">What are you sharing?</label>
          <select
            id="postType"
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            className="post-type-dropdown"
          >
            {POST_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI Post Prompts */}
        <AiPostPrompts
          userName={profile?.name}
          onSelectPrompt={setMessage}
          show={!message}
        />

        <textarea
          placeholder="What's happening with you?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="post-textarea"
          autoFocus
        />

        {/* Multi-photo previews */}
        {mediaFiles.length > 0 && (
          <div className="media-previews">
            {mediaFiles.map((item) => (
              <div key={item.id} className="media-preview-item">
                {item.type === 'video' ? (
                  <video src={item.preview} />
                ) : (
                  <img src={item.preview} alt="Preview" />
                )}
                <button className="remove-media" onClick={() => removeMediaItem(item.id)}>×</button>
              </div>
            ))}
            {mediaFiles.length < MAX_PHOTOS && (
              <label className="add-more-media">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  multiple
                  hidden
                />
                <span>+</span>
              </label>
            )}
          </div>
        )}

        {/* Audio preview */}
        {audioPreview && (
          <div className="media-preview">
            <div className="audio-preview">
              <span className="audio-icon">🎤</span>
              <audio src={audioPreview} controls />
              <span className="audio-duration">{formatTime(audioTime)}</span>
            </div>
            <button className="remove-media" onClick={() => {
              setAudioFile(null)
              setAudioPreview(null)
              setAudioTime(0)
            }}>×</button>
          </div>
        )}

        {/* AI Caption Suggestions */}
        <AiCaptionSuggestions
          mediaFiles={mediaFiles}
          onSelectCaption={(caption) => {
            setMessage(caption)
            setShowCaptions(false)
          }}
          show={showCaptions && !message && mediaFiles.length > 0}
          onDismiss={() => setShowCaptions(false)}
        />

        <div className="post-actions">
          <label className="media-btn">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              multiple
              hidden
              disabled={isRecording || !!audioFile}
            />
            <span className="action-icon">📷</span>
            <span>Photo/Video</span>
          </label>

          {mediaFiles.length === 0 && !audioFile && !audioPreview && (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={setError}
              disabled={mediaFiles.length > 0}
            />
          )}
        </div>

        {/* Challenge completion toast */}
        {challengeCompleted && (
          <div className="challenge-toast">
            <span className="toast-icon">🎉</span>
            <div className="toast-content">
              <strong>+{challengeCompleted.pointsEarned} points!</strong>
              <span>Challenge completed: {challengeCompleted.challengeTitle}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
