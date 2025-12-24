import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, generateInviteCode } from '../lib/supabase'
import './Auth.css'

export default function Signup() {
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
      setError('Please enter your name')
      return
    }

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
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
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create account')
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
          throw new Error('Invalid invite code')
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
        setError('This email is already registered. Try signing in instead.')
      } else {
        setError(err.message || 'Failed to create account')
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
          <h1>Join the family!</h1>
          <p>Create an account to start connecting</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
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

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
