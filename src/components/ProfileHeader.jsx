import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './ProfileHeader.css'

export default function ProfileHeader() {
  const { t } = useTranslation()
  const { profile, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      alert('Image too large. Max size: 5MB')
      return
    }

    setAvatarUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      await refreshProfile()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar. Make sure the avatars bucket exists in Supabase.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSaveName = async () => {
    if (!newName.trim() || newName === profile?.name) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: newName.trim() })
        .eq('id', profile.id)

      if (error) throw error
      await refreshProfile()
      setEditing(false)
    } catch (error) {
      console.error('Error updating name:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <header className="profile-header">
      <label className="profile-avatar-container">
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          hidden
          disabled={avatarUploading}
        />
        <img
          src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=FF6B6B&color=fff&size=120`}
          alt={profile?.name}
          className={`avatar avatar-xl ${avatarUploading ? 'uploading' : ''}`}
        />
        <span className="avatar-edit-icon">
          {avatarUploading ? '...' : '📷'}
        </span>
      </label>

      {editing ? (
        <div className="edit-name">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={handleSaveName} disabled={saving}>
              {saving ? t('profile.edit.saving') : t('profile.edit.save')}
            </button>
            <button onClick={() => setEditing(false)} className="cancel">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-name-row">
          <h1>{profile?.name}</h1>
          <button className="edit-btn" onClick={() => {
            setNewName(profile?.name || '')
            setEditing(true)
          }}>
            {t('profile.edit.button')}
          </button>
        </div>
      )}
    </header>
  )
}
