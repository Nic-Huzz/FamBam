import { Link } from 'react-router-dom'
import './Legal.css'

export default function Terms() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="back-link">← Back</Link>
        <h1>Terms of Service</h1>
      </header>

      <main className="legal-content">
        <p className="last-updated">Last updated: December 2024</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using FamBam, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            FamBam is a family connection platform that allows users to share updates,
            complete challenges, and stay connected with family members through posts,
            photos, videos, and voice notes.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account
            and for all activities that occur under your account. You must provide
            accurate information when creating an account.
          </p>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Post content that is illegal, harmful, or offensive</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Attempt to gain unauthorized access to the service</li>
            <li>Use the service for commercial purposes without permission</li>
          </ul>
        </section>

        <section>
          <h2>5. Content Ownership</h2>
          <p>
            You retain ownership of content you post. By posting content, you grant
            FamBam a license to store, display, and share your content with your
            family members as part of the service.
          </p>
        </section>

        <section>
          <h2>6. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our{' '}
            <Link to="/privacy">Privacy Policy</Link> to understand how we collect,
            use, and protect your information.
          </p>
        </section>

        <section>
          <h2>7. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account if you violate
            these terms. You may also delete your account at any time from your
            profile settings.
          </p>
        </section>

        <section>
          <h2>8. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. We will notify users of
            significant changes through the app or via email.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>
            If you have questions about these terms, please contact us through the app.
          </p>
        </section>
      </main>
    </div>
  )
}
