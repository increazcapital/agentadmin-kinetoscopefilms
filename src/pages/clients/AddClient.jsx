/* ============================================================
   Page: AddClient.jsx
   Description: Form to register a new investor client under the 
                authenticated agent. Calls POST /api/agent/clients.
   ============================================================ */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import FileDropzone from '../../components/ui/FileDropzone';
import { apiRequest } from '../../config/apiHelper';
import { getAgentCacheKey } from '../../config/apiHelper';
import { WORLD_COUNTRY_CODES } from '../../data/countryCodes';

export default function AddClient() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [agentInfo, setAgentInfo] = useState({ name: 'Loading...', code: '' });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    phoneCountryCode: '+91',
    dob: '',
    address: '',
    pan: '',
    bankName: '',
    accountNo: '',
    confirmAccountNo: '',
    ifsc: '',
    aadhaarNumber: '',
    nomineeName: '',
    nomineeRelation: '',
    nomineeContact: '',
    nomineePhoneCountryCode: '+91',
    nomineeEmail: '',
    riskProfile: 'Conservative',
    citizenship: 'National',
    nomineeCitizenship: 'National',
    roiPercentage: '0',
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
  });

  // Uploaded Files State
  const [panDocument, setPanDocument] = useState(null);
  const [aadhaarDocument, setAadhaarDocument] = useState(null);
  const [aadhaarBackDocument, setAadhaarBackDocument] = useState(null);
  const [bankProofDocument, setBankProofDocument] = useState(null);
  const [nomineeProofDocument, setNomineeProofDocument] = useState(null);
  const [agreementDocument, setAgreementDocument] = useState(null);

  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');

  // Fetch logged-in Agent Profile
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await apiRequest('/api/agent/profile');
        if (res && res.data) {
          const u = res.data.user || {};
          const p = res.data.profile || {};
          const name = p.fullName || u.name || res.data.name || 'Agent';
          const code = u.clientCode || p.agentId || res.data.agentCode || res.data.clientCode || '';
          setAgentInfo({ name, code });
        } else if (res && res.user) {
          setAgentInfo({ name: res.user.name || 'Agent', code: res.user.clientCode || '' });
        }
      } catch (err) {
        console.warn('Failed to fetch agent profile:', err);
        try {
          const authData = localStorage.getItem('kfpl_agent_auth');
          if (authData) {
            const parsed = JSON.parse(authData);
            const user = parsed.user || parsed.agent || {};
            setAgentInfo({ name: user.name || 'Agent', code: user.clientCode || user.agentCode || '' });
          }
        } catch (_) {}
      }
    };
    fetchAgent();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      let nextValue = value;
      if (name === 'aadhaarNumber' && prev.citizenship === 'National') {
        const digits = value.replace(/\D/g, '').slice(0, 12);
        nextValue = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      }
      const nextForm = { ...prev, [name]: nextValue };
      if (name === 'email') {
        setPortalEmail(value);
      }
      return nextForm;
    });
  };

  const generatePassword = (e) => {
    if (e) e.preventDefault();
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPortalPassword(pass);
    if (!portalEmail && form.email) {
      setPortalEmail(form.email);
    }
    addToast('Secure password generated!', 'info', 'Password Generated');
  };

  const copyCredentials = (e) => {
    if (e) e.preventDefault();
    const emailToCopy = portalEmail || form.email;
    if (!portalPassword) {
      addToast('No password to copy! Please enter or generate a password.', 'warning', 'Copy Failed');
      return;
    }
    const text = emailToCopy ? `Email: ${emailToCopy}\nPassword: ${portalPassword}` : `Password: ${portalPassword}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          addToast('Credentials copied to clipboard!', 'success', 'Copied');
        })
        .catch(() => {
          fallbackCopyText(text);
        });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      addToast('Credentials copied to clipboard!', 'success', 'Copied');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textarea);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || loading) return;

    if (form.accountNo !== form.confirmAccountNo) {
      addToast('Account Number and Confirm Account Number do not match!', 'danger', 'Validation Error');
      return;
    }
    if ((form.nomineeRelation || form.nomineeContact) && !form.nomineeName) {
      alert('Nominee Name is required if Nominee Relation or Nominee Contact is provided.');
      return;
    }

    if (!panDocument) {
      addToast('Please upload PAN Card / Tax ID document.', 'danger', 'Document Missing');
      return;
    }
    if (!aadhaarDocument) {
      addToast('Please upload Aadhaar / ID Card (Front Side) document.', 'danger', 'Document Missing');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    try {
      // Construct FormData for multipart upload
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('email', form.email);
      const fullPhone = form.phone ? `${form.phoneCountryCode} ${form.phone.replace(/^\+\d+\s*/, '')}`.trim() : '';
      formData.append('phone', fullPhone);
      if (form.dob) formData.append('dob', form.dob);
      if (form.address) formData.append('address', form.address);
      formData.append('riskProfile', form.riskProfile);
      formData.append('residencyStatus', form.citizenship === 'International' ? 'International' : 'National (Domestic)');
      formData.append('monthlyRoi', form.roiPercentage || '0');
      if (form.contractStartDate) {
        formData.append('contractStartDate', form.contractStartDate);
        formData.append('joinDate', form.contractStartDate);
      }
      if (form.contractEndDate) {
        formData.append('contractEndDate', form.contractEndDate);
      }
      if (form.bankName) formData.append('bankName', form.bankName);
      if (form.accountNo) {
        formData.append('accountNumber', form.accountNo);
        formData.append('confirmAccountNumber', form.confirmAccountNo || form.accountNo);
      }
      if (form.ifsc) formData.append('ifscCode', form.ifsc);
      if (form.pan) formData.append('panNumber', form.pan);
      if (form.aadhaarNumber) formData.append('aadhaarNumber', form.aadhaarNumber.replace(/\s/g, ''));

      if (form.nomineeName) {
        formData.append('nomineeName', form.nomineeName);
        formData.append('nomineeRelation', form.nomineeRelation);
        const fullNomineePhone = form.nomineeContact ? `${form.nomineePhoneCountryCode} ${form.nomineeContact.replace(/^\+\d+\s*/, '')}`.trim() : '';
        formData.append('nomineePhone', fullNomineePhone);
        formData.append('nomineeEmail', form.nomineeEmail);
        formData.append('nomineeResidency', form.nomineeCitizenship === 'International' ? 'International' : 'National (Domestic)');
      }

      formData.append('tier', 'SILVER');
      if (portalPassword) {
        formData.append('portalPassword', portalPassword);
        formData.append('password', portalPassword);
      }
      formData.append('is2FAEnabled', 'false');

      // Append files
      if (panDocument) formData.append('panDocument', panDocument);
      if (aadhaarDocument) formData.append('aadhaarDocument', aadhaarDocument);
      if (aadhaarBackDocument) formData.append('aadhaarBackDocument', aadhaarBackDocument);
      if (bankProofDocument) formData.append('bankProofDocument', bankProofDocument);
      if (nomineeProofDocument) formData.append('nomineeProofDocument', nomineeProofDocument);
      if (agreementDocument) formData.append('agreementDocument', agreementDocument);

      const resData = await apiRequest('/api/agent/clients', {
        method: 'POST',
        body: formData,
      });

      // Clear local cache so the new client shows up instantly
      try {
        const cacheKey = getAgentCacheKey('kfpl_agent_clients_cache');
        localStorage.removeItem(cacheKey);
      } catch (_) {}

      addToast(`Client "${form.fullName}" registered successfully!`, 'success', 'Client Added');
      setTimeout(() => navigate('/clients'), 600);
    } catch (err) {
      console.error('Failed to register client:', err);
      addToast(err.message || 'Failed to onboard client.', 'danger', 'Submission Error');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="kfpl-page" id="add-client-page">
      <div className="kfpl-page-header">
        <div className="kfpl-page-header-left">
          <h2 className="kfpl-page-title">Add New Client</h2>
          <p className="kfpl-page-subtitle">Fill in the details to onboard and register a new investor client under your agency</p>
        </div>
        <div className="kfpl-page-header-actions">
          <button className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm" onClick={() => navigate('/clients')}>Cancel</button>
        </div>
      </div>

      <form className="kfpl-form-card" onSubmit={handleSubmit}>
        <div className="kfpl-form-card-header">
          <div>
            <h3 className="kfpl-form-card-title">Personal Information</h3>
            <p className="kfpl-form-card-subtitle">Client ID will be auto-generated upon registration</p>
          </div>
        </div>

        <div className="kfpl-form">
          {/* Personal Details */}
          <div className="kfpl-form-section">
            <div className="kfpl-form-section-title">Basic Details</div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Full Name <span className="required">*</span></label>
                <input className="kfpl-form-input" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter client's full name" required />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Email Address <span className="required">*</span></label>
                <input className="kfpl-form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter client's email address" required />
              </div>
            </div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Phone Number <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="phoneCountryCode" value={form.phoneCountryCode} onChange={handleChange} className="kfpl-form-select" style={{ width: '130px', padding: '10px 8px', borderRadius: '8px', fontSize: '0.85rem' }}>
                    {WORLD_COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <input className="kfpl-form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="Enter phone number" required style={{ flex: 1 }} />
                </div>
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Date of Birth</label>
                <input className="kfpl-form-input" name="dob" type="date" value={form.dob} onChange={handleChange} />
              </div>
            </div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group" style={{ flex: 2 }}>
                <label className="kfpl-input-label">Address</label>
                <textarea className="kfpl-form-textarea" name="address" value={form.address} onChange={handleChange} placeholder="Enter client's residential address" rows="2" />
              </div>
              <div className="kfpl-input-group" style={{ flex: 1 }}>
                <label className="kfpl-input-label">Risk Profile</label>
                <select className="kfpl-form-select" name="riskProfile" value={form.riskProfile} onChange={handleChange}>
                  <option value="Conservative">Conservative</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Aggressive">Aggressive</option>
                </select>
              </div>
            </div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group" style={{ flex: 1 }}>
                <label className="kfpl-input-label">Residency / Citizenship</label>
                <select className="kfpl-form-select" name="citizenship" value={form.citizenship} onChange={handleChange}>
                  <option value="National">National (Domestic)</option>
                  <option value="International">International</option>
                </select>
              </div>
              <div className="kfpl-input-group" style={{ flex: 1 }}>
                <label className="kfpl-input-label">Assigned Agent (You)</label>
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--color-surface, #F8FAFC)',
                  border: '1.5px solid var(--color-border, #E2E8F0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--color-navy, #061D13)',
                  fontWeight: 700,
                  fontSize: '0.875rem'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                  <span>{agentInfo.name} {agentInfo.code ? `(${agentInfo.code})` : ''}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>Auto-Assigned</span>
                </div>
              </div>
            </div>

            <div className="kfpl-form-row" style={{ marginTop: '16px' }}>
              <div className="kfpl-input-group" style={{ flex: 1 }}>
                <label className="kfpl-input-label">Monthly ROI % <span className="required">*</span></label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="kfpl-form-input" 
                  name="roiPercentage" 
                  value={form.roiPercentage} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div style={{ flex: 1 }}></div>
            </div>
            <div className="kfpl-form-row" style={{ marginTop: '16px' }}>
              <div className="kfpl-input-group" style={{ flex: 1 }}>
                <label className="kfpl-input-label">Contract Start Date <span className="required">*</span></label>
                <input 
                  type="date" 
                  className="kfpl-form-input" 
                  name="contractStartDate" 
                  value={form.contractStartDate} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="kfpl-input-group" style={{ flex: 1 }}>
                <label className="kfpl-input-label">Contract End Date <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>(Optional)</span></label>
                <input 
                  type="date" 
                  className="kfpl-form-input" 
                  name="contractEndDate" 
                  value={form.contractEndDate} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>

          {/* KYC & Bank */}
          <div className="kfpl-form-section">
            <div className="kfpl-form-section-title">KYC & Bank Details</div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">
                  {form.citizenship === 'International' ? 'Tax ID / SSN' : 'PAN Card Number'} <span className="required">*</span>
                </label>
                <input 
                  className="kfpl-form-input" 
                  name="pan" 
                  value={form.pan} 
                  onChange={handleChange} 
                  placeholder={form.citizenship === 'International' ? 'Enter tax ID or SSN' : 'Enter PAN card number'} 
                  required 
                />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">
                  {form.citizenship === 'International' ? 'Passport / National ID Number' : 'Aadhaar Number'} <span className="required">*</span>
                </label>
                <input 
                  className="kfpl-form-input" 
                  name="aadhaarNumber" 
                  value={form.aadhaarNumber} 
                  onChange={handleChange} 
                  placeholder={form.citizenship === 'International' ? 'Enter passport or ID number' : 'Enter 12-digit Aadhaar number'} 
                  style={form.citizenship === 'National' ? { letterSpacing: '1.5px' } : {}}
                  required 
                />
              </div>
            </div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Bank Name <span className="required">*</span></label>
                <input className="kfpl-form-input" name="bankName" value={form.bankName} onChange={handleChange} placeholder="Enter bank name" required />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">
                  {form.citizenship === 'International' ? 'IFSC / SWIFT Code' : 'IFSC Code'} <span className="required">*</span>
                </label>
                <input 
                  className="kfpl-form-input" 
                  name="ifsc" 
                  value={form.ifsc} 
                  onChange={handleChange} 
                  placeholder={form.citizenship === 'International' ? 'Enter SWIFT or IFSC code' : 'Enter IFSC code'} 
                  required 
                />
              </div>
            </div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Account Number <span className="required">*</span></label>
                <input className="kfpl-form-input" name="accountNo" value={form.accountNo} onChange={handleChange} placeholder="Enter account number" required />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Confirm Account Number <span className="required">*</span></label>
                <input className="kfpl-form-input" name="confirmAccountNo" value={form.confirmAccountNo} onChange={handleChange} placeholder="Enter account number again" required />
              </div>
            </div>
          </div>

          {/* KYC Document Uploads */}
          <FileDropzone 
            label={form.citizenship === 'International' ? 'Tax ID Upload *' : 'PAN Card Upload *'} 
            multiple={false} 
            onFilesChange={(files) => setPanDocument(files[0] || null)} 
          />
          <FileDropzone 
            label={form.citizenship === 'International' ? 'International Passport / National ID (Front Side) Upload *' : 'Aadhaar Card (Front Side) Upload *'} 
            multiple={false} 
            onFilesChange={(files) => setAadhaarDocument(files[0] || null)} 
          />
          <FileDropzone 
            label={form.citizenship === 'International' ? 'National ID / Address Proof (Back Side) Upload *' : 'Aadhaar Card Back Side (Required for Address Proof) *'} 
            multiple={false} 
            onFilesChange={(files) => setAadhaarBackDocument(files[0] || null)} 
          />
          <FileDropzone 
            label="Cancelled Cheque (Optional)" 
            multiple={false} 
            onFilesChange={(files) => setBankProofDocument(files[0] || null)} 
          />

          {/* Nominee Details */}
          <div className="kfpl-form-section">
            <div className="kfpl-form-section-title">Nominee Details <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'none' }}>(Optional)</span></div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Nominee Name {(form.nomineeRelation || form.nomineeContact) && <span className="required">*</span>}</label>
                <input className="kfpl-form-input" name="nomineeName" value={form.nomineeName} onChange={handleChange} placeholder="Enter nominee's full name" required={!!(form.nomineeRelation || form.nomineeContact)} />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Nominee Relation</label>
                <select className="kfpl-form-select" name="nomineeRelation" value={form.nomineeRelation} onChange={handleChange}>
                  <option value="">Select Relation</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="kfpl-form-row-3">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Nominee Contact Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="nomineePhoneCountryCode" value={form.nomineePhoneCountryCode} onChange={handleChange} className="kfpl-form-select" style={{ width: '130px', padding: '10px 8px', borderRadius: '8px', fontSize: '0.85rem' }}>
                    {WORLD_COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <input className="kfpl-form-input" name="nomineeContact" value={form.nomineeContact} onChange={handleChange} placeholder="Enter contact number" style={{ flex: 1 }} />
                </div>
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Nominee Email Address</label>
                <input className="kfpl-form-input" name="nomineeEmail" type="email" value={form.nomineeEmail} onChange={handleChange} placeholder="Enter nominee's email address" />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Nominee Residency / Citizenship</label>
                <select className="kfpl-form-select" name="nomineeCitizenship" value={form.nomineeCitizenship} onChange={handleChange}>
                  <option value="National">National (Domestic)</option>
                  <option value="International">International</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nominee ID Proof Upload */}
          <FileDropzone 
            label={form.nomineeCitizenship === 'International' ? 'Nominee International Passport / National ID Card Upload (Optional)' : 'Nominee ID Proof (Aadhaar / Driving License / Passport) (Optional)'} 
            multiple={false} 
            onFilesChange={(files) => setNomineeProofDocument(files[0] || null)} 
          />

          {/* Agreement Upload */}
          <FileDropzone 
            label="Agreement Document (Optional)" 
            multiple={false} 
            onFilesChange={(files) => setAgreementDocument(files[0] || null)} 
          />

          {/* Client Portal Credentials Generation */}
          <div className="kfpl-form-section">
            <div className="kfpl-form-section-title">Client Portal Access</div>
            <div className="kfpl-form-row">
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Email Address / Login ID</label>
                <input className="kfpl-form-input" name="portalEmail" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} placeholder="Enter client's login email" />
              </div>
              <div className="kfpl-input-group">
                <label className="kfpl-input-label">Portal Password</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="kfpl-form-input" type="text" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="Enter or generate secure password" style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="kfpl-btn"
                    onClick={generatePassword}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--color-surface, #F1F5F9)',
                      border: '1px solid var(--color-border, #CBD5E1)',
                      color: 'var(--color-text-primary, #0F172A)',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Generate
                  </button>
                  <button
                    type="button"
                    className="kfpl-btn"
                    onClick={copyCredentials}
                    disabled={!portalPassword}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--color-surface, #F1F5F9)',
                      border: '1px solid var(--color-border, #CBD5E1)',
                      color: 'var(--color-text-primary, #0F172A)',
                      cursor: !portalPassword ? 'not-allowed' : 'pointer',
                      opacity: !portalPassword ? 0.5 : 1
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="kfpl-form-actions">
            <button
              type="button"
              className="kfpl-btn kfpl-btn--secondary"
              onClick={() => navigate('/clients')}
              disabled={loading || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="kfpl-btn kfpl-btn--primary"
              disabled={isSubmitting || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minWidth: '190px',
                background: (isSubmitting || loading) ? '#64748B' : 'var(--color-gold, #10B981)',
                borderColor: (isSubmitting || loading) ? '#64748B' : 'var(--color-gold, #10B981)',
                color: '#FFFFFF',
                opacity: (isSubmitting || loading) ? 0.75 : 1,
                cursor: (isSubmitting || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (isSubmitting || loading) ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.25)'
              }}
            >
              {(isSubmitting || loading) && (
                <svg
                  style={{ width: '16px', height: '16px', animation: 'kfpl-spin 0.8s linear infinite' }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              <span>{isSubmitting ? 'Creating Client...' : 'Create Investor Client'}</span>
            </button>
          </div>
        </div>
      </form>
      <style>{`
        @keyframes kfpl-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
