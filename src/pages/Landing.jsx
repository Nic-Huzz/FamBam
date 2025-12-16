import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-content">
          <h1 className="landing-title">
            Stay closer to the ones who matter most
          </h1>
          <p className="landing-subtitle">
            FamBam helps families stay meaningfully connected through shared updates,
            fun challenges, and friendly competition.
          </p>

          <div className="landing-buttons">
            <Link to="/signup" className="btn-primary">Get Started</Link>
            <Link to="/login" className="btn-secondary">Login</Link>
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
          <h3>Share Updates</h3>
          <p>Post photos and messages to keep everyone in the loop</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🎯</span>
          <h3>Weekly Challenges</h3>
          <p>Fun activities to encourage meaningful connection</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏆</span>
          <h3>Family Leaderboard</h3>
          <p>Friendly competition to keep everyone engaged</p>
        </div>
      </div>
    </div>
  )
}
