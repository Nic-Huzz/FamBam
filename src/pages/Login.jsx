import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Login() {
  const [authMethod, setAuthMethod] = useState('phone') // 'phone' or 'email'
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('input') // 'input' or 'verify'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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

      console.log('OTP Response:', { data, error })

      if (error) {
        console.error('OTP Error:', error)
        throw error
      }

      setStep('verify')
    } catch (err) {
      console.error('Catch block error:', err)
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

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // New user - redirect to complete signup
        navigate('/signup?complete=true&phone=' + encodeURIComponent(getE164Phone(phone)))
      } else {
        navigate('/feed')
      }
    } catch (err) {
      setError(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      navigate('/feed')
    } catch (err) {
      console.error('Login error:', err)
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password')
      } else {
        setError(err.message || 'Failed to sign in')
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
          <h1>Welcome back!</h1>
          <p>
            {step === 'input'
              ? 'Sign in to connect with your family'
              : `We sent a code to ${formatPhoneDisplay(phone)}`
            }
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
                  {loading ? 'Sending...' : 'Send Login Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailLogin} className="auth-form">
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
                    placeholder="Your password"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
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
              {loading ? 'Verifying...' : 'Verify & Login'}
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

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
