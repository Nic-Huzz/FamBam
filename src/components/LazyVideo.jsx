import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './LazyVideo.css'

export default function LazyVideo({ src, className = '' }) {
  const { t } = useTranslation()
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [errorType, setErrorType] = useState(null)
  const containerRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleVideoError = async () => {
    const video = videoRef.current

    // Check MediaError code if available
    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_NETWORK:
          setErrorType('network')
          return
        case MediaError.MEDIA_ERR_DECODE:
          setErrorType('decode')
          return
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          setErrorType('format')
          return
      }
    }

    // Try to determine if it's a 404 or network issue
    try {
      const response = await fetch(src, { method: 'HEAD' })
      if (response.status === 404) {
        setErrorType('notFound')
      } else if (!response.ok) {
        setErrorType('network')
      } else {
        setErrorType('format')
      }
    } catch {
      setErrorType('network')
    }
  }

  return (
    <div ref={containerRef} className={`lazy-video-container ${className}`}>
      {isInView ? (
        <>
          {!isLoaded && !errorType && (
            <div className="lazy-video-placeholder">
              <div className="lazy-video-shimmer" />
              <div className="lazy-video-icon">▶</div>
            </div>
          )}
          {errorType ? (
            <div className="lazy-video-error">
              <div className="lazy-video-error-icon">⚠</div>
              <span>{t(`video.errors.${errorType}`)}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={src}
              controls
              preload="metadata"
              playsInline
              className={`lazy-video ${isLoaded ? 'loaded' : ''}`}
              onLoadedData={() => setIsLoaded(true)}
              onError={handleVideoError}
            />
          )}
        </>
      ) : (
        <div className="lazy-video-placeholder">
          <div className="lazy-video-shimmer" />
          <div className="lazy-video-icon">▶</div>
        </div>
      )}
    </div>
  )
}
