import { useState, useEffect } from 'react'
import { getPostPrompts, getCaptionSuggestions, isAIEnabled } from '../lib/ai'
import './AiSuggestions.css'

export function AiPostPrompts({ userName, onSelectPrompt, show }) {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAIEnabled()) return

    const fetchPrompts = async () => {
      setLoading(true)
      try {
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' })
        const result = await getPostPrompts({ dayOfWeek, userName })
        setPrompts(result)
      } catch (err) {
        console.error('Error fetching AI prompts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrompts()
  }, [userName])

  if (!show) return null

  if (loading) {
    return (
      <div className="ai-prompts-loading">
        <span className="ai-icon">✨</span>
        <span>Getting ideas...</span>
      </div>
    )
  }

  if (prompts.length === 0) return null

  return (
    <div className="ai-prompts">
      <div className="ai-prompts-header">
        <span className="ai-icon">✨</span>
        <span>Need inspiration?</span>
      </div>
      <div className="ai-prompts-list">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            className="ai-prompt-chip"
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AiCaptionSuggestions({ mediaFiles, onSelectCaption, show, onDismiss }) {
  const [captions, setCaptions] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isAIEnabled() || mediaFiles.length === 0) {
      setVisible(false)
      return
    }

    const fetchCaptions = async () => {
      try {
        const hasPhoto = mediaFiles.some(m => m.type === 'photo')
        const hasVideo = mediaFiles.some(m => m.type === 'video')

        let mediaDescription = 'a photo'
        if (hasPhoto && hasVideo) mediaDescription = 'photos and videos'
        else if (hasVideo) mediaDescription = 'a video'
        else if (mediaFiles.length > 1) mediaDescription = 'photos'

        const result = await getCaptionSuggestions(mediaDescription)
        setCaptions(result)
        setVisible(true)
      } catch (err) {
        console.error('Error fetching captions:', err)
      }
    }

    fetchCaptions()
  }, [mediaFiles.length])

  if (!show || !visible || captions.length === 0) return null

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div className="ai-captions">
      <div className="ai-prompts-header">
        <span className="ai-icon">✨</span>
        <span>Caption ideas</span>
        <button className="dismiss-captions" onClick={handleDismiss}>
          ×
        </button>
      </div>
      <div className="ai-prompts-list">
        {captions.map((caption, i) => (
          <button
            key={i}
            className="ai-prompt-chip"
            onClick={() => {
              onSelectCaption(caption)
              setVisible(false)
            }}
          >
            {caption}
          </button>
        ))}
      </div>
    </div>
  )
}
