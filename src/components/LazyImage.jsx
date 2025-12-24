import { useState, useRef, useEffect } from 'react'
import './LazyImage.css'

export default function LazyImage({ src, alt, className = '', placeholder = null }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
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

  return (
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
            className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />
        </>
      ) : (
        <div className="lazy-image-placeholder">
          {placeholder || <div className="lazy-image-shimmer" />}
        </div>
      )}
    </div>
  )
}
