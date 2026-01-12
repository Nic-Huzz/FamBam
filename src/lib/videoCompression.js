import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg = null
let ffmpegLoaded = false

/**
 * Load FFmpeg WASM (cached after first load)
 */
async function loadFFmpeg(onProgress) {
  if (ffmpegLoaded && ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100))
    }
  })

  // Load from CDN for better caching
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  ffmpegLoaded = true
  return ffmpeg
}

/**
 * Compress a video file for upload
 *
 * @param {File} videoFile - The video file to compress
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<File>} - Compressed video file
 */
export async function compressVideo(videoFile, onProgress) {
  const inputName = 'input' + getExtension(videoFile.name)
  const outputName = 'output.mp4'

  try {
    // Report loading phase
    if (onProgress) onProgress(0)

    const ff = await loadFFmpeg(onProgress)

    // Write input file to FFmpeg virtual filesystem
    await ff.writeFile(inputName, await fetchFile(videoFile))

    // Compress with these settings:
    // -vf scale=-2:720 = Scale to 720p height, auto width (maintains aspect ratio)
    // -c:v libx264 = H.264 codec (widely compatible)
    // -crf 28 = Quality (23=high, 28=medium, 35=low) - 28 is good balance
    // -preset fast = Encoding speed (faster = larger file, slower = smaller)
    // -c:a aac -b:a 128k = AAC audio at 128kbps
    // -movflags +faststart = Optimize for web streaming
    await ff.exec([
      '-i', inputName,
      '-vf', 'scale=-2:720',
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName
    ])

    // Read the output file
    const data = await ff.readFile(outputName)

    // Clean up
    await ff.deleteFile(inputName)
    await ff.deleteFile(outputName)

    // Create a new File object
    const compressedFile = new File(
      [data.buffer],
      videoFile.name.replace(/\.[^.]+$/, '.mp4'),
      { type: 'video/mp4' }
    )

    // Log compression results
    const originalMB = (videoFile.size / (1024 * 1024)).toFixed(2)
    const compressedMB = (compressedFile.size / (1024 * 1024)).toFixed(2)
    const savings = (100 - (compressedFile.size / videoFile.size * 100)).toFixed(0)
    console.log(`Video compressed: ${originalMB}MB → ${compressedMB}MB (${savings}% smaller)`)

    return compressedFile
  } catch (error) {
    console.error('Video compression failed:', error)
    // Return original file if compression fails
    return videoFile
  }
}

/**
 * Check if a file needs compression (videos over 5MB)
 */
export function shouldCompress(file) {
  const isVideo = file.type.startsWith('video/')
  const sizeInMB = file.size / (1024 * 1024)
  return isVideo && sizeInMB > 5
}

/**
 * Get file extension
 */
function getExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return '.' + ext
}
