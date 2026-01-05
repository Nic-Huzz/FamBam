import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setValidSession(true)
      } else {
        // Try to get session from URL hash (Supabase puts tokens there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (!error) {
            setValidSession(true)
            // Clean up URL
            window.history.replaceState(null, '', window.location.pathname)
          }
        }
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError(t('auth.login.errorEmpty'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.resetPassword.errorLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.errorMismatch'))
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err.message || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link to="/" className="auth-logo">FamBam</Link>
            <h1>{t('common.loading')}</h1>
          </div>
          <div className="loading-spinner-container">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link to="/" className="auth-logo">FamBam</Link>
            <h1>{t('errors.unauthorized')}</h1>
          </div>

          <Link to="/forgot-password" className="btn-primary auth-submit">
            {t('auth.forgotPassword.submitButton')}
          </Link>

          <p className="auth-footer">
            <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link to="/" className="auth-logo">FamBam</Link>
            <h1>{t('auth.resetPassword.success')}</h1>
            <p>{t('auth.resetPassword.redirecting')}</p>
          </div>

          <Link to="/login" className="btn-primary auth-submit">
            {t('auth.login.submitButton')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">FamBam</Link>
          <h1>{t('auth.resetPassword.title')}</h1>
          <p>{t('auth.resetPassword.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="password">{t('auth.resetPassword.newPassword')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.signup.passwordPlaceholder')}
              required
              autoFocus
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.resetPassword.confirmPassword')}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submitButton')}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
        </p>
      </div>
    </div>
  )
}
