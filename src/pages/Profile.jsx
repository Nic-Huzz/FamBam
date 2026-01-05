import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useWeeklyStats, useBadges } from '../hooks'
import BottomNav from '../components/BottomNav'
import BadgeDisplay from '../components/BadgeDisplay'
import ConnectionsTab from '../components/ConnectionsTab'
import ProfileHeader from '../components/ProfileHeader'
import FamilySection from '../components/FamilySection'
import SettingsSection from '../components/SettingsSection'
import './Profile.css'

export default function Profile() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { weeklyCompleted } = useWeeklyStats(profile?.id)
  const { badges } = useBadges(profile?.id)
  const [activeTab, setActiveTab] = useState('badges')

  return (
    <div className="page profile-page">
      <ProfileHeader />

      <main className="page-content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{profile?.points_total || 0}</span>
            <span className="stat-label">{t('profile.stats.points')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {profile?.streak_days || 0} <span className="streak-fire">🔥</span>
            </span>
            <span className="stat-label">{t('profile.stats.streak')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{weeklyCompleted}</span>
            <span className="stat-label">{t('challenges.thisWeek')}</span>
          </div>
        </div>

        {/* Badges & Connections Tabs */}
        <section className="profile-section">
          <div className="profile-tabs">
            <button
              className={`profile-tab ${activeTab === 'badges' ? 'active' : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              {t('profile.badges.title')}
            </button>
            <button
              className={`profile-tab ${activeTab === 'connections' ? 'active' : ''}`}
              onClick={() => setActiveTab('connections')}
            >
              {t('profile.connections.title')}
            </button>
          </div>

          {activeTab === 'badges' ? (
            <div className="card badges-card">
              <BadgeDisplay badges={badges} showEmpty={true} />
            </div>
          ) : (
            <ConnectionsTab />
          )}
        </section>

        <FamilySection />
        <SettingsSection />
      </main>

      <BottomNav />
    </div>
  )
}
