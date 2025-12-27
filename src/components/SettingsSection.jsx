import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToPush,
  unsubscribeFromPush
} from '../lib/notifications'
import './SettingsSection.css'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export default function SettingsSection() {
  const { profile, family, signOut } = useAuth()
  const navigate = useNavigate()

  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [familyMembers, setFamilyMembers] = useState([])

  const isAdmin = family?.created_by === profile?.id

  // Check push notification status
  useEffect(() => {
    const notificationSupported = 'Notification' in window
    setPushSupported(notificationSupported)

    if (notificationSupported) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  // Fetch family members count for delete validation
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!family?.id) return

      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', family.id)

      if (data) {
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
        if (VAPID_PUBLIC_KEY) {
          await unsubscribeFromPush(profile.id)
        }
        alert('To fully disable notifications, go to your browser settings for this site.')
        setNotificationsEnabled(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setNotificationsEnabled(true)

          if (VAPID_PUBLIC_KEY) {
            try {
              await subscribeToPush(profile.id, VAPID_PUBLIC_KEY)
            } catch (pushError) {
              console.log('Push subscription failed, using basic notifications:', pushError)
            }
          }

          new Notification('Notifications Enabled!', {
            body: 'You\'ll now receive updates from FamBam',
            icon: '/favicon.svg'
          })
        } else if (permission === 'denied') {
          alert('Notification permission was denied. To enable, click the lock icon in your browser\'s address bar and allow notifications.')
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
    } finally {
      setNotificationLoading(false)
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    if (isAdmin && familyMembers.length > 1) {
      alert('Please transfer family ownership before deleting your account.')
      return
    }

    setDeleting(true)
    try {
      await supabase.from('posts').delete().eq('user_id', profile.id)
      await supabase.from('completed_challenges').delete().eq('user_id', profile.id)
      await supabase.from('comments').delete().eq('user_id', profile.id)
      await supabase.from('reactions').delete().eq('user_id', profile.id)
      await supabase.from('push_subscriptions').delete().eq('user_id', profile.id)

      if (isAdmin && familyMembers.length === 1) {
        await supabase.from('families').delete().eq('id', family.id)
      }

      await supabase.from('users').delete().eq('id', profile.id)
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
    <>
      {/* Settings */}
      <section className="profile-section">
        <h2>Settings</h2>
        <div className="card settings-card">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Notifications</span>
              <span className="setting-desc">
                {!pushSupported
                  ? 'Not supported in this browser'
                  : notificationsEnabled
                  ? 'Enabled - you\'ll receive updates'
                  : 'Get notified about new posts and activity'}
              </span>
            </div>
            {pushSupported && (
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
    </>
  )
}
