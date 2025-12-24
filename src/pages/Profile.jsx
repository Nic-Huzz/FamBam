import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush
} from '../lib/notifications'
import BottomNav from '../components/BottomNav'
import './Profile.css'

// VAPID public key - in production, move to environment variable
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export default function Profile() {
  const { profile, family, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [weeklyCompleted, setWeeklyCompleted] = useState(0)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Family management state
  const [familyMembers, setFamilyMembers] = useState([])
  const [editingFamily, setEditingFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState(family?.name || '')
  const [savingFamily, setSavingFamily] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [familyAvatarUploading, setFamilyAvatarUploading] = useState(false)

  const isAdmin = family?.created_by === profile?.id

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      if (!profile?.id) return

      const weekNumber = getCurrentWeekNumber()
      const { count } = await supabase
        .from('completed_challenges')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('week_number', weekNumber)

      setWeeklyCompleted(count || 0)
    }

    fetchWeeklyStats()
  }, [profile?.id])

  // Check push notification status
  useEffect(() => {
    const checkNotificationStatus = async () => {
      const supported = isPushSupported()
      setPushSupported(supported)

      // Check if notifications are enabled (either via push subscription or permission)
      if (supported) {
        const subscribed = await isSubscribedToPush()
        setNotificationsEnabled(subscribed)
      } else if ('Notification' in window) {
        // Fallback: just check permission
        setNotificationsEnabled(Notification.permission === 'granted')
      }
    }

    checkNotificationStatus()
  }, [])

  // Fetch family members
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!family?.id) return

      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, points_total')
        .eq('family_id', family.id)
        .order('name')

      if (!error && data) {
        setFamilyMembers(data)
      }
    }

    fetchFamilyMembers()
  }, [family?.id])

  const handleNotificationToggle = async () => {
    if (!profile?.id) return

    setNotificationLoading(true)
    try {
      if (notificationsEnabled) {
        // Disable notifications
        if (pushSupported) {
          await unsubscribeFromPush(profile.id)
        }
        setNotificationsEnabled(false)
      } else {
        // Request permission first
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('Notification permission was denied. Please enable it in your browser settings.')
          return
        }

        // If push is supported and VAPID key is set, do full push subscription
        if (pushSupported && VAPID_PUBLIC_KEY) {
          await subscribeToPush(profile.id, VAPID_PUBLIC_KEY)
        }
        setNotificationsEnabled(true)
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      if (error.message?.includes('denied')) {
        alert('Notification permission was denied. Please enable it in your browser settings.')
      }
    } finally {
      setNotificationLoading(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    // Validate file
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

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update user profile
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

  const handleFamilyAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !family?.id) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      alert('Image too large. Max size: 5MB')
      return
    }

    setFamilyAvatarUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `family-${family.id}-avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('families')
        .update({ avatar_url: publicUrl })
        .eq('id', family.id)

      if (updateError) throw updateError

      await refreshProfile()
    } catch (error) {
      console.error('Error uploading family avatar:', error)
      alert('Failed to upload family avatar. Make sure the avatars bucket exists in Supabase.')
    } finally {
      setFamilyAvatarUploading(false)
    }
  }

  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Family management handlers
  const handleSaveFamilyName = async () => {
    if (!newFamilyName.trim() || newFamilyName === family?.name || !isAdmin) {
      setEditingFamily(false)
      return
    }

    setSavingFamily(true)
    try {
      const { error } = await supabase
        .from('families')
        .update({ name: newFamilyName.trim() })
        .eq('id', family.id)

      if (error) throw error
      await refreshProfile()
      setEditingFamily(false)
    } catch (error) {
      console.error('Error updating family name:', error)
    } finally {
      setSavingFamily(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!isAdmin || memberId === profile?.id) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ family_id: null })
        .eq('id', memberId)

      if (error) throw error
      setFamilyMembers(prev => prev.filter(m => m.id !== memberId))
      setShowRemoveConfirm(null)
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const handleTransferOwnership = async (newOwnerId) => {
    if (!isAdmin || newOwnerId === profile?.id) return

    try {
      const { error } = await supabase
        .from('families')
        .update({ created_by: newOwnerId })
        .eq('id', family.id)

      if (error) throw error
      await refreshProfile()
      setShowTransferModal(false)
    } catch (error) {
      console.error('Error transferring ownership:', error)
    }
  }

  const handleLeaveFamily = async () => {
    if (isAdmin) {
      alert('Please transfer ownership before leaving the family.')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ family_id: null })
        .eq('id', profile.id)

      if (error) throw error
      await refreshProfile()
      navigate('/login')
    } catch (error) {
      console.error('Error leaving family:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    if (isAdmin && familyMembers.length > 1) {
      alert('Please transfer family ownership before deleting your account.')
      return
    }

    setDeleting(true)
    try {
      // Delete user's posts
      await supabase.from('posts').delete().eq('user_id', profile.id)

      // Delete user's completed challenges
      await supabase.from('completed_challenges').delete().eq('user_id', profile.id)

      // Delete user's comments
      await supabase.from('comments').delete().eq('user_id', profile.id)

      // Delete user's reactions
      await supabase.from('reactions').delete().eq('user_id', profile.id)

      // Delete push subscription
      await supabase.from('push_subscriptions').delete().eq('user_id', profile.id)

      // If admin of a single-person family, delete the family
      if (isAdmin && familyMembers.length === 1) {
        await supabase.from('families').delete().eq('id', family.id)
      }

      // Delete user profile
      await supabase.from('users').delete().eq('id', profile.id)

      // Sign out and delete auth user
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page profile-page">
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
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="cancel">
                Cancel
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
              Edit
            </button>
          </div>
        )}
      </header>

      <main className="page-content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{profile?.points_total || 0}</span>
            <span className="stat-label">Total Points</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {profile?.streak_days || 0} <span className="streak-fire">🔥</span>
            </span>
            <span className="stat-label">Day Streak</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{weeklyCompleted}</span>
            <span className="stat-label">This Week</span>
          </div>
        </div>

        {/* Family Info */}
        <section className="profile-section">
          <h2>Family</h2>
          <div className="card">
            <div className="family-header-row">
              <label className="family-avatar-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFamilyAvatarChange}
                  hidden
                  disabled={familyAvatarUploading}
                />
                <img
                  src={family?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(family?.name || 'Family')}&background=6B5CE7&color=fff&size=80`}
                  alt={family?.name}
                  className={`avatar avatar-lg family-avatar ${familyAvatarUploading ? 'uploading' : ''}`}
                />
                <span className="family-avatar-edit-icon">
                  {familyAvatarUploading ? '...' : '📷'}
                </span>
              </label>
              <div className="family-info">
                {editingFamily ? (
                <div className="edit-family-name">
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button onClick={handleSaveFamilyName} disabled={savingFamily}>
                      {savingFamily ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingFamily(false)} className="cancel">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="family-name-row">
                  <span className="family-name">{family?.name || 'No family'}</span>
                  {isAdmin && (
                    <button className="edit-btn-small" onClick={() => {
                      setNewFamilyName(family?.name || '')
                      setEditingFamily(true)
                    }}>
                      Edit
                    </button>
                  )}
                </div>
              )}
              {isAdmin && <span className="admin-badge">Admin</span>}
              </div>
            </div>
            {family?.invite_code && (
              <div className="invite-code-row">
                <span className="invite-label">Invite Code:</span>
                <span className="invite-code">{family.invite_code}</span>
                <button className="copy-btn" onClick={handleCopyCode}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            {/* Family Members List */}
            {familyMembers.length > 0 && (
              <div className="family-members">
                <h3>Members ({familyMembers.length})</h3>
                <div className="members-list">
                  {familyMembers.map(member => (
                    <div key={member.id} className="member-row">
                      <img
                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF6B6B&color=fff`}
                        alt={member.name}
                        className="avatar avatar-sm"
                      />
                      <div className="member-info">
                        <span className="member-name">
                          {member.name}
                          {member.id === family?.created_by && <span className="admin-tag">Admin</span>}
                          {member.id === profile?.id && <span className="you-tag">(You)</span>}
                        </span>
                        <span className="member-points">{member.points_total} pts</span>
                      </div>
                      {isAdmin && member.id !== profile?.id && (
                        <button
                          className="remove-member-btn"
                          onClick={() => setShowRemoveConfirm(member)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {isAdmin && familyMembers.length > 1 && (
              <button
                className="transfer-btn"
                onClick={() => setShowTransferModal(true)}
              >
                Transfer Ownership
              </button>
            )}

            {/* Leave Family (non-admin only) */}
            {!isAdmin && family && (
              <button
                className="leave-btn"
                onClick={() => setShowLeaveConfirm(true)}
              >
                Leave Family
              </button>
            )}
          </div>
        </section>

        {/* Transfer Ownership Modal */}
        {showTransferModal && (
          <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Transfer Ownership</h3>
              <p>Select a new admin for the family:</p>
              <div className="modal-members">
                {familyMembers.filter(m => m.id !== profile?.id).map(member => (
                  <button
                    key={member.id}
                    className="member-select-btn"
                    onClick={() => handleTransferOwnership(member.id)}
                  >
                    <img
                      src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF6B6B&color=fff`}
                      alt={member.name}
                      className="avatar avatar-sm"
                    />
                    {member.name}
                  </button>
                ))}
              </div>
              <button className="modal-cancel" onClick={() => setShowTransferModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Remove Member Confirmation */}
        {showRemoveConfirm && (
          <div className="modal-overlay" onClick={() => setShowRemoveConfirm(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Remove Member?</h3>
              <p>Are you sure you want to remove <strong>{showRemoveConfirm.name}</strong> from the family?</p>
              <div className="modal-actions">
                <button className="modal-danger" onClick={() => handleRemoveMember(showRemoveConfirm.id)}>
                  Remove
                </button>
                <button className="modal-cancel" onClick={() => setShowRemoveConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Family Confirmation */}
        {showLeaveConfirm && (
          <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Leave Family?</h3>
              <p>Are you sure you want to leave <strong>{family?.name}</strong>? You'll need an invite code to rejoin.</p>
              <div className="modal-actions">
                <button className="modal-danger" onClick={handleLeaveFamily}>
                  Leave
                </button>
                <button className="modal-cancel" onClick={() => setShowLeaveConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <section className="profile-section">
          <h2>Settings</h2>
          <div className="card settings-card">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Push Notifications</span>
                <span className="setting-desc">
                  {!('Notification' in window)
                    ? 'Not supported in this browser'
                    : notificationsEnabled
                    ? 'Enabled - you\'ll receive updates'
                    : 'Get notified about new posts and activity'}
                </span>
              </div>
              {'Notification' in window && (
                <button
                  className={`toggle-btn ${notificationsEnabled ? 'active' : ''}`}
                  onClick={handleNotificationToggle}
                  disabled={notificationLoading}
                >
                  <span className="toggle-slider"></span>
                </button>
              )}
            </div>
            <button className="logout-btn" onClick={handleSignOut}>
              Log Out
            </button>
          </div>
        </section>

        {/* Legal & Account */}
        <section className="profile-section">
          <h2>Legal & Account</h2>
          <div className="card settings-card">
            <Link to="/terms" className="setting-link">
              <span>Terms of Service</span>
              <span className="link-arrow">→</span>
            </Link>
            <Link to="/privacy" className="setting-link">
              <span>Privacy Policy</span>
              <span className="link-arrow">→</span>
            </Link>
            <button
              className="delete-account-btn"
              onClick={() => setShowDeleteAccount(true)}
            >
              Delete Account
            </button>
          </div>
        </section>

        {/* Delete Account Modal */}
        {showDeleteAccount && (
          <div className="modal-overlay" onClick={() => setShowDeleteAccount(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Delete Account?</h3>
              <p>
                This will permanently delete your account and all your data including
                posts, comments, and challenge history. This action cannot be undone.
              </p>
              <div className="form-group">
                <label>Type DELETE to confirm:</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                />
              </div>
              <div className="modal-actions">
                <button
                  className="modal-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </button>
                <button
                  className="modal-cancel"
                  onClick={() => {
                    setShowDeleteAccount(false)
                    setDeleteConfirmText('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
