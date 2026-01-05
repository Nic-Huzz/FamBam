import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError(t('auth.signup.errorEmail'))
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err.message || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link to="/" className="auth-logo">FamBam</Link>
            <h1>{t('auth.forgotPassword.success')}</h1>
            <p><strong>{email}</strong></p>
          </div>

          <button
            className="btn-secondary auth-submit"
            onClick={() => setSuccess(false)}
          >
            {t('auth.login.email')}
          </button>

          <p className="auth-footer">
            <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">FamBam</Link>
          <h1>{t('auth.forgotPassword.title')}</h1>
          <p>{t('auth.forgotPassword.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">{t('auth.login.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.login.emailPlaceholder')}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submitButton')}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
        </p>
      </div>
    </div>
  )
}
