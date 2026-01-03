import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
  isSubscribedToPush,
  registerServiceWorker
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
  const [showDebug, setShowDebug] = useState(false)
  const [debugOutput, setDebugOutput] = useState('')

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

  // Debug functions
  const debugLog = (msg) => {
    const text = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg)
    setDebugOutput(prev => prev + text + '\n')
  }

  const debugCheckStatus = async () => {
    setDebugOutput('')
    debugLog('=== Notification Status ===')
    debugLog('Push supported: ' + isPushSupported())
    debugLog('Permission: ' + (typeof Notification !== 'undefined' ? Notification.permission : 'N/A'))
    debugLog('VAPID key set: ' + !!VAPID_PUBLIC_KEY)
    debugLog('Subscribed: ' + await isSubscribedToPush())

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      debugLog('Service Worker: ' + (reg ? 'registered' : 'not registered'))
    }
  }

  const debugCheckDbSubscriptions = async () => {
    setDebugOutput('')
    debugLog('Checking push_subscriptions...')
    const { data, error } = await supabase.from('push_subscriptions').select('user_id, endpoint')
    if (error) {
      debugLog('Error: ' + error.message)
    } else {
      debugLog('Found ' + (data?.length || 0) + ' subscriptions')
      data?.forEach(s => debugLog('- ' + s.user_id.slice(0, 8) + '... → ' + s.endpoint.slice(0, 50) + '...'))
    }
  }

  const debugClearMySubscription = async () => {
    setDebugOutput('')
    debugLog('Clearing your subscription...')
    if (!profile?.id) {
      debugLog('Error: Not logged in')
      return
    }
    const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', profile.id)
    if (error) {
      debugLog('Error: ' + error.message)
    } else {
      debugLog('Deleted! Now click Subscribe to re-register.')
    }
  }

  const debugRegisterSW = async () => {
    setDebugOutput('')
    debugLog('Registering service worker...')
    try {
      const reg = await registerServiceWorker()
      debugLog('Success! Scope: ' + reg.scope)
    } catch (e) {
      debugLog('Error: ' + e.message)
    }
  }

  const debugSubscribe = async () => {
    setDebugOutput('')
    debugLog('Subscribing to push (forcing new subscription)...')
    if (!profile?.id) {
      debugLog('Error: Not logged in')
      return
    }
    if (!VAPID_PUBLIC_KEY) {
      debugLog('Error: VAPID key not set')
      return
    }
    try {
      // First, unsubscribe any existing browser subscription
      const registration = await navigator.serviceWorker.ready
      const existingSub = await registration.pushManager.getSubscription()
      if (existingSub) {
        debugLog('Unsubscribing old browser subscription...')
        await existingSub.unsubscribe()
      }

      // Delete from database
      await supabase.from('push_subscriptions').delete().eq('user_id', profile.id)

      // Now create fresh subscription
      debugLog('Creating new subscription...')
      const sub = await subscribeToPush(profile.id, VAPID_PUBLIC_KEY)
      debugLog('Success!')
      debugLog('Endpoint: ' + sub.endpoint.slice(0, 60) + '...')
    } catch (e) {
      debugLog('Error: ' + e.message)
    }
  }

  const debugLocalNotification = () => {
    setDebugOutput('')
    debugLog('Sending local notification...')
    if (Notification.permission === 'granted') {
      new Notification('Test from FamBam', {
        body: 'Local notification test successful!',
        icon: '/favicon.svg'
      })
      debugLog('Sent!')
    } else {
      debugLog('Permission: ' + Notification.permission)
    }
  }

  const debugTestEdgeFunction = async () => {
    setDebugOutput('')
    debugLog('Testing Edge Function...')
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    try {
      const res = await fetch(`${url}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'INSERT',
          table: 'posts',
          record: { user_id: profile?.id, family_id: family?.id, content: 'Test' }
        })
      })
      debugLog('Status: ' + res.status)
      const data = await res.json()
      debugLog(data)
    } catch (e) {
      debugLog('Error: ' + e.message)
    }
  }

  const debugSendToMe = async () => {
    setDebugOutput('')
    debugLog('Sending push notification to YOU...')
    debugLog('Your user_id: ' + profile?.id)
    debugLog('Your family_id: ' + family?.id)
    debugLog('Client VAPID key: ' + VAPID_PUBLIC_KEY?.slice(0, 20) + '...')

    if (!family?.id) {
      debugLog('ERROR: No family_id found!')
      return
    }

    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    try {
      // Simulate someone ELSE posting so YOU get notified
      // Use a valid UUID format that doesn't exist
      const payload = {
        type: 'INSERT',
        table: 'posts',
        record: {
          user_id: '00000000-0000-0000-0000-000000000000',  // Valid UUID, not you
          family_id: family.id,
          content: 'Test post from family member'
        }
      }
      debugLog('Sending: ' + JSON.stringify(payload.record))

      const res = await fetch(`${url}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      debugLog('Status: ' + res.status)
      const data = await res.json()
      debugLog(data)
      if (data.sent === 0 && data.total > 0) {
        debugLog('\n⚠️ Found users but failed to send')
      } else if (data.total === 0) {
        debugLog('\n⚠️ No family members found to notify')
      }
    } catch (e) {
      debugLog('Error: ' + e.message)
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

          {/* Debug Panel Toggle */}
          <button
            className="debug-toggle-btn"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide Debug' : 'Debug Notifications'}
          </button>

          {showDebug && (
            <div className="debug-panel">
              <div className="debug-buttons">
                <button onClick={debugCheckStatus}>Check Status</button>
                <button onClick={debugRegisterSW}>Register SW</button>
                <button onClick={debugSubscribe}>Subscribe</button>
                <button onClick={debugCheckDbSubscriptions}>Check DB</button>
                <button onClick={debugClearMySubscription} style={{ background: '#a00', color: '#fff' }}>Clear Mine</button>
                <button onClick={debugLocalNotification}>Local Test</button>
                <button onClick={debugTestEdgeFunction}>Test Edge Fn</button>
                <button onClick={debugSendToMe} style={{ background: '#0a0', color: '#000' }}>Send to Me</button>
              </div>
              <pre className="debug-output">{debugOutput || 'Click a button to test'}</pre>
            </div>
          )}
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
