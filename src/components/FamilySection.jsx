import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useFamilyMembers } from '../hooks'
import './FamilySection.css'

export default function FamilySection() {
  const { profile, family, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { members: familyMembers, setMembers: setFamilyMembers } = useFamilyMembers(family?.id)

  const [editingFamily, setEditingFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState(family?.name || '')
  const [savingFamily, setSavingFamily] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [familyAvatarUploading, setFamilyAvatarUploading] = useState(false)
  const [copied, setCopied] = useState(false)

  const isAdmin = family?.created_by === profile?.id

  const handleFamilyAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !family?.id) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      alert('Image too large. Max size: 5MB')
      return
    }

    setFamilyAvatarUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `family-${family.id}-avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('families')
        .update({ avatar_url: publicUrl })
        .eq('id', family.id)

      if (updateError) throw updateError

      await refreshProfile()
    } catch (error) {
      console.error('Error uploading family avatar:', error)
      alert('Failed to upload family avatar. Make sure the avatars bucket exists in Supabase.')
    } finally {
      setFamilyAvatarUploading(false)
    }
  }

  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveFamilyName = async () => {
    if (!newFamilyName.trim() || newFamilyName === family?.name || !isAdmin) {
      setEditingFamily(false)
      return
    }

    setSavingFamily(true)
    try {
      const { error } = await supabase
        .from('families')
        .update({ name: newFamilyName.trim() })
        .eq('id', family.id)

      if (error) throw error
      await refreshProfile()
      setEditingFamily(false)
    } catch (error) {
      console.error('Error updating family name:', error)
    } finally {
      setSavingFamily(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!isAdmin || memberId === profile?.id) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ family_id: null })
        .eq('id', memberId)

      if (error) throw error
      setFamilyMembers(prev => prev.filter(m => m.id !== memberId))
      setShowRemoveConfirm(null)
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const handleTransferOwnership = async (newOwnerId) => {
    if (!isAdmin || newOwnerId === profile?.id) return

    try {
      const { error } = await supabase
        .from('families')
        .update({ created_by: newOwnerId })
        .eq('id', family.id)

      if (error) throw error
      await refreshProfile()
      setShowTransferModal(false)
    } catch (error) {
      console.error('Error transferring ownership:', error)
    }
  }

  const handleLeaveFamily = async () => {
    if (isAdmin) {
      alert('Please transfer ownership before leaving the family.')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ family_id: null })
        .eq('id', profile.id)

      if (error) throw error
      await refreshProfile()
      navigate('/login')
    } catch (error) {
      console.error('Error leaving family:', error)
    }
  }

  return (
    <>
      <section className="profile-section">
        <h2>Family</h2>
        <div className="card">
          <div className="family-header-row">
            <label className="family-avatar-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleFamilyAvatarChange}
                hidden
                disabled={familyAvatarUploading}
              />
              <img
                src={family?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(family?.name || 'Family')}&background=6B5CE7&color=fff&size=80`}
                alt={family?.name}
                className={`avatar avatar-lg family-avatar ${familyAvatarUploading ? 'uploading' : ''}`}
              />
              <span className="family-avatar-edit-icon">
                {familyAvatarUploading ? '...' : '📷'}
              </span>
            </label>
            <div className="family-info">
              {editingFamily ? (
                <div className="edit-family-name">
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button onClick={handleSaveFamilyName} disabled={savingFamily}>
                      {savingFamily ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingFamily(false)} className="cancel">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="family-name-row">
                  <span className="family-name">{family?.name || 'No family'}</span>
                  {isAdmin && (
                    <button className="edit-btn-small" onClick={() => {
                      setNewFamilyName(family?.name || '')
                      setEditingFamily(true)
                    }}>
                      Edit
                    </button>
                  )}
                </div>
              )}
              {isAdmin && <span className="admin-badge">Admin</span>}
            </div>
          </div>
          {family?.invite_code && (
            <div className="invite-code-row">
              <span className="invite-label">Invite Code:</span>
              <span className="invite-code">{family.invite_code}</span>
              <button className="copy-btn" onClick={handleCopyCode}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Family Members List */}
          {familyMembers.length > 0 && (
            <div className="family-members">
              <h3>Members ({familyMembers.length})</h3>
              <div className="members-list">
                {familyMembers.map(member => (
                  <div key={member.id} className="member-row">
                    <img
                      src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF6B6B&color=fff`}
                      alt={member.name}
                      className="avatar avatar-sm"
                    />
                    <div className="member-info">
                      <span className="member-name">
                        {member.name}
                        {member.id === family?.created_by && <span className="admin-tag">Admin</span>}
                        {member.id === profile?.id && <span className="you-tag">(You)</span>}
                      </span>
                      <span className="member-points">{member.points_total} pts</span>
                    </div>
                    {isAdmin && member.id !== profile?.id && (
                      <button
                        className="remove-member-btn"
                        onClick={() => setShowRemoveConfirm(member)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && familyMembers.length > 1 && (
            <button
              className="transfer-btn"
              onClick={() => setShowTransferModal(true)}
            >
              Transfer Ownership
            </button>
          )}

          {/* Leave Family (non-admin only) */}
          {!isAdmin && family && (
            <button
              className="leave-btn"
              onClick={() => setShowLeaveConfirm(true)}
            >
              Leave Family
            </button>
          )}
        </div>
      </section>

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Transfer Ownership</h3>
            <p>Select a new admin for the family:</p>
            <div className="modal-members">
              {familyMembers.filter(m => m.id !== profile?.id).map(member => (
                <button
                  key={member.id}
                  className="member-select-btn"
                  onClick={() => handleTransferOwnership(member.id)}
                >
                  <img
                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF6B6B&color=fff`}
                    alt={member.name}
                    className="avatar avatar-sm"
                  />
                  {member.name}
                </button>
              ))}
            </div>
            <button className="modal-cancel" onClick={() => setShowTransferModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      {showRemoveConfirm && (
        <div className="modal-overlay" onClick={() => setShowRemoveConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Remove Member?</h3>
            <p>Are you sure you want to remove <strong>{showRemoveConfirm.name}</strong> from the family?</p>
            <div className="modal-actions">
              <button className="modal-danger" onClick={() => handleRemoveMember(showRemoveConfirm.id)}>
                Remove
              </button>
              <button className="modal-cancel" onClick={() => setShowRemoveConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Family Confirmation */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Leave Family?</h3>
            <p>Are you sure you want to leave <strong>{family?.name}</strong>? You'll need an invite code to rejoin.</p>
            <div className="modal-actions">
              <button className="modal-danger" onClick={handleLeaveFamily}>
                Leave
              </button>
              <button className="modal-cancel" onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
