import { useState, useRef, useEffect } from 'react'
import './LazyVideo.css'

export default function LazyVideo({ src, className = '' }) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef(null)

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

  return (
    <div ref={containerRef} className={`lazy-video-container ${className}`}>
      {isInView ? (
        <>
          {!isLoaded && (
            <div className="lazy-video-placeholder">
              <div className="lazy-video-shimmer" />
              <div className="lazy-video-icon">▶</div>
            </div>
          )}
          <video
            src={src}
            controls
            preload="metadata"
            className={`lazy-video ${isLoaded ? 'loaded' : ''}`}
            onLoadedData={() => setIsLoaded(true)}
          />
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
