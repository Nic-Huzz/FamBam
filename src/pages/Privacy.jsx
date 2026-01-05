import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Legal.css'

export default function Privacy() {
  const { t } = useTranslation()

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="back-link">← {t('common.back')}</Link>
        <h1>{t('legal.privacy.title')}</h1>
      </header>

      <main className="legal-content">
        <p className="last-updated">{t('legal.privacy.lastUpdated', { date: 'December 2024' })}</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly:</p>
          <ul>
            <li>Account information (name, email)</li>
            <li>Profile information (avatar)</li>
            <li>Content you post (photos, videos, messages)</li>
            <li>Family group information</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the FamBam service</li>
            <li>Share your posts with your family members</li>
            <li>Send notifications about family activity</li>
            <li>Improve and personalize your experience</li>
          </ul>
        </section>

        <section>
          <h2>3. Information Sharing</h2>
          <p>
            We do not sell your personal information. Your posts and content are
            only shared with members of your family group. We may share information
            with service providers who help us operate the platform.
          </p>
        </section>

        <section>
          <h2>4. Data Storage</h2>
          <p>
            Your data is stored securely using industry-standard encryption.
            We use Supabase for authentication and data storage, which provides
            enterprise-grade security.
          </p>
        </section>

        <section>
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Opt out of notifications</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>
            We retain your data as long as your account is active. When you delete
            your account, we delete your personal data within 30 days, except where
            we are required to retain it for legal purposes.
          </p>
        </section>

        <section>
          <h2>7. Cookies and Tracking</h2>
          <p>
            We use essential cookies to maintain your session and preferences.
            We do not use third-party tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            FamBam is intended for family use. Children under 13 should only use
            the service with parental supervision and consent.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of
            significant changes through the app.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or your data,
            please contact us through the app.
          </p>
        </section>
      </main>
    </div>
  )
}
