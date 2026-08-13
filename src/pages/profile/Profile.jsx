/* ============================================================
   Page: Profile.jsx
   Description: Agent profile view with nominee and bank details management.
   ============================================================ */

import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';
import { apiRequest, getAgentCacheKey, safeSetLocalStorage } from '../../config/apiHelper';
import KycAgreementCard from '../../components/common/KycAgreementCard';
import MissingDocsReuploadCard from '../../components/common/MissingDocsReuploadCard';
import SensitiveValueToggle from '../../components/common/SensitiveValueToggle';

const profileIcons = {
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  bank: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  nominee: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11z"/><path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11z"/><path d="M2 20c.55-3.1 3.01-5 6-5 1.25 0 2.38.32 3.31.9"/><path d="M22 20c-.55-3.1-3.01-5-6-5-1.25 0-2.38.32-3.31.9"/></svg>
};

const formatAgentID = (rawId) => {
  if (!rawId || rawId === '—') return '—';
  const str = String(rawId).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return 'KFPL-AG-1002';
  }
  if (/^KFPL-AG-\d+$/i.test(str)) {
    return str.toUpperCase();
  }
  const digitsMatch = str.match(/\d+/);
  if (digitsMatch) {
    let val = parseInt(digitsMatch[0], 10);
    if (val < 1000) val = 1000 + val;
    return `KFPL-AG-${val}`;
  }
  return 'KFPL-AG-1002';
};

