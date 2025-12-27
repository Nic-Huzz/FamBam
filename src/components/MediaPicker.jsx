import { compressImage } from '../lib/imageCompression'
import './MediaPicker.css'

const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PHOTOS = 10

export default function MediaPicker({
  mediaFiles,
  setMediaFiles,
  onError,
  disabled
}) {
  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check if adding these would exceed the limit
    if (mediaFiles.length + files.length > MAX_PHOTOS) {
      onError?.(`You can only add up to ${MAX_PHOTOS} photos/videos per post`)
      return
    }

    // Process each file
    const newMediaItems = []
    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

      if (file.size > maxSize) {
        onError?.(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`)
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

  return (
    <>
      {/* Media Previews */}
      {mediaFiles.length > 0 && (
        <div className="media-previews">
          {mediaFiles.map((item) => (
            <div key={item.id} className="media-preview-item">
              {item.type === 'video' ? (
                <video src={item.preview} />
              ) : (
                <img src={item.preview} alt="Preview" />
              )}
              <button
                className="remove-media"
                onClick={() => removeMediaItem(item.id)}
              >
                ×
              </button>
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

      {/* Add Media Button (shown in actions bar) */}
      <label className={`media-btn ${disabled ? 'disabled' : ''}`}>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaChange}
          multiple
          hidden
          disabled={disabled}
        />
        <span className="action-icon">📷</span>
        <span>Photo/Video</span>
      </label>
    </>
  )
}

// Separate component for just the button (used in actions bar)
export function MediaPickerButton({ onChange, disabled }) {
  return (
    <label className={`media-btn ${disabled ? 'disabled' : ''}`}>
      <input
        type="file"
        accept="image/*,video/*"
        onChange={onChange}
        multiple
        hidden
        disabled={disabled}
      />
      <span className="action-icon">📷</span>
      <span>Photo/Video</span>
    </label>
  )
}
