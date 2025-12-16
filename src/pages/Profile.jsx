import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getCurrentWeekNumber } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import './Profile.css'

export default function Profile() {
  const { profile, family, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [weeklyCompleted, setWeeklyCompleted] = useState(0)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="page profile-page">
      <header className="profile-header">
        <div className="profile-avatar-container">
          <img
            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=FF6B6B&color=fff&size=120`}
            alt={profile?.name}
            className="avatar avatar-xl"
          />
        </div>

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
            <div className="family-info">
              <span className="family-name">{family?.name || 'No family'}</span>
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
          </div>
        </section>

        {/* Settings */}
        <section className="profile-section">
          <h2>Settings</h2>
          <div className="card">
            <button className="logout-btn" onClick={handleSignOut}>
              Log Out
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
