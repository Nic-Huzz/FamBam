import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Landing.css'

export default function Landing() {
  const { t } = useTranslation()

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-content">
          <h1 className="landing-title">
            {t('landing.hero.title')}
          </h1>
          <p className="landing-subtitle">
            {t('landing.hero.subtitle')}
          </p>

          <div className="landing-buttons">
            <Link to="/signup" className="btn-primary">{t('landing.hero.cta')}</Link>
            <Link to="/login" className="btn-secondary">{t('landing.hero.login')}</Link>
          </div>
        </div>

        <div className="landing-mockup">
          <div className="phone-frame">
            <div className="phone-screen">
              <div className="mock-header">
                <span>The Smith Family</span>
                <span className="mock-points">145 pts</span>
              </div>
              <div className="mock-post">
                <div className="mock-avatar"></div>
                <div className="mock-content">
                  <div className="mock-name">Mum</div>
                  <div className="mock-text">Look at my garden!</div>
                </div>
              </div>
              <div className="mock-reactions">
                <span>❤️ 3</span>
                <span>🙌 2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-features">
        <div className="feature-card">
          <span className="feature-icon">📸</span>
          <h3>{t('landing.features.moments.title')}</h3>
          <p>{t('landing.features.moments.description')}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🎯</span>
          <h3>{t('landing.features.challenges.title')}</h3>
          <p>{t('landing.features.challenges.description')}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏆</span>
          <h3>{t('landing.features.leaderboard.title')}</h3>
          <p>{t('landing.features.leaderboard.description')}</p>
        </div>
      </div>
    </div>
  )
}
