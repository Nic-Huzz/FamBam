import { useState, useRef } from 'react'
import LazyImage from './LazyImage'
import LazyVideo from './LazyVideo'
import './PhotoCarousel.css'

export default function PhotoCarousel({ media }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  if (!media || media.length === 0) return null

  // Single image - no carousel needed
  if (media.length === 1) {
    const item = media[0]
    return item.media_type === 'video' ? (
      <LazyVideo src={item.media_url} className="post-video" />
    ) : (
      <LazyImage src={item.media_url} alt="Post" className="post-image" />
    )
  }

  const goTo = (index) => {
    if (index >= 0 && index < media.length) {
      setCurrentIndex(index)
    }
  }

  const goNext = () => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (diff > threshold) {
      goNext()
    } else if (diff < -threshold) {
      goPrev()
    }
  }

  return (
    <div className="photo-carousel">
      <div
        className="carousel-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {media.map((item, index) => (
            <div key={item.id || index} className="carousel-slide">
              {item.media_type === 'video' ? (
                <LazyVideo src={item.media_url} className="carousel-video" />
              ) : (
                <LazyImage src={item.media_url} alt={`Photo ${index + 1}`} className="carousel-image" />
              )}
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button className="carousel-arrow carousel-arrow-left" onClick={goPrev}>
            <span>&#8249;</span>
          </button>
        )}
        {currentIndex < media.length - 1 && (
          <button className="carousel-arrow carousel-arrow-right" onClick={goNext}>
            <span>&#8250;</span>
          </button>
        )}
      </div>

      {/* Dots indicator */}
      <div className="carousel-dots">
        {media.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>

      {/* Counter badge */}
      <div className="carousel-counter">
        {currentIndex + 1} / {media.length}
      </div>
    </div>
  )
}
