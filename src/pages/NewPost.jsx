import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, autoCompleteChallenge, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getPostPrompts, getCaptionSuggestions, isAIEnabled } from '../lib/ai'
import { compressImage } from '../lib/imageCompression'
import { checkStorytellerBadge } from '../lib/badges'
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

export default function NewPost() {
  const { profile, family, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [postType, setPostType] = useState('')
  const [mediaFiles, setMediaFiles] = useState([]) // Array of { file, preview, type }
  const [audioFile, setAudioFile] = useState(null) // Separate audio state
  const [audioPreview, setAudioPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [challengeCompleted, setChallengeCompleted] = useState(null)

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  // AI suggestions state
  const [aiPrompts, setAiPrompts] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showCaptions, setShowCaptions] = useState(false)
  const [captionSuggestions, setCaptionSuggestions] = useState([])

  // Fetch AI prompts on load
  useEffect(() => {
    if (isAIEnabled()) {
      fetchAiPrompts()
    }
  }, [])

  // Fetch caption suggestions when media is added
  useEffect(() => {
    if (mediaFiles.length > 0 && isAIEnabled()) {
      const hasPhoto = mediaFiles.some(m => m.type === 'photo')
      const hasVideo = mediaFiles.some(m => m.type === 'video')
      fetchCaptionSuggestions(hasPhoto, hasVideo)
    }
  }, [mediaFiles.length])

  const fetchAiPrompts = async () => {
    setAiLoading(true)
    try {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      const prompts = await getPostPrompts({
        dayOfWeek,
        userName: profile?.name
      })
      setAiPrompts(prompts)
    } catch (err) {
      console.error('Error fetching AI prompts:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const fetchCaptionSuggestions = async (hasPhoto, hasVideo) => {
    try {
      let mediaDescription = 'a photo'
      if (hasPhoto && hasVideo) mediaDescription = 'photos and videos'
      else if (hasVideo) mediaDescription = 'a video'
      else if (mediaFiles.length > 1) mediaDescription = 'photos'

      const captions = await getCaptionSuggestions(mediaDescription)
      setCaptionSuggestions(captions)
      setShowCaptions(true)
    } catch (err) {
      console.error('Error fetching captions:', err)
    }
  }

  const usePrompt = (prompt) => {
    setMessage(prompt)
    setAiPrompts([]) // Hide prompts after selection
  }

  const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_RECORDING_TIME = 120 // 2 minutes

  const MAX_PHOTOS = 10 // Maximum photos per post

  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check if adding these would exceed the limit
    if (mediaFiles.length + files.length > MAX_PHOTOS) {
      setError(`You can only add up to ${MAX_PHOTOS} photos/videos per post`)
      return
    }

    setError('')

    // Process each file
    const newMediaItems = []
    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

      if (file.size > maxSize) {
        setError(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`)
        continue
      }

      // Compress images before setting
      let processedFile = file
      if (!isVideo && file.type.startsWith('image/')) {
        try {
          processedFile = await compressImage(file)
        } catch (err) {
          console.error('Compression failed, using original:', err)
          processedFile = file
        }
      }

      // Create preview
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

  const removeAudio = () => {
    setAudioFile(null)
    setAudioPreview(null)
    setRecordingTime(0)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        if (audioBlob.size > MAX_AUDIO_SIZE) {
          setError('Recording too large. Max size: 10MB')
          return
        }

        const newAudioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm'
        })

        setAudioFile(newAudioFile)
        setAudioPreview(URL.createObjectURL(audioBlob))

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setError('')

      // Timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

      // Determine content type based on what's attached
      if (audioFile) {
        contentType = 'audio'
      } else if (mediaFiles.length > 0) {
        // Use 'photo' as content_type for multi-photo posts (for backwards compat)
        const hasVideo = mediaFiles.some(m => m.type === 'video')
        contentType = hasVideo ? 'video' : 'photo'
      }

      // Upload audio if present (uses the old single-file approach for audio)
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
          content_url: contentUrl, // Will be null for multi-photo posts
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

        // Insert all media records
        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaUploads)

        if (mediaError) throw mediaError
      }

      // Auto-complete challenge based on media type or post type
      let result = null

      // First check media type challenges (photo, video, audio)
      if (contentType !== 'text') {
        result = await autoCompleteChallenge(profile.id, contentType, profile)
      }

      // Then check post type challenges (if selected and no media challenge completed)
      if (!result && postType) {
        const selectedOption = POST_TYPE_OPTIONS.find(opt => opt.value === postType)
        if (selectedOption?.challenge) {
          result = await autoCompleteChallenge(profile.id, selectedOption.challenge, profile, true)
        }
      }

      // Check Storyteller badge (3 posts in a week)
      await checkStorytellerBadge(profile.id, getCurrentWeekNumber())

      if (result) {
        setChallengeCompleted(result)
        await refreshProfile()
        // Show success briefly then navigate
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
        {!message && aiPrompts.length > 0 && (
          <div className="ai-prompts">
            <div className="ai-prompts-header">
              <span className="ai-icon">✨</span>
              <span>Need inspiration?</span>
            </div>
            <div className="ai-prompts-list">
              {aiPrompts.map((prompt, i) => (
                <button
                  key={i}
                  className="ai-prompt-chip"
                  onClick={() => usePrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {aiLoading && !message && (
          <div className="ai-prompts-loading">
            <span className="ai-icon">✨</span>
            <span>Getting ideas...</span>
          </div>
        )}

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
              <span className="audio-duration">{formatTime(recordingTime)}</span>
            </div>
            <button className="remove-media" onClick={removeAudio}>×</button>
          </div>
        )}

        {/* AI Caption Suggestions */}
        {showCaptions && captionSuggestions.length > 0 && !message && (
          <div className="ai-captions">
            <div className="ai-prompts-header">
              <span className="ai-icon">✨</span>
              <span>Caption ideas</span>
              <button
                className="dismiss-captions"
                onClick={() => setShowCaptions(false)}
              >
                ×
              </button>
            </div>
            <div className="ai-prompts-list">
              {captionSuggestions.map((caption, i) => (
                <button
                  key={i}
                  className="ai-prompt-chip"
                  onClick={() => {
                    setMessage(caption)
                    setShowCaptions(false)
                  }}
                >
                  {caption}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span className="recording-time">{formatTime(recordingTime)}</span>
            <button className="stop-recording-btn" onClick={stopRecording}>
              Stop Recording
            </button>
          </div>
        )}

        <div className="post-actions">
          <label className="media-btn">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              multiple
              hidden
              disabled={isRecording || audioFile}
            />
            <span className="action-icon">📷</span>
            <span>Photo/Video</span>
          </label>

          {mediaFiles.length === 0 && !audioFile && !isRecording && (
            <button className="media-btn" onClick={startRecording}>
              <span className="action-icon">🎤</span>
              <span>Voice Note</span>
            </button>
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
