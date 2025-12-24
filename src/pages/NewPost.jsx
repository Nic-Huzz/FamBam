import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getPostPrompts, getCaptionSuggestions, isAIEnabled } from '../lib/ai'
import './NewPost.css'

export default function NewPost() {
  const { profile, family } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null) // 'photo', 'video', or 'audio'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    if (media && (mediaType === 'photo' || mediaType === 'video') && isAIEnabled()) {
      fetchCaptionSuggestions()
    }
  }, [media, mediaType])

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

  const fetchCaptionSuggestions = async () => {
    try {
      const captions = await getCaptionSuggestions(
        mediaType === 'photo' ? 'a photo' : 'a video'
      )
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

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

    if (file.size > maxSize) {
      setError(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`)
      return
    }

    setMedia(file)
    setMediaType(isVideo ? 'video' : 'photo')
    setError('')

    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const removeMedia = () => {
    setMedia(null)
    setMediaPreview(null)
    setMediaType(null)
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

        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm'
        })

        setMedia(audioFile)
        setMediaType('audio')
        setMediaPreview(URL.createObjectURL(audioBlob))

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

    if (!message.trim() && !media) {
      setError('Please add a message, photo, video, or voice note')
      return
    }

    setLoading(true)
    setError('')

    try {
      let contentUrl = null
      let contentType = 'text'

      // Upload media if present
      if (media) {
        const fileExt = media.name.split('.').pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, media)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName)

        contentUrl = publicUrl
        contentType = mediaType // 'photo', 'video', or 'audio'
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          family_id: family.id,
          content_type: contentType,
          content_url: contentUrl,
          message: message.trim(),
        })

      if (postError) throw postError

      navigate('/feed')
    } catch (err) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const canPost = message.trim() || media

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

        {mediaPreview && (
          <div className="media-preview">
            {mediaType === 'video' ? (
              <video src={mediaPreview} controls />
            ) : mediaType === 'audio' ? (
              <div className="audio-preview">
                <span className="audio-icon">🎤</span>
                <audio src={mediaPreview} controls />
                <span className="audio-duration">{formatTime(recordingTime)}</span>
              </div>
            ) : (
              <img src={mediaPreview} alt="Preview" />
            )}
            <button className="remove-media" onClick={removeMedia}>×</button>
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
              hidden
              disabled={isRecording}
            />
            <span className="action-icon">📷</span>
            <span>Photo/Video</span>
          </label>

          {!media && !isRecording && (
            <button className="media-btn" onClick={startRecording}>
              <span className="action-icon">🎤</span>
              <span>Voice Note</span>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
