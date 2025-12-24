/**
 * Compress an image file to reduce size while maintaining quality
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    type = 'image/jpeg'
  } = options

  // Don't compress non-images
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Don't compress GIFs (they lose animation)
  if (file.type === 'image/gif') {
    return file
  }

  // Skip if already small enough (< 500KB)
  if (file.size < 500 * 1024) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to blob conversion failed'))
            return
          }

          // Create new file from blob
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '.jpg'),
            { type, lastModified: Date.now() }
          )

          // Only use compressed if it's actually smaller
          if (compressedFile.size < file.size) {
            console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`)
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        type,
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target.result
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}
