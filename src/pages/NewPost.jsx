import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './NewPost.css'

export default function NewPost() {
  const { profile, family } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!message.trim() && !image) {
      setError('Please add a message or photo')
      return
    }

    setLoading(true)
    setError('')

    try {
      let contentUrl = null
      let contentType = 'text'

      // Upload image if present
      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, image)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName)

        contentUrl = publicUrl
        contentType = 'photo'
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          family_id: family.id,
          content_type: contentType,
          content_url: contentUrl,
          message: message.trim(),
        })

      if (postError) throw postError

      navigate('/feed')
    } catch (err) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const canPost = message.trim() || image

  return (
    <div className="new-post-page">
      <header className="new-post-header">
        <Link to="/feed" className="close-btn">×</Link>
        <h1>Share an Update</h1>
        <button
          className="post-btn"
          onClick={handleSubmit}
          disabled={!canPost || loading}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </header>

      <main className="new-post-content">
        {error && <div className="auth-error">{error}</div>}

        <div className="post-author-preview">
          <img
            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=FF6B6B&color=fff`}
            alt={profile?.name}
            className="avatar avatar-md"
          />
          <span className="author-name">{profile?.name}</span>
        </div>

        <textarea
          placeholder="What's happening with you?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="post-textarea"
          autoFocus
        />

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" />
            <button className="remove-image" onClick={removeImage}>×</button>
          </div>
        )}

        <div className="post-actions">
          <label className="photo-btn">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
            <span className="action-icon">📷</span>
            <span>Add Photo</span>
          </label>
        </div>
      </main>
    </div>
  )
}
