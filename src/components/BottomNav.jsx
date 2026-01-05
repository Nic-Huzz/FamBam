import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './BottomNav.css'

export default function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav className="bottom-nav">
      <NavLink to="/feed" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">{t('nav.feed')}</span>
      </NavLink>
      <NavLink to="/challenges" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🎯</span>
        <span className="nav-label">{t('nav.challenges')}</span>
      </NavLink>
      <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🏆</span>
        <span className="nav-label">{t('leaderboard.title')}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">👤</span>
        <span className="nav-label">{t('nav.profile')}</span>
      </NavLink>
    </nav>
  )
}
