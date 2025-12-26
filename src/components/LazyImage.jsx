import { useState, useRef, useEffect } from 'react'
import Lightbox from './Lightbox'
import './LazyImage.css'

export default function LazyImage({ src, alt, className = '', placeholder = null, disableLightbox = false }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const imgRef = useRef(null)

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

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleClick = () => {
    if (!disableLightbox && isLoaded) {
      setShowLightbox(true)
    }
  }

  return (
    <>
      <div ref={imgRef} className={`lazy-image-container ${className}`}>
        {isInView ? (
          <>
            {!isLoaded && (
              <div className="lazy-image-placeholder">
                {placeholder || <div className="lazy-image-shimmer" />}
              </div>
            )}
            <img
              src={src}
              alt={alt}
              className={`lazy-image ${isLoaded ? 'loaded' : ''} ${!disableLightbox ? 'clickable' : ''}`}
              onLoad={() => setIsLoaded(true)}
              onClick={handleClick}
              loading="lazy"
            />
          </>
        ) : (
          <div className="lazy-image-placeholder">
            {placeholder || <div className="lazy-image-shimmer" />}
          </div>
        )}
      </div>

      {showLightbox && (
        <Lightbox
          src={src}
          alt={alt}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  )
}
