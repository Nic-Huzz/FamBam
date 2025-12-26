import { useEffect } from 'react'
import './Lightbox.css'

export default function Lightbox({ src, alt, onClose }) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>×</button>
      <img
        src={src}
        alt={alt}
        className="lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
