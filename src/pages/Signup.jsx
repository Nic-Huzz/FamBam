import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, generateInviteCode } from '../lib/supabase'
import './Auth.css'

export default function Signup() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinType, setJoinType] = useState('join') // 'join' or 'create'
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError(t('auth.signup.errorName'))
      return
    }

    if (!email || !password) {
      setError(t('auth.login.errorEmpty'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.signup.errorPassword'))
      return
    }

    if (joinType === 'join' && !inviteCode.trim()) {
      setError(t('auth.signup.joinFamily.errorCode'))
      return
    }

    if (joinType === 'create' && !familyName.trim()) {
      setError(t('auth.signup.errorName'))
      return
    }

    setLoading(true)

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error(t('auth.login.errorGeneric'))
      }

      // Handle family - join or create
      let familyId = null

      if (joinType === 'join') {
        // Join existing family
        const { data: existingFamily, error: familyError } = await supabase
          .from('families')
          .select('id')
          .eq('invite_code', inviteCode.toUpperCase())
          .single()

        if (familyError || !existingFamily) {
          throw new Error(t('auth.signup.joinFamily.errorInvalid'))
        }
        familyId = existingFamily.id
      } else {
        // Create new family with current user as admin
        const newCode = generateInviteCode()

        const { data: newFamily, error: createError } = await supabase
          .from('families')
          .insert({
            name: familyName,
            invite_code: newCode,
            created_by: authData.user.id
          })
          .select()
          .single()

        if (createError) throw createError
        familyId = newFamily.id
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: name.trim(),
          family_id: familyId,
          points_total: 0,
          streak_days: 0,
        })

      if (profileError) throw profileError

      navigate('/feed')
    } catch (err) {
      if (err.message.includes('already registered')) {
        setError(t('auth.signup.errorEmail'))
      } else {
        setError(err.message || t('auth.login.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">FamBam</Link>
          <h1>{t('auth.signup.title')}</h1>
          <p>{t('auth.signup.subtitle')}</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">{t('auth.signup.name')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.signup.namePlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('auth.signup.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.signup.emailPlaceholder')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.signup.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.signup.passwordPlaceholder')}
              required
            />
          </div>

          <div className="join-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${joinType === 'join' ? 'active' : ''}`}
              onClick={() => setJoinType('join')}
            >
              {t('auth.signup.joinFamily.title')}
            </button>
            <button
              type="button"
              className={`toggle-btn ${joinType === 'create' ? 'active' : ''}`}
              onClick={() => setJoinType('create')}
            >
              {t('auth.signup.createFamily.title')}
            </button>
          </div>

          {joinType === 'join' ? (
            <div className="form-group">
              <label htmlFor="inviteCode">{t('auth.signup.joinFamily.code')}</label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder={t('auth.signup.joinFamily.codePlaceholder')}
                maxLength={8}
              />
              <p className="form-hint">{t('auth.signup.joinFamily.subtitle')}</p>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="familyName">{t('auth.signup.createFamily.name')}</label>
              <input
                type="text"
                id="familyName"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder={t('auth.signup.createFamily.namePlaceholder')}
              />
              <p className="form-hint">{t('auth.signup.createFamily.subtitle')}</p>
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? t('auth.signup.submitting') : t('auth.signup.submitButton')}
          </button>
        </form>

        <p className="auth-footer">
          {t('auth.signup.haveAccount')} <Link to="/login">{t('auth.signup.signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
