import { useState, useRef } from 'react'
import './AudioRecorder.css'

const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_RECORDING_TIME = 120 // 2 minutes

export default function AudioRecorder({ onRecordingComplete, onError, disabled }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioPreview, setAudioPreview] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
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
          onError?.('Recording too large. Max size: 10MB')
          return
        }

        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm'
        })

        const previewUrl = URL.createObjectURL(audioBlob)
        setAudioPreview(previewUrl)
        onRecordingComplete?.(audioFile, previewUrl, recordingTime)

        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

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
      onError?.('Could not access microphone. Please allow microphone access.')
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

  const removeRecording = () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview)
    }
    setAudioPreview(null)
    setRecordingTime(0)
    onRecordingComplete?.(null, null, 0)
  }

  // Show preview if we have a recording
  if (audioPreview) {
    return (
      <div className="audio-recorder-preview">
        <div className="audio-preview">
          <span className="audio-icon">🎤</span>
          <audio src={audioPreview} controls />
          <span className="audio-duration">{formatTime(recordingTime)}</span>
        </div>
        <button className="remove-audio" onClick={removeRecording}>×</button>
      </div>
    )
  }

  // Show recording indicator
  if (isRecording) {
    return (
      <div className="recording-indicator">
        <span className="recording-dot"></span>
        <span className="recording-time">{formatTime(recordingTime)}</span>
        <button className="stop-recording-btn" onClick={stopRecording}>
          Stop Recording
        </button>
      </div>
    )
  }

  // Show start button
  return (
    <button
      className="media-btn"
      onClick={startRecording}
      disabled={disabled}
    >
      <span className="action-icon">🎤</span>
      <span>Voice Note</span>
    </button>
  )
}
