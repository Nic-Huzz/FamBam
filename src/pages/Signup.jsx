import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, generateInviteCode } from '../lib/supabase'
import './Auth.css'

export default function Signup() {
  const [step, setStep] = useState('details') // 'details', 'verify'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [joinType, setJoinType] = useState('join') // 'join' or 'create'
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Store signup data for after verification
  const [signupData, setSignupData] = useState(null)

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')

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
      // Send OTP
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            name: name,
          }
        }
      })

      if (error) throw error

      // Store data for after verification
      setSignupData({
        name,
        email,
        familyName: joinType === 'create' ? familyName : null,
        inviteCode: joinType === 'join' ? inviteCode : null,
      })

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
      // Verify OTP
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      })

      if (verifyError) throw verifyError

      // Now create the family and profile
      let familyId = null

      if (signupData.inviteCode) {
        // Join existing family
        const { data: existingFamily, error: familyError } = await supabase
          .from('families')
          .select('id')
          .eq('invite_code', signupData.inviteCode.toUpperCase())
          .single()

        if (familyError || !existingFamily) {
          throw new Error('Invalid invite code')
        }
        familyId = existingFamily.id
      } else if (signupData.familyName) {
        // Create new family
        const newCode = generateInviteCode()

        const { data: newFamily, error: createError } = await supabase
          .from('families')
          .insert({ name: signupData.familyName, invite_code: newCode })
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
          email: signupData.email,
          name: signupData.name,
          family_id: familyId,
          points_total: 0,
          streak_days: 0,
        })

      if (profileError) throw profileError

      navigate('/feed')
    } catch (err) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">FamBam</Link>
          <h1>{step === 'details' ? 'Join the family!' : 'Verify your email'}</h1>
          <p>
            {step === 'details'
              ? 'Create an account to start connecting'
              : `We sent a code to ${email}`
            }
          </p>
        </div>

        {step === 'details' ? (
          <form onSubmit={handleSendCode} className="auth-form">
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
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
              {loading ? 'Sending code...' : 'Continue'}
            </button>
          </form>
        ) : (
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
              <p className="form-hint">Check your email for the 6-digit code</p>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading || otp.length !== 6}>
              {loading ? 'Creating account...' : 'Verify & Create Account'}
            </button>

            <button
              type="button"
              className="btn-secondary auth-submit"
              onClick={() => {
                setStep('details')
                setOtp('')
                setError('')
              }}
            >
              Go back
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
