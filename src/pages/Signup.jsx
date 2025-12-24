import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, generateInviteCode } from '../lib/supabase'
import './Auth.css'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const isCompleting = searchParams.get('complete') === 'true'
  const phoneFromUrl = searchParams.get('phone') || ''

  const [authMethod, setAuthMethod] = useState('phone') // 'phone' or 'email'
  const [step, setStep] = useState(isCompleting ? 'details' : 'input') // 'input', 'verify', 'details'
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [joinType, setJoinType] = useState('join') // 'join' or 'create'
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Store verified user data
  const [verifiedUserId, setVerifiedUserId] = useState(null)
  const [verifiedPhone, setVerifiedPhone] = useState(phoneFromUrl)
  const [verifiedEmail, setVerifiedEmail] = useState('')

  // If completing signup from login redirect, get current user
  useEffect(() => {
    if (isCompleting) {
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setVerifiedUserId(user.id)
          setVerifiedPhone(phoneFromUrl || user.phone || '')
          setVerifiedEmail(user.email || '')
        } else {
          setStep('input')
        }
      }
      checkUser()
    }
  }, [isCompleting, phoneFromUrl])

  // Format phone number for display (Australian format)
  const formatPhoneDisplay = (value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }

  // Get E.164 format for API (Australian +61)
  const getE164Phone = (value) => {
    let digits = value.replace(/\D/g, '')
    // Remove leading 0 if present
    if (digits.startsWith('0')) {
      digits = digits.slice(1)
    }
    return `+61${digits}`
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')

    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: getE164Phone(phone),
      })

      if (error) throw error
      setStep('verify')
    } catch (err) {
      setError(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: getE164Phone(phone),
        token: otp,
        type: 'sms'
      })

      if (error) throw error

      setVerifiedUserId(data.user.id)
      setVerifiedPhone(getE164Phone(phone))
      setStep('details')
    } catch (err) {
      setError(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

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
          phone: verifiedPhone || '',
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
            {step === 'verify' && 'Verify your number'}
            {step === 'details' && 'Almost there!'}
          </h1>
          <p>
            {step === 'input' && 'Create an account to start connecting'}
            {step === 'verify' && `We sent a code to ${formatPhoneDisplay(phone)}`}
            {step === 'details' && 'Tell us a bit about yourself'}
          </p>
        </div>

        {step === 'input' && (
          <>
            {/* Auth Method Toggle */}
            <div className="auth-method-toggle">
              <button
                type="button"
                className={`method-btn ${authMethod === 'phone' ? 'active' : ''}`}
                onClick={() => { setAuthMethod('phone'); setError('') }}
              >
                Phone
              </button>
              <button
                type="button"
                className={`method-btn ${authMethod === 'email' ? 'active' : ''}`}
                onClick={() => { setAuthMethod('email'); setError('') }}
              >
                Email
              </button>
            </div>

            {authMethod === 'phone' ? (
              <form onSubmit={handleSendCode} className="auth-form">
                {error && <div className="auth-error">{error}</div>}

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+61</span>
                    <input
                      type="tel"
                      id="phone"
                      value={formatPhoneDisplay(phone)}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="0412 345 678"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </form>
            ) : (
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
          </>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="otp-input"
                maxLength={6}
                required
                autoFocus
              />
              <p className="form-hint">Check your texts for the 6-digit code</p>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              className="btn-secondary auth-submit"
              onClick={() => {
                setStep('input')
                setOtp('')
                setError('')
              }}
            >
              Use different number
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
