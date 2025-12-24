import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, generateInviteCode } from '../lib/supabase'
import './Auth.css'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const isCompleting = searchParams.get('complete') === 'true'

  const [step, setStep] = useState(isCompleting ? 'details' : 'input') // 'input' or 'details'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [joinType, setJoinType] = useState('join') // 'join' or 'create'
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Store verified user data
  const [verifiedUserId, setVerifiedUserId] = useState(null)
  const [verifiedEmail, setVerifiedEmail] = useState('')

  // If completing signup from login redirect, get current user
  useEffect(() => {
    if (isCompleting) {
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setVerifiedUserId(user.id)
          setVerifiedEmail(user.email || '')
        } else {
          setStep('input')
        }
      }
      checkUser()
    }
  }, [isCompleting])

  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setVerifiedUserId(data.user.id)
        setVerifiedEmail(email)
        setStep('details')
      }
    } catch (err) {
      if (err.message.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.')
      } else {
        setError(err.message || 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (joinType === 'join' && !inviteCode.trim()) {
      setError('Please enter your family invite code')
      return
    }

    if (joinType === 'create' && !familyName.trim()) {
      setError('Please enter a name for your family')
      return
    }

    setLoading(true)

    try {
      let familyId = null

      if (joinType === 'join') {
        const { data: existingFamily, error: familyError } = await supabase
          .from('families')
          .select('id')
          .eq('invite_code', inviteCode.toUpperCase())
          .single()

        if (familyError || !existingFamily) {
          throw new Error('Invalid invite code')
        }
        familyId = existingFamily.id
      } else {
        const newCode = generateInviteCode()

        const { data: newFamily, error: createError } = await supabase
          .from('families')
          .insert({
            name: familyName,
            invite_code: newCode,
            created_by: verifiedUserId
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
          id: verifiedUserId,
          email: verifiedEmail || '',
          name: name.trim(),
          family_id: familyId,
          points_total: 0,
          streak_days: 0,
        })

      if (profileError) throw profileError

      navigate('/feed')
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">FamBam</Link>
          <h1>
            {step === 'input' && 'Join the family!'}
            {step === 'details' && 'Almost there!'}
          </h1>
          <p>
            {step === 'input' && 'Create an account to start connecting'}
            {step === 'details' && 'Tell us about yourself and your family'}
          </p>
        </div>

        {step === 'input' && (
          <form onSubmit={handleEmailSignup} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                required
              />
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleCreateProfile} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What does your family call you?"
                required
                autoFocus
              />
            </div>

            <div className="join-type-toggle">
              <button
                type="button"
                className={`toggle-btn ${joinType === 'join' ? 'active' : ''}`}
                onClick={() => setJoinType('join')}
              >
                Join existing family
              </button>
              <button
                type="button"
                className={`toggle-btn ${joinType === 'create' ? 'active' : ''}`}
                onClick={() => setJoinType('create')}
              >
                Create new family
              </button>
            </div>

            {joinType === 'join' ? (
              <div className="form-group">
                <label htmlFor="inviteCode">Family Invite Code</label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="SMITH2024"
                  maxLength={8}
                />
                <p className="form-hint">Ask a family member for the code</p>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="familyName">Family Name</label>
                <input
                  type="text"
                  id="familyName"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="The Smith Family"
                />
                <p className="form-hint">You'll get an invite code to share</p>
              </div>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