export default function Profile() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ commissionPaid: 0, commissionPending: 0 });

  useEffect(() => {
    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.stats) setStats(parsed.stats);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse profile cache:', e);
    }

    const fetchProfile = async () => {
      try {
        const [profRes, clientsRes] = await Promise.all([
          apiRequest('/api/agent/profile'),
          apiRequest('/api/agent/clients').catch(() => null)
        ]);

        const extractProfile = (res) => {
          if (!res) return null;
          let data = res;
          if (res.success && res.data) {
            data = res.data;
          }
          
          const user = data.user || {};
          const profileObj = data.profile || data.agent || data;
          const header = data.header || {};
          
          const rawId = header.agentCode || 
                        profileObj.agentCode || 
                        profileObj.agentId || 
                        user.agentCode || 
                        user.clientCode || 
                        profileObj.code || 
                        profileObj._id || 
                        profileObj.id || 
                        '—';
          const formattedId = formatAgentID(rawId);

          // Smart Status selector: check if any fields state it is active
          const getStatus = () => {
            const possibleStatuses = [
              profileObj.status,
              header.status,
              user.isActive ? 'active' : null,
              profileObj.isActive ? 'active' : null
            ].filter(Boolean).map(s => String(s).toLowerCase());
            
            if (possibleStatuses.includes('active')) return 'active';
            if (possibleStatuses.includes('on hold')) return 'on hold';
            if (possibleStatuses.includes('blocked')) return 'blocked';
            return possibleStatuses[0] || 'inactive';
          };

          // Smart KYC status selector: check if any fields state it is verified
          const getKycStatus = () => {
            const possibleKyc = [
              profileObj.kyc,
              profileObj.kycStatus,
              header.kycStatus,
              data.kycStatus
            ].filter(Boolean).map(s => String(s).toUpperCase());
            
            if (possibleKyc.includes('VERIFIED') || possibleKyc.includes('APPROVED')) return 'VERIFIED';
            if (possibleKyc.includes('REJECTED') || possibleKyc.includes('FAILED')) return 'REJECTED';
            if (possibleKyc.includes('PENDING')) return 'PENDING';
            return possibleKyc[0] || 'PENDING';
          };

          const statusVal = getStatus();
          const panNumber = profileObj.panNumber || profileObj.pan || '—';
          const aadhaarNumber = profileObj.aadhaarNumber || profileObj.aadhaar || '—';
          const commissionSlab = profileObj.commissionSlab || 'Slab 2';
          const commissionOneTime = profileObj.commissionOneTime ? `${profileObj.commissionOneTime}%` : '1.5%';
          const commissionMonthly = profileObj.commissionMonthly ? `${profileObj.commissionMonthly}%` : '0.75%';
          const tier = (profileObj.tier || profileObj.category || 'SILVER').toUpperCase();

          return {
            ...profileObj,
            name: profileObj.fullName || user.name || profileObj.name || 'Agent',
            fullName: profileObj.fullName || user.name || profileObj.name || 'Agent',
            email: profileObj.email || user.email || '',
            phone: profileObj.phone || user.phone || '',
            address: profileObj.address || 'India',
            agentId: formattedId,
            code: formattedId,
            tier,
            status: statusVal,
            kycStatus: kycStatusVal,
            kyc: kycStatusVal,
            commissionSlab,
            commissionOneTime,
            commissionMonthly,
            panNumber,
            aadhaarNumber,
            joiningDate: profileObj.joinDate || profileObj.joiningDate || user.createdAt || profileObj.createdAt,
            bankName: profileObj.bankName || '—',
            bankAccount: profileObj.accountNumber || profileObj.accountNo || profileObj.bankAccount || '—',
            accountNumber: profileObj.accountNumber || profileObj.accountNo || profileObj.bankAccount || '—',
            accountNo: profileObj.accountNumber || profileObj.accountNo || profileObj.bankAccount || '—',
            ifsc: profileObj.ifscCode || profileObj.ifsc || '—',
            ifscCode: profileObj.ifscCode || profileObj.ifsc || '—',
            nomineeName: profileObj.nomineeName || profileObj.nominee?.name || '—',
            nomineeRelation: profileObj.nomineeRelation || profileObj.nominee?.relation || '—',
            nomineePhone: profileObj.nomineePhone || profileObj.nominee?.contact || '—',
            nomineeContact: profileObj.nomineePhone || profileObj.nominee?.contact || '—',
            nomineeEmail: profileObj.nomineeEmail || profileObj.nominee?.email || 'Not provided'
          };
        };

        const rawProfile = extractProfile(profRes);
        setProfile(rawProfile);

        let dynamicCommissionPaid = 0;
        if (clientsRes) {
          const extractClients = (res) => {
            if (!res) return [];
            if (Array.isArray(res)) return res;
            if (res.data) {
              if (Array.isArray(res.data)) return res.data;
              if (res.data.clients && Array.isArray(res.data.clients)) return res.data.clients;
            }
            if (res.clients && Array.isArray(res.clients)) return res.clients;
            return [];
          };
          const resolvedClients = extractClients(clientsRes);
          const totalInv = resolvedClients.reduce((sum, c) => sum + (c.totalInvestment || c.investmentAmount || 0), 0);
          dynamicCommissionPaid = totalInv * 0.02;
        }

        const freshStats = {
          commissionPaid: dynamicCommissionPaid,
          commissionPending: 0,
        };
        setStats(freshStats);

        // Save fresh values to cache
        const cacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            profile: rawProfile,
            stats: freshStats
          }));
        } catch (_) {}
        window.dispatchEvent(new Event('agentProfileUpdated'));

      } catch (err) {
        console.error('Failed to load profile:', err);
        toast('Failed to load agent profile', 'error', 'Error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="kfpl-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading profile...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="kfpl-page">
        <div className="kfpl-empty-state">
          <div className="kfpl-empty-state-title">Profile not found</div>
          <p>Failed to load your profile details from the server.</p>
        </div>
      </div>
    );
  }

  const name = profile.name || profile.fullName || 'Agent';
  const email = profile.email || '';
  const phone = profile.phone || '';
  const address = profile.address || 'India';
  const agentId = profile.agentId || '—';
  const status = profile.status || 'active';
  const kycStatus = (profile.kycStatus || profile.kyc || 'PENDING').toUpperCase();
  const formatDateDMY = (dStr) => {
    if (!dStr) return '—';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    return `${day}/${mon}/${yr}`;
  };

  const joinDate = profile.joiningDate || profile.joinDate || profile.createdAt;
  const memberSince = joinDate ? formatDateDMY(joinDate) : '—';

  const bankName = profile.bankName || '—';
  const bankAccount = profile.bankAccount || profile.accountNumber || '—';
  const ifsc = profile.ifsc || profile.ifscCode || '—';

  const nomineeName = profile.nomineeName || profile.nominee?.name || '—';
  const nomineeRelation = profile.nomineeRelation || profile.nominee?.relation || '—';
  const nomineeContact = profile.nomineePhone || profile.nominee?.contact || '—';
  const nomineeEmail = profile.nomineeEmail || profile.nominee?.email || 'Not provided';

  const compressImage = (file, maxSide = 300, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSide) {
              height = Math.round((height * maxSide) / width);
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width = Math.round((width * maxSide) / height);
              height = maxSide;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (PNG, JPG, JPEG, WEBP).', 'error', 'Invalid File');
      return;
    }

    try {
      toast('Saving profile picture...', 'info', 'Uploading Avatar');
      const base64Image = await compressImage(file, 300, 0.8);

      // INSTANT OPTIMISTIC UI UPDATE (0ms)
      setProfile(prev => ({ ...prev, profilePic: base64Image }));
      const cacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.profile) parsed.profile.profilePic = base64Image;
          safeSetLocalStorage(cacheKey, parsed);
        }
      } catch (e) {}
      try {
        const authData = localStorage.getItem('kfpl_agent_auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.agent) parsed.agent.profilePic = base64Image;
          if (parsed.user) parsed.user.profilePic = base64Image;
          safeSetLocalStorage('kfpl_agent_auth', parsed);
        }
      } catch (e) {}
      window.dispatchEvent(new Event('agentProfileUpdated'));

      const res = await apiRequest('/api/agent/profile', {
        method: 'PATCH',
        body: JSON.stringify({ profilePic: base64Image })
      });

      const updatedPicUrl = res?.data?.profilePic || res?.data?.user?.profilePic || res?.data?.profile?.profilePic || base64Image;

      setProfile(prev => ({ ...prev, profilePic: updatedPicUrl }));

      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.profile) parsed.profile.profilePic = updatedPicUrl;
          safeSetLocalStorage(cacheKey, parsed);
        }
      } catch (e) {}

      try {
        const authData = localStorage.getItem('kfpl_agent_auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.agent) parsed.agent.profilePic = updatedPicUrl;
          if (parsed.user) parsed.user.profilePic = updatedPicUrl;
          safeSetLocalStorage('kfpl_agent_auth', parsed);
        }
      } catch (e) {}

      window.dispatchEvent(new Event('agentProfileUpdated'));
      toast('Your profile photo has been updated successfully!', 'success', 'Profile Picture Updated');
    } catch (err) {
      console.error('Failed to upload agent avatar:', err);
      toast(err.message || 'Failed to update profile picture.', 'error', 'Upload Failed');
    }
  };

  const handleAvatarRemove = async () => {
    try {
      // INSTANT OPTIMISTIC REMOVAL (0ms)
      setProfile(prev => ({ ...prev, profilePic: '' }));
      const cacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.profile) parsed.profile.profilePic = '';
          safeSetLocalStorage(cacheKey, parsed);
        }
      } catch (e) {}
      try {
        const authData = localStorage.getItem('kfpl_agent_auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.agent) parsed.agent.profilePic = '';
          if (parsed.user) parsed.user.profilePic = '';
          safeSetLocalStorage('kfpl_agent_auth', parsed);
        }
      } catch (e) {}
      window.dispatchEvent(new Event('agentProfileUpdated'));
      toast('Your profile photo has been removed successfully!', 'success', 'Profile Picture Removed');

      await apiRequest('/api/agent/profile/avatar', {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to remove agent avatar:', err);
      toast(err.message || 'Failed to remove profile picture.', 'error', 'Removal Failed');
    }
  };

  return (
    <div className="kfpl-page" id="profile-page">
      <div className="kfpl-page-header">
        <div className="kfpl-page-header-left">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>My Profile</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Profile details. Nominee changes request approval ke through update honge.
          </p>
        </div>
      </div>

      {/* MISSING DOCUMENTS RE-UPLOAD CARD */}
      <div style={{ marginTop: '20px' }}>
        <MissingDocsReuploadCard
          agent={profile}
          loading={loading}
          onDocUploaded={(docKey, newUrl) => {
            setProfile(prev => {
              const updated = { ...prev, [docKey]: newUrl };
              try {
                const cacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
                const stored = localStorage.getItem(cacheKey);
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed.profile) parsed.profile[docKey] = newUrl;
                  safeSetLocalStorage(cacheKey, parsed);
                }
                const authData = localStorage.getItem('kfpl_agent_auth');
                if (authData) {
                  const parsed = JSON.parse(authData);
                  if (parsed.agent) parsed.agent[docKey] = newUrl;
                  if (parsed.profile) parsed.profile[docKey] = newUrl;
                  safeSetLocalStorage('kfpl_agent_auth', parsed);
                }
              } catch (e) {}
              return updated;
            });
          }}
        />
      </div>

      {/* KYC AGENT AGREEMENT CARD */}
      <div style={{ marginTop: '20px' }}>
        <KycAgreementCard
          agreementUrl={profile.agreementDocument}
          agreementVerified={profile.agreementDocumentVerified}
          agentName={name}
          onUploadSuccess={(newUrl) => {
            setProfile(prev => ({ ...prev, agreementDocument: newUrl }));
          }}
        />
      </div>

      <div className="kfpl-profile-hero">
        <div style={{ position: 'relative', flexShrink: 0, zIndex: 5 }}>
          <div className="kfpl-profile-avatar-lg" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            {profile.profilePic ? (
              <img src={profile.profilePic} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              name.charAt(0)
            )}
          </div>
          <label
            htmlFor="agent-avatar-upload"
            title="Upload Profile Picture"
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: '#10B981',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              border: '2px solid #061D13',
              zIndex: 10,
              transition: 'transform 0.2s ease, background 0.2s ease'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </label>
          {Boolean(profile.profilePic) && (
            <button
              type="button"
              title="Remove Profile Picture"
              onClick={handleAvatarRemove}
              style={{
                position: 'absolute',
                bottom: '-2px',
                left: '-2px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#EF4444',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                border: '2px solid #061D13',
                zIndex: 10,
                transition: 'transform 0.2s ease, background 0.2s ease'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}
          <input
            type="file"
            id="agent-avatar-upload"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="kfpl-profile-hero-info">
          <div className="kfpl-profile-eyebrow">Agent account</div>
          <h2>{name}</h2>
          <div className="kfpl-profile-hero-id">{agentId}</div>
          <div className="kfpl-profile-hero-status" style={{ display: 'flex', gap: '8px' }}>
            <span className={`kfpl-badge kfpl-badge--${status.toLowerCase() === 'active' ? 'success' : 'warning'}`}>{status}</span>
            <span className={`kfpl-badge kfpl-badge--${kycStatus === 'VERIFIED' ? 'success' : kycStatus === 'REJECTED' ? 'rejected' : 'warning'}`}>KYC: {kycStatus}</span>
          </div>
        </div>
        <div className="kfpl-profile-hero-stats">
          <div className="kfpl-profile-stat">
            <span className="kfpl-profile-stat-label">Total Earned</span>
            <span className="kfpl-profile-stat-value">{formatCurrency(stats.commissionPaid)}</span>
          </div>
          <div className="kfpl-profile-stat">
            <span className="kfpl-profile-stat-label">Pending Payout</span>
            <span className="kfpl-profile-stat-value">{formatCurrency(stats.commissionPending)}</span>
          </div>
        </div>
      </div>

      <div className="kfpl-profile-grid" style={{ marginTop: 24 }}>
        <div className="kfpl-card kfpl-profile-card">
          <div className="kfpl-card-header">
            <h3><span className="kfpl-profile-card-icon">{profileIcons.user}</span>Personal Information</h3>
          </div>
          <div className="kfpl-card-body">
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Full Name</span>
              <span className="kfpl-profile-detail-value">{name}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Email</span>
              <span className="kfpl-profile-detail-value">{email}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Phone</span>
              <span className="kfpl-profile-detail-value">{phone}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Address</span>
              <span className="kfpl-profile-detail-value">{address}</span>
            </div>
          </div>
        </div>

        <div className="kfpl-card kfpl-profile-card">
          <div className="kfpl-card-header">
            <h3><span className="kfpl-profile-card-icon">{profileIcons.shield}</span>Account Details</h3>
          </div>
          <div className="kfpl-card-body">
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Agent ID</span>
              <span className="kfpl-profile-detail-value kfpl-mono">{agentId}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Category / Tier</span>
              <span className="kfpl-profile-detail-value">{profile.tier || 'SILVER'}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Account Status</span>
              <span className={`kfpl-badge kfpl-badge--${status.toLowerCase() === 'active' ? 'success' : 'warning'}`}>{status}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">KYC Status</span>
              <span className={`kfpl-badge kfpl-badge--${kycStatus === 'VERIFIED' ? 'success' : kycStatus === 'REJECTED' ? 'rejected' : 'warning'}`}>{kycStatus}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Member Since (DD/MM/YYYY)</span>
              <span className="kfpl-profile-detail-value">{memberSince}</span>
            </div>
          </div>
        </div>

        <div className="kfpl-card kfpl-profile-card">
          <div className="kfpl-card-header">
            <h3><span className="kfpl-profile-card-icon">{profileIcons.bank}</span>Bank & Identity Details</h3>
          </div>
          <div className="kfpl-card-body">
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Bank Name</span>
              <span className="kfpl-profile-detail-value">{bankName}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Account Number</span>
              <span className="kfpl-profile-detail-value kfpl-mono">
                <SensitiveValueToggle value={bankAccount} maskLength={4} />
              </span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">IFSC Code</span>
              <span className="kfpl-profile-detail-value kfpl-mono">
                <SensitiveValueToggle value={ifsc} maskLength={4} />
              </span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">PAN Card Number</span>
              <span className="kfpl-profile-detail-value kfpl-mono">
                <SensitiveValueToggle value={profile.panNumber || profile.pan || '—'} maskLength={4} />
              </span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Aadhaar Number</span>
              <span className="kfpl-profile-detail-value kfpl-mono">
                <SensitiveValueToggle value={profile.aadhaarNumber || profile.aadhaar || '—'} maskLength={4} />
              </span>
            </div>
          </div>
        </div>

        <div className="kfpl-card kfpl-profile-card">
          <div className="kfpl-card-header">
            <h3><span className="kfpl-profile-card-icon">{profileIcons.nominee}</span>Nominee Details</h3>
          </div>
          <div className="kfpl-card-body">
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Name</span>
              <span className="kfpl-profile-detail-value">{nomineeName}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Relation</span>
              <span className="kfpl-profile-detail-value">{nomineeRelation}</span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Contact</span>
              <span className="kfpl-profile-detail-value">
                <SensitiveValueToggle value={nomineeContact} maskLength={4} />
              </span>
            </div>
            <div className="kfpl-profile-detail-row">
              <span className="kfpl-profile-detail-label">Email</span>
              <span className="kfpl-profile-detail-value">{nomineeEmail}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
