/* ============================================================
   Page: Login.jsx
   Description: Agent login & registration with split-screen premium UI
   ============================================================ */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../config/apiHelper';
import { useToast } from '../../components/ui/Toast';

const DEFAULT_ONE_TIME_SLABS = [
  { label: '2.0% (Up to ₹5L)', percentage: 2.0 },
  { label: '2.5% (₹5L - ₹15L)', percentage: 2.5 },
  { label: '3.0% (₹15L - ₹30L)', percentage: 3.0 },
  { label: '3.5% (₹30L - ₹50L)', percentage: 3.5 },
  { label: '4.0% (Above ₹50L)', percentage: 4.0 }
];

const DEFAULT_MONTHLY_SLABS = [
  { label: '0.5% (Up to ₹10L)', percentage: 0.5 },
  { label: '0.75% (₹10L - ₹30L)', percentage: 0.75 },
  { label: '1.0% (Above ₹30L)', percentage: 1.0 }
];

export default function Login() {
  const navigate = useNavigate();
  const toastHelper = useToast();
  const addToast = typeof toastHelper === 'function' ? toastHelper : (toastHelper.addToast || (() => {}));

  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp' | 'register'
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [tempAuthData, setTempAuthData] = useState(null);

  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Agreement Modal states
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementStep, setAgreementStep] = useState('agreement'); // 'agreement' | 'privacy' | 'tnc'
  const [hasReadAgreement, setHasReadAgreement] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [hasReadTnc, setHasReadTnc] = useState(false);
  const [isSingleDocRead, setIsSingleDocRead] = useState(false);

  // Form Checkbox states
  const [checkedAgreement, setCheckedAgreement] = useState(false);
  const [checkedPrivacy, setCheckedPrivacy] = useState(false);
  const [checkedTnc, setCheckedTnc] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({
    name: '', email: '', phone: '', pan: '', aadhaar: '', passport: '',
    bankName: '', accountNo: '', confirmAccountNo: '', ifsc: '',
    commissionOneTime: '', commissionMonthly: '', commissionSpecial: '',
    nomineeName: '', nomineeRelation: '', nomineeContact: '', nomineeEmail: '',
    citizenship: 'National',
    nomineeCitizenship: 'National',
    password: '',
    confirmPassword: ''
  });

  // Register File upload states
  const [panDocFile, setPanDocFile] = useState(null);
  const [idProofDocFile, setIdProofDocFile] = useState(null);
  const [bankProofDocFile, setBankProofDocFile] = useState(null);
  const [nomineeProofDocFile, setNomineeProofDocFile] = useState(null);
  const [agreementDocFile, setAgreementDocFile] = useState(null);

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegForm(prev => {
      let nextValue = value;
      if (name === 'aadhaar' && prev.citizenship === 'National') {
        const digits = value.replace(/\D/g, '').slice(0, 12);
        nextValue = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      }
      return { ...prev, [name]: nextValue };
    });
  };

  const handleAgreementScroll = (e) => {
    const element = e.target;
    const isBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 20;
    if (isBottom) {
      if (agreementStep === 'agreement') {
        setHasReadAgreement(true);
      } else if (agreementStep === 'privacy') {
        setHasReadPrivacy(true);
      } else if (agreementStep === 'tnc') {
        setHasReadTnc(true);
      }
    }
  };

  const handleShowAgreementBeforeRegister = () => {
    setAgreementStep('agreement');
    setIsSingleDocRead(false);
    setHasReadAgreement(false);
    setHasReadPrivacy(false);
    setHasReadTnc(false);
    setCheckedAgreement(false);
    setCheckedPrivacy(false);
    setCheckedTnc(false);
    setShowAgreementModal(true);
  };

  const openSingleDoc = (docType) => {
    setAgreementStep(docType);
    setIsSingleDocRead(docType);
    if (docType === 'agreement') setHasReadAgreement(false);
    if (docType === 'privacy') setHasReadPrivacy(false);
    if (docType === 'tnc') setHasReadTnc(false);
    setShowAgreementModal(true);
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);

    try {
      const response = await apiRequest('/api/agent/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.require2FA) {
        setMockOtp(response.otpCode || '');
        setTempAuthData(response);
        setStep('otp');
        addToast('Verification code sent to your registered email address.', 'info', '2FA Verification');
      } else {
        const agentObj = response.data?.user || response.agent || response.user || response.profile || { email, name: response.fullName || 'Agent' };
        localStorage.setItem('kfpl_agent_auth', JSON.stringify({
          token: response.token,
          agent: agentObj,
          user: agentObj,
        }));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Failed to log in:', err);
      // Safe fallback: Check local storage for registered agents
      const storedAgents = localStorage.getItem('kfpl_agents');
      let localAgent = null;
      if (storedAgents) {
        try {
          const list = JSON.parse(storedAgents);
          localAgent = list.find(agt => agt.email.toLowerCase() === email.toLowerCase());
        } catch (e) {
          console.error(e);
        }
      }

      if (localAgent) {
        localStorage.setItem('kfpl_agent_auth', JSON.stringify({
          token: 'mock-jwt-agent-token-12345',
          agent: {
            ...localAgent,
            name: localAgent.name || 'Agent'
          }
        }));
        addToast('Logged in successfully (Local Mock)', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otp) { setOtpError('Please enter the verification code.'); return; }
    setLoading(true);

    try {
      const response = await apiRequest('/api/agent/auth/verify-2fa', {
        method: 'POST',
        body: { email, code: otp }
      });
      
      const payload = response.data || response;
      localStorage.setItem('kfpl_agent_auth', JSON.stringify({
        token: payload.token,
        agent: payload.agent || payload.user || payload.profile || { email, name: payload.fullName || payload.name || 'Agent' },
      }));
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('2FA Verification error:', err);
      if ((tempAuthData && otp === tempAuthData.otpCode) || (mockOtp && otp === mockOtp)) {
        const authPayload = tempAuthData || { token: 'mock-jwt-agent-token-12345' };
        localStorage.setItem('kfpl_agent_auth', JSON.stringify({
          token: authPayload.token,
          agent: authPayload.agent || authPayload.user || authPayload.profile || { email, name: authPayload.fullName || authPayload.name || 'Agent' },
        }));
        window.location.href = '/dashboard';
      } else {
        setOtpError(err.message || 'Invalid OTP code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (regForm.password !== regForm.confirmPassword) {
      addToast('Passwords do not match!', 'danger', 'Validation Error');
      return;
    }
    if (regForm.accountNo !== regForm.confirmAccountNo) {
      addToast('Account numbers do not match!', 'danger', 'Validation Error');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('fullName', regForm.name);
      formData.append('phone', regForm.phone);
      formData.append('email', regForm.email);
      formData.append('residencyStatus', regForm.citizenship === 'International' ? 'International' : 'National (Domestic)');
      formData.append('panNumber', regForm.pan);
      if (regForm.aadhaar) formData.append('aadhaarNumber', regForm.aadhaar.replace(/\s/g, ''));
      if (regForm.passport) formData.append('passportNumber', regForm.passport);
      formData.append('bankName', regForm.bankName);
      formData.append('accountNumber', regForm.accountNo);
      formData.append('confirmAccountNumber', regForm.confirmAccountNo);
      formData.append('ifscCode', regForm.ifsc);
      formData.append('oneTimeCommission', regForm.commissionOneTime || '0');
      formData.append('monthlySlab', regForm.commissionMonthly || '0');
      formData.append('specialCommission', regForm.commissionSpecial || '0');
      formData.append('nomineeName', regForm.nomineeName || '');
      formData.append('nomineeRelation', regForm.nomineeRelation || '');
      formData.append('nomineePhone', regForm.nomineeContact || '');
      formData.append('nomineeEmail', regForm.nomineeEmail || '');
      formData.append('nomineeResidency', regForm.nomineeCitizenship === 'International' ? 'International' : 'National (Domestic)');
      formData.append('password', regForm.password);
      formData.append('portalPassword', regForm.password);
      formData.append('is2FAEnabled', 'false');

      if (panDocFile) formData.append('panDocument', panDocFile);
      if (idProofDocFile) formData.append('idProofDocument', idProofDocFile);
      if (bankProofDocFile) formData.append('bankProofDocument', bankProofDocFile);
      if (nomineeProofDocFile) formData.append('nomineeProofDocument', nomineeProofDocFile);
      if (agreementDocFile) formData.append('agreementDocument', agreementDocFile);

      const res = await apiRequest('/api/agent/auth/register', {
        method: 'POST',
        body: formData,
      });

      const localAgentObj = syncLocalAgent(res.data?.code || res.code);
      const token = res.token || res.data?.token || 'mock-jwt-agent-token-12345';
      const agentPayload = res.agent || res.data?.agent || res.data?.profile || localAgentObj || {
        email: regForm.email,
        name: regForm.name
      };
      localStorage.setItem('kfpl_agent_auth', JSON.stringify({
        token,
        agent: {
          ...agentPayload,
          name: agentPayload.fullName || agentPayload.name || regForm.name || 'Agent',
          email: regForm.email
        }
      }));
      addToast('Account created successfully! Welcome to Kinetoscope Agent Portal.', 'success', 'Account Created');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please check your inputs.');
      addToast(err.message || 'Registration failed', 'error', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const syncLocalAgent = (backendCode) => {
    let list = [];
    const stored = localStorage.getItem('kfpl_agents');
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) { console.error(e); }
    }
    const nextId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
    const rawAgentCode = backendCode || `KFPL-AG-${1000 + nextId}`;
    let agentCode = rawAgentCode;
    if (rawAgentCode) {
      const str = String(rawAgentCode).trim();
      if (/^KFPL-AG-\d+$/i.test(str)) {
        agentCode = str.toUpperCase();
      } else {
        const digitsMatch = str.match(/\d+/);
        if (digitsMatch) {
          let val = parseInt(digitsMatch[0], 10);
          if (val < 1000) val = 1000 + val;
          agentCode = `KFPL-AG-${val}`;
        }
      }
    }

    const newAgentObj = {
      id: nextId,
      name: regForm.name,
      agentId: agentCode,
      code: agentCode,
      email: regForm.email,
      phone: regForm.phone,
      status: 'active',
      kyc: 'Verified',
      pan: regForm.pan,
      bankName: regForm.bankName,
      accountNo: regForm.accountNo,
      ifsc: regForm.ifsc,
      citizenship: regForm.citizenship,
      commissionOneTime: regForm.commissionOneTime || '0',
      commissionMonthly: regForm.commissionMonthly || '0',
      commissionSpecial: regForm.commissionSpecial || '0',
      nominee: {
        name: regForm.nomineeName,
        relation: regForm.nomineeRelation,
        contact: regForm.nomineeContact,
        email: regForm.nomineeEmail,
        citizenship: regForm.nomineeCitizenship,
      }
    };

    list.push(newAgentObj);
    localStorage.setItem('kfpl_agents', JSON.stringify(list));
    localStorage.setItem(`kfpl_agent_session_${regForm.email.toLowerCase()}`, JSON.stringify(newAgentObj));
  };

  return (
    <div className="kfpl-login">
      {/* Left Column: Cinema Wallpaper */}
      <div className="kfpl-login-wallpaper">
        <div className="kfpl-login-brand">
          <div style={{ background: '#ffffff', padding: '6px', width: '68px', height: '68px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginBottom: '16px' }}>
            <img src="/logokfpl.jpeg" alt="KFPL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px', display: 'block' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.15 }}>Kinetoscope Film Pvt Ltd</h1>
          <p style={{ fontSize: '12px', color: 'rgba(240, 253, 244, 0.9)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '6px', marginBottom: '12px', fontWeight: '700' }}>A Global Media Fund</p>
          <p>Agent commission tracking and client management engine. Oversee portfolios, verify investments, and maximize slabs.</p>
        </div>
      </div>

      {/* Right Column: Form Panel */}
      <div className="kfpl-login-panel">
        <div className="kfpl-login-card animate-scale-in">
          {/* Logo */}
          <div className="kfpl-login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ background: '#ffffff', padding: '6px', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.18)', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
              <img src="/logokfpl.jpeg" alt="KFPL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', display: 'block' }} />
            </div>
            <h1 className="kfpl-login-title">Agent Portal</h1>
            <p className="kfpl-login-subtitle">Access agent control console</p>
          </div>

          {/* Toggle Tabs (Only show if not in OTP step) */}
          {step !== 'otp' && (
            <div className="kfpl-login-tabs">
              <button 
                type="button" 
                className={`kfpl-login-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => { setActiveTab('login'); setStep('credentials'); setError(''); }}
              >
                Log In
              </button>
              <button 
                type="button" 
                className={`kfpl-login-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={handleShowAgreementBeforeRegister}
              >
                Create Account
              </button>
            </div>
          )}

          {/* STEP 1: CREDENTIALS (LOGIN) */}
          {step === 'credentials' && activeTab === 'login' && (
            <div className="animate-fade-in">
              {error && (
                <div className="kfpl-login-error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form className="kfpl-login-form" onSubmit={handleCredentialsSubmit}>
                <div className="kfpl-login-input-group">
                  <label className="kfpl-login-label">Email Address</label>
                  <input
                    type="email"
                    className="kfpl-login-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="kfpl-login-input-group">
                  <label className="kfpl-login-label">Password</label>
                  <div className="kfpl-login-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="kfpl-login-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="kfpl-login-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="kfpl-login-options">
                  <label className="kfpl-login-remember">
                    <input type="checkbox" /> Remember me
                  </label>
                  <span className="kfpl-login-forgot" onClick={() => navigate('/forgot-password')}>
                    Forgot Password?
                  </span>
                </div>

                <button type="submit" className="kfpl-login-btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: REGISTER (CREATE ACCOUNT) */}
          {step === 'register' && activeTab === 'register' && (
            <div className="animate-fade-in">
              {error && (
                <div className="kfpl-login-error">
                  <span>{error}</span>
                </div>
              )}

              <form className="kfpl-login-form" onSubmit={handleRegisterSubmit}>
                <div className="kfpl-login-register-scroll">
                  {/* Basic Info */}
                  <div className="kfpl-login-section-label">Basic Information</div>
                  <div className="kfpl-login-input-group">
                    <label className="kfpl-login-label">Full Name *</label>
                    <input type="text" name="name" className="kfpl-login-input" placeholder="Enter your name" value={regForm.name} onChange={handleRegisterChange} required />
                  </div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Email *</label>
                      <input type="email" name="email" className="kfpl-login-input" placeholder="Enter your email" value={regForm.email} onChange={handleRegisterChange} required />
                    </div>
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Phone *</label>
                      <input type="text" name="phone" className="kfpl-login-input" placeholder="Enter your phone number" value={regForm.phone} onChange={handleRegisterChange} required />
                    </div>
                  </div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Citizenship</label>
                      <select name="citizenship" className="kfpl-login-input" value={regForm.citizenship} onChange={handleRegisterChange}>
                        <option value="National">National (Domestic)</option>
                        <option value="International">International</option>
                      </select>
                    </div>
                  </div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">{regForm.citizenship === 'International' ? 'Tax ID / SSN' : 'PAN Number'}</label>
                      <input type="text" name="pan" className="kfpl-login-input" placeholder={regForm.citizenship === 'International' ? 'Enter Tax ID / SSN' : 'Enter PAN number'} value={regForm.pan} onChange={handleRegisterChange} />
                    </div>
                    {regForm.citizenship === 'National' ? (
                      <div className="kfpl-login-input-group">
                        <label className="kfpl-login-label">Aadhaar Number</label>
                        <input type="text" name="aadhaar" className="kfpl-login-input" placeholder="Enter Aadhaar number" maxLength="14" value={regForm.aadhaar} onChange={handleRegisterChange} />
                      </div>
                    ) : (
                      <div className="kfpl-login-input-group">
                        <label className="kfpl-login-label">Passport Number *</label>
                        <input type="text" name="passport" className="kfpl-login-input" placeholder="Enter passport number" value={regForm.passport} onChange={handleRegisterChange} required />
                      </div>
                    )}
                  </div>

                  {/* Bank Details */}
                  <div className="kfpl-login-section-label">Bank Details</div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Bank Name</label>
                      <input type="text" name="bankName" className="kfpl-login-input" placeholder="Enter bank name" value={regForm.bankName} onChange={handleRegisterChange} />
                    </div>
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">{regForm.citizenship === 'International' ? 'IFSC / SWIFT' : 'IFSC Code'}</label>
                      <input type="text" name="ifsc" className="kfpl-login-input" placeholder="Enter IFSC code" value={regForm.ifsc} onChange={handleRegisterChange} />
                    </div>
                  </div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Account Number</label>
                      <input type="password" name="accountNo" className="kfpl-login-input" placeholder="Enter account number" value={regForm.accountNo} onChange={handleRegisterChange} />
                    </div>
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Confirm Account No</label>
                      <input type="text" name="confirmAccountNo" className="kfpl-login-input" placeholder="Confirm account number" value={regForm.confirmAccountNo} onChange={handleRegisterChange} />
                    </div>
                  </div>



                  {/* Nominee Details */}
                  <div className="kfpl-login-section-label">Nominee Details (Optional)</div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Nominee Name</label>
                      <input type="text" name="nomineeName" className="kfpl-login-input" placeholder="Enter nominee name" value={regForm.nomineeName} onChange={handleRegisterChange} />
                    </div>
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Relation</label>
                      <select name="nomineeRelation" className="kfpl-login-input" value={regForm.nomineeRelation} onChange={handleRegisterChange}>
                        <option value="">Select Relation</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Child">Child</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Nominee Phone</label>
                      <input type="text" name="nomineeContact" className="kfpl-login-input" placeholder="Enter nominee phone number" value={regForm.nomineeContact} onChange={handleRegisterChange} />
                    </div>
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Nominee Email</label>
                      <input type="email" name="nomineeEmail" className="kfpl-login-input" placeholder="Enter nominee email" value={regForm.nomineeEmail} onChange={handleRegisterChange} />
                    </div>
                  </div>

                  {/* Documents Upload */}
                  <div className="kfpl-login-section-label">KYC Document Uploads</div>
                  <div className="kfpl-login-input-group">
                    <label className="kfpl-login-label">{regForm.citizenship === 'International' ? 'Tax ID Document' : 'PAN Card'}</label>
                    <input type="file" className="kfpl-login-input" onChange={(e) => setPanDocFile(e.target.files[0])} />
                  </div>
                  <div className="kfpl-login-input-group">
                    <label className="kfpl-login-label">{regForm.citizenship === 'International' ? 'Passport Document' : 'ID Proof Document'}</label>
                    <input type="file" className="kfpl-login-input" onChange={(e) => setIdProofDocFile(e.target.files[0])} />
                  </div>
                  <div className="kfpl-login-input-group">
                    <label className="kfpl-login-label">Bank Statement Proof</label>
                    <input type="file" className="kfpl-login-input" onChange={(e) => setBankProofDocFile(e.target.files[0])} />
                  </div>
                  <div className="kfpl-login-input-group">
                    <label className="kfpl-login-label">Nominee Proof Document (Optional)</label>
                    <input type="file" className="kfpl-login-input" onChange={(e) => setNomineeProofDocFile(e.target.files[0])} />
                  </div>


                  {/* Portal Password */}
                  <div className="kfpl-login-section-label">Portal Password</div>
                  <div className="kfpl-login-form-row">
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Password *</label>
                      <div className="kfpl-login-password-wrap">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          name="password"
                          className="kfpl-login-input"
                          placeholder="Enter your password"
                          value={regForm.password}
                          onChange={handleRegisterChange}
                          required
                        />
                        <button
                          type="button"
                          className="kfpl-login-password-toggle"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                        >
                          {showRegPassword ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="kfpl-login-input-group">
                      <label className="kfpl-login-label">Confirm Password *</label>
                      <div className="kfpl-login-password-wrap">
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          className="kfpl-login-input"
                          placeholder="Confirm your password"
                          value={regForm.confirmPassword}
                          onChange={handleRegisterChange}
                          required
                        />
                        <button
                          type="button"
                          className="kfpl-login-password-toggle"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        >
                          {showRegConfirmPassword ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Agreement Checkboxes */}
                  <div style={{ marginTop: '22px', borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.825rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={checkedAgreement} 
                        onChange={(e) => setCheckedAgreement(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--color-emerald)' }} 
                      />
                      <span>
                        I agree to the <span style={{ color: 'var(--color-emerald)', textDecoration: 'underline', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); openSingleDoc('agreement'); }}>Marketing Services Agreement</span> *
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.825rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={checkedPrivacy} 
                        onChange={(e) => setCheckedPrivacy(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--color-emerald)' }} 
                      />
                      <span>
                        I agree to the <span style={{ color: 'var(--color-emerald)', textDecoration: 'underline', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); openSingleDoc('privacy'); }}>Privacy Policy</span> *
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.825rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={checkedTnc} 
                        onChange={(e) => setCheckedTnc(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--color-emerald)' }} 
                      />
                      <span>
                        I agree to the <span style={{ color: 'var(--color-emerald)', textDecoration: 'underline', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); openSingleDoc('tnc'); }}>Terms & Conditions</span> *
                      </span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="kfpl-login-btn" 
                  style={{ 
                    marginTop: '20px', 
                    background: (checkedAgreement && checkedPrivacy && checkedTnc) ? 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)' : '#e2e8f0', 
                    color: (checkedAgreement && checkedPrivacy && checkedTnc) ? '#ffffff' : '#94a3b8',
                    boxShadow: (checkedAgreement && checkedPrivacy && checkedTnc) ? '0 4px 20px rgba(16, 185, 129, 0.2)' : 'none',
                    cursor: (checkedAgreement && checkedPrivacy && checkedTnc) ? 'pointer' : 'not-allowed'
                  }} 
                  disabled={loading || !checkedAgreement || !checkedPrivacy || !checkedTnc}
                >
                  {loading ? 'Registering Agent...' : 'Register'}
                </button>
              </form>
            </div>
          )}

          {/* TWO-FACTOR AUTHENTICATION STEP */}
          {step === 'otp' && (
            <div className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="kfpl-login-tfa-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Two-Factor Authentication</h2>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '12px' }}>
                  We sent a 6-digit verification code to your registered email.<br />Please enter the code below.
                </p>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  wordBreak: 'break-all'
                }}>
                  <span>OTP sent to your email: <strong>{email}</strong></span>
                </div>
              </div>

              {otpError && (
                <div className="kfpl-login-error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span>{otpError}</span>
                </div>
              )}

              <form className="kfpl-login-form" onSubmit={handleOtpSubmit}>
                <div className="kfpl-login-input-group">
                  <label className="kfpl-login-label">Verification Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    className="kfpl-login-input"
                    placeholder="Enter verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="kfpl-login-btn"
                    style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-gold)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 'none' }}
                    onClick={() => {
                      setStep('credentials');
                      setOtp('');
                      setOtpError('');
                    }}
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button type="submit" className="kfpl-login-btn" style={{ flex: 2 }} disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="kfpl-login-footer">
            © 2026 Kinetoscope Film Pvt Ltd. All rights reserved.
          </div>
        </div>
      </div>

      {/* Upgraded Legal Documents Wizard Modal */}
      {showAgreementModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '680px',
            padding: '36px', boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.25)',
            display: 'flex', flexDirection: 'column', maxHeight: '92vh',
            border: '1px solid rgba(241, 245, 249, 0.8)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Elegant Header Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>
                {agreementStep === 'agreement' && '1. Marketing Services Agreement'}
                {agreementStep === 'privacy' && '2. Privacy Policy'}
                {agreementStep === 'tnc' && '3. Terms & Conditions'}
              </h3>
              {!isSingleDocRead && (
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold, #10b981)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '100px' }}>
                  {agreementStep === 'agreement' && 'Step 1 of 3'}
                  {agreementStep === 'privacy' && 'Step 2 of 3'}
                  {agreementStep === 'tnc' && 'Step 3 of 3'}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '24px', lineHeight: '1.5', margin: 0 }}>
              Please scroll down to read and accept the terms completely to proceed.
            </p>


            {/* Step 1: Agreement text content */}
            {agreementStep === 'agreement' && (
              <div 
                onScroll={handleAgreementScroll}
                className="kfpl-legal-scroll"
                style={{
                  height: '480px', overflowY: 'auto', border: '1px solid #e2e8f0',
                  borderRadius: '14px', padding: '24px', background: '#f8fafc',
                  fontSize: '0.825rem', lineHeight: '1.7', color: '#334155',
                  marginBottom: '24px', scrollbarWidth: 'thin'
                }}
              >
                <h4 style={{ textAlign: 'center', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>MARKETING SERVICES AGREEMENT</h4>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '24px' }}>This Marketing Services Agreement (“<strong>Agreement</strong>”) is made on this <u>&nbsp; {new Date().getDate()} &nbsp;</u> day of <u>&nbsp; {new Date().toLocaleString('default', { month: 'long' })} &nbsp;</u> 20<u>{String(new Date().getFullYear()).slice(2)}</u> (“<strong>Effective Date</strong>”)</p>
                
                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>BETWEEN:</h5>
                <p style={{ margin: '0 0 10px' }}><strong>KINETOSCOPE FILMS PVT LTD</strong> (CIN is U59141MH2025PTC438600), a company incorporated in India under the Companies Act, 2013 (18 of 2013) by Limited its shares having PAN No. AALCK5262H and having its registered address at C 101, 1st Floor, Nishit CHSL, M G Road, Kandivali West, Mumbai – 400067, India (“<strong>The Company</strong>”);</p>
                
                <p style={{ margin: '0 0 10px' }}>AND</p>
                <p style={{ margin: '0 0 20px' }}><strong>{regForm.name || '[Marketing Partner Name]'}</strong>, an Individual / citizens of India / company registered under the Companies Act 2013 having Passport / Aadhaar No: <u>&nbsp; {regForm.passport || regForm.aadhaar || '__________'} &nbsp;</u>, having registered address / residing at <u>&nbsp; {regForm.address || '__________________________'} &nbsp;</u>, India, having PAN No: <u>&nbsp; {regForm.pan || '__________'} &nbsp;</u> (“<strong>Marketing Partner</strong>”).</p>
                
                <p>The Company and the Marketing Partner are collectively referred to as the “Parties” and individually as a “Party”.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>1. PURPOSE</h5>
                <p style={{ margin: '0 0 10px' }}>1.1 The Company appoints the Marketing Partner on a non-exclusive basis to promote and refer prospective clients in India for the Company’s products and services.</p>
                <p style={{ margin: '0 0 10px' }}>1.2 The Marketing Partner agrees to perform marketing and referral services in a professional manner and in accordance with this Agreement and any written guidelines issued by the Company.</p>
                <p style={{ margin: '0 0 10px' }}>1.3 Nothing in this Agreement creates any partnership, joint venture, employment, fiduciary, or agency relationship between the Parties.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>2. NATURE OF ARRANGEMENT</h5>
                <p style={{ margin: '0 0 10px' }}>2.1 The Marketing Partner is appointed strictly as a marketing and referral service provider.</p>
                <p style={{ margin: '0 0 10px' }}>2.2 The Marketing Partner shall not:<br />
                a) provide investment advice;<br />
                b) provide financial advisory services;<br />
                c) undertake regulated investment activity in its own capacity;<br />
                d) represent itself as licensed on behalf of the Company;<br />
                e) make any commitment binding on the Company.</p>
                <p style={{ margin: '0 0 10px' }}>2.3 All client onboarding, due diligence, acceptance, compliance checks, pricing, and transaction execution shall be conducted solely at the Company’s discretion.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>3. NON-EXCLUSIVE APPOINTMENT</h5>
                <p style={{ margin: '0 0 10px' }}>3.1 This appointment is strictly non-exclusive.</p>
                <p style={{ margin: '0 0 10px' }}>3.2 The Company may at any time and without restriction:<br />
                a) appoint other marketing partners or representatives in Indian Territory;<br />
                b) market its products and services directly other than the Marketing Partners onboarded clients;<br />
                c) enter into similar arrangements with third parties not linked with the marketing partner.</p>
                <p style={{ margin: '0 0 10px' }}>3.3 No territorial, sector, or client exclusivity is granted, but in case if this agreement discontinues later at any point of time then already onboarded clients through the above mentioned marketing partner will get their due services from the Company as it is without any disturbances.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>4. SCOPE OF SERVICES</h5>
                <p style={{ margin: '0 0 10px' }}>4.1 The Marketing Partner shall:<br />
                a) identify and introduce prospective clients in India;<br />
                b) conduct lawful and ethical marketing and promotional activities;<br />
                c) use only materials approved in writing by the Company;<br />
                d) facilitate introductions and preliminary communications;<br />
                e) promptly submit referral details in the format required by the Company;<br />
                f) comply with all applicable laws, regulations, and advertising standards in India;<br />
                g) refrain from making any unauthorised representations regarding the Company’s products.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>5. RESTRICTIONS ON AUTHORITY</h5>
                <p style={{ margin: '0 0 10px' }}>5.1 Unless expressly authorised in writing, the Marketing Partner shall not:<br />
                a) bind the Company to any contract or obligation;<br />
                b) undertake any services in any jurisdiction outside of India;<br />
                c) make guarantees, warranties, or assurances on behalf of the Company;<br />
                d) collect or receive funds for or on behalf of the Company;<br />
                e) hold itself out as agent, partner, branch, or representative of the Company;<br />
                f) provide financial, legal, tax, or investment advice on the Company’s behalf.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>6. COMPANY RESPONSIBILITIES</h5>
                <p style={{ margin: '0 0 10px' }}>6.1 The Company shall:<br />
                a) provide product information and approved marketing materials;<br />
                b) evaluate and onboard clients at its sole discretion;<br />
                c) conduct all KYC, AML, and compliance procedures;<br />
                d) maintain reasonable internal records of accepted referral clients;<br />
                e) calculate and pay the Remuneration in accordance with terms of this Agreement.<br />
                f) The company will be transparent to the Marketing partner regarding transaction account with the Client as per books limited to its clients only.<br />
                g) The Company will provide proper customer service support to the clients on demand or requirement.<br />
                h) The Company will sign individual agreement with each client for the Product and services provided by the company.<br />
                i) The Company will follow strictly the rules & regulations of its incorporation country i.e. India.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>7. REMUNERATION</h5>
                <p style={{ margin: '0 0 10px' }}>7.1 Subject to this Agreement, the Marketing Partner shall be entitled to receive <strong>Twenty-Five Percent (25%) of Net Profit After Tax</strong> derived from business generated by clients:<br />
                a) Introduced by the Marketing Partner; and<br />
                b) Formally accepted and onboarded by the Company.</p>
                <p style={{ margin: '0 0 10px' }}>7.2 “Net Profit After Tax” means revenue actually received by the Company from the referred client less all direct costs, operational expenses, third-party costs, provisions, write-offs, rebates, and applicable taxes attributable to servicing that client, as determined in good faith from the Company’s accounts. The Company’s determination shall be prima facie evidence absent manifest error.</p>
                <p style={{ margin: '0 0 10px' }}>7.3 Remuneration shall only be payable when:<br />
                a) cleared funds have been received;<br />
                b) the underlying transaction has been completed; and<br />
                c) the profit has been recognised in the Company’s accounts.</p>
                <p style={{ margin: '0 0 10px' }}>7.4 Payments shall be made semi-annually in arrears, within thirty (30) days after the end of each six (6) month period.</p>
                <p style={{ margin: '0 0 10px' }}>7.5 Payments are based solely on profits actually realised by the Company. The Company shall have no obligation to make advance, estimated, or projected payments.</p>
                <p style={{ margin: '0 0 10px' }}>7.6 Notwithstanding the above, the Company reserves the right, acting reasonably and in good faith, to defer any scheduled remuneration payment to a later date for bona fide cash flow or operational requirements, provided that the Company gives the Marketing Partner at least thirty (30) days’ prior written notice of such deferral.</p>
                <p style={{ margin: '0 0 10px' }}>7.7 Any deferred payment shall be paid within a reasonable time once the deferral condition is resolved, subject always to this Agreement.</p>
                <p style={{ margin: '0 0 10px' }}>7.8 Remuneration is payable only for leads accepted and recorded by the Company.</p>
                <p style={{ margin: '0 0 10px' }}>7.9 No remuneration is payable where the client:<br />
                a) was already known to the Company;<br />
                b) was independently sourced by the Company; or<br />
                c) fails the Company’s compliance requirements.</p>
                <p style={{ margin: '0 0 10px' }}>7.10 All onboarded clients shall remain sole clients of the Company at all times.</p>
                <p style={{ margin: '0 0 10px' }}>7.11 For the avoidance of doubt:<br />
                a) If no Net Profit After Tax is generated from any referred client, no remuneration shall be payable to the Marketing Partner in respect of such client.<br />
                b) The absence of profit or payment shall not relieve the Marketing Partner of its obligations, duties, representations, warranties, or liabilities under this Agreement.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>8. MARKETING CONDUCT AND MISREPRESENTATION</h5>
                <p style={{ margin: '0 0 10px' }}>8.1 The Marketing Partner shall ensure all promotions are accurate, fair, professional, and not misleading.</p>
                <p style={{ margin: '0 0 10px' }}>8.2 The Marketing Partner shall not:<br />
                a) guarantee returns;<br />
                b) describe products as risk-free (unless expressly approved);<br />
                c) provide investment advice;<br />
                d) issue unauthorised projections;<br />
                e) represent itself as an authorised financial intermediary.</p>
                <p style={{ margin: '0 0 10px' }}>8.3 The Marketing Partner acts as an independent contractor and is solely responsible for its marketing conduct.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>9. NO LIABILITY OF THE COMPANY IN CASE OF MISREPRESENTATION</h5>
                <p style={{ margin: '0 0 10px' }}>9.1 To the fullest extent permitted by law, the Company shall not be liable for any loss, claim, regulatory action, or damage arising from:<br />
                a) any misrepresentation by the Marketing Partner;<br />
                b) unauthorised statements made by the Marketing Partner;<br />
                c) breach of Indian law by the Marketing Partner;<br />
                d) marketing conducted without Company approval;<br />
                e) client disputes arising from the Marketing Partner’s conduct.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>10. INDEMNITY</h5>
                <p style={{ margin: '0 0 10px' }}>10.1 The Marketing Partner shall fully indemnify and hold harmless the Company and its directors, officers, employees, and affiliates against all claims, losses, penalties, damages, liabilities, and legal costs arising from:<br />
                a) marketing misrepresentation;<br />
                b) breach of applicable law in India;<br />
                c) unauthorised financial promotion;<br />
                d) breach of this Agreement;<br />
                e) negligence, wilful misconduct, or fraud.<br />
                This clause shall survive termination.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>11. REGULATORY COMPLIANCE (INDIA)</h5>
                <p style={{ margin: '0 0 10px' }}>11.1 The Marketing Partner is solely responsible for compliance with all applicable Indian laws.</p>
                <p style={{ margin: '0 0 10px' }}>11.2 The Marketing Partner shall obtain and maintain any licences or approvals required.</p>
                <p style={{ margin: '0 0 10px' }}>11.3 The Company makes no representation that the Marketing Partner’s activities are permitted under Indian law.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>12. TAXES</h5>
                <p style={{ margin: '0 0 10px' }}>12.1 Each Party shall be responsible for its own income and direct taxes.</p>
                <p style={{ margin: '0 0 10px' }}>12.2 Any indirect taxes arising from the Marketing Partner’s services shall be borne by the Marketing Partner, unless applicable law requires the Company to collect and remit such tax.</p>
                <p style={{ margin: '0 0 10px' }}>12.3 If the Company is required by law to withhold tax, it may do so and such withholding shall be deemed full settlement of the relevant payment portion.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>13. CONFIDENTIALITY</h5>
                <p style={{ margin: '0 0 10px' }}>13.1 Each Party shall keep confidential all non-public or proprietary information received from the other Party.</p>
                <p style={{ margin: '0 0 10px' }}>13.2 This obligation survives entire period of the agreement & even for five (5) years after termination.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>14. INTELLECTUAL PROPERTY</h5>
                <p style={{ margin: '0 0 10px' }}>14.1 All Company branding, materials, and intellectual property remain the exclusive property of the Company.</p>
                <p style={{ margin: '0 0 10px' }}>14.2 The Marketing Partner is granted a limited, revocable, non-transferable licence solely for performing this Agreement.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>15. NON-CIRCUMVENTION AND NON-SOLICITATION</h5>
                <p style={{ margin: '0 0 10px' }}>15.1 The Marketing Partner shall not, during the term of this Agreement and for twenty-four (24) months thereafter, directly or indirectly:<br />
                a) circumvent the Company in relation to any referred client;<br />
                b) solicit, divert, or attempt to divert any client of the Company;<br />
                c) introduce the Company’s clients to competing products or services;<br />
                d) interfere with the Company’s business relationship with any referred client.</p>
                <p style={{ margin: '0 0 10px' }}>15.2 The Marketing Partner shall not use any client information obtained through this Agreement for its own benefit or for any third party.</p>
                <p style={{ margin: '0 0 10px' }}>15.3 The Parties acknowledge that this clause is reasonable and necessary to protect the Company’s legitimate business interests.</p>
                <p style={{ margin: '0 0 10px' }}>15.4 Without prejudice to other remedies, the Company shall be entitled to injunctive relief for any breach of this clause.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>16. TERMS OF CONTINUITY AND TERMINATION</h5>
                <p style={{ margin: '0 0 10px' }}>16.1 This Agreement shall continue for three (3) years unless earlier terminated.</p>
                <p style={{ margin: '0 0 10px' }}>16.2 This Agreement can be renewed at the time of termination on mutual discussion between the parties for another three (3) Years and likewise.</p>
                <p style={{ margin: '0 0 10px' }}>16.3 Either Party may terminate by giving thirty (30) days’ written notice.</p>
                <p style={{ margin: '0 0 10px' }}>16.4 The Company may terminate immediately if the Marketing Partner commits material breach, legal breach, misconduct, insolvency, reputational risk, or fails to comply with the Company’s policies, procedures, compliance guidelines, branding rules, or written instructions (as updated from time to time). For the avoidance of doubt, the Company’s determination made in good faith shall be conclusive unless manifest error is proven.</p>
                <p style={{ margin: '0 0 10px' }}>16.5 Accrued and properly due payments remain payable, but no new entitlements shall arise after termination.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>17. BUSINESS CONTINUITY AND COOPERATION</h5>
                <p style={{ margin: '0 0 10px' }}>17.1 Notwithstanding any termination or expiry of this Agreement, each Party shall, where reasonably required for business continuity and orderly client servicing, continue to perform its relevant roles and responsibilities in respect of existing referred clients for a minimum period of six (6) months from the date of termination or until the completion of the applicable client engagement or transaction tenure, whichever is later.</p>
                <p style={{ margin: '0 0 10px' }}>17.2 During such continuation period, the Parties shall cooperate in good faith to ensure there is no disruption to client relationships, regulatory compliance, or ongoing transactions.</p>
                <p style={{ margin: '0 0 10px' }}>17.3 For the avoidance of doubt:<br />
                a) the Marketing Partner shall remain bound by its obligations under this Agreement; and<br />
                b) any remuneration entitlement during the continuation period shall remain subject to the terms of this Agreement.</p>
                <p style={{ margin: '0 0 10px' }}>17.4 This clause shall survive termination of this Agreement.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>18. FORCE MAJEURE</h5>
                <p style={{ margin: '0 0 10px' }}>18.1 Neither Party shall be liable for any failure or delay in performing its obligations under this Agreement (other than payment obligations already due) if such failure or delay is caused by events beyond its reasonable control (“Force Majeure Event”).</p>
                <p style={{ margin: '0 0 10px' }}>18.2 Force Majeure Event includes, but is not limited to:<br />
                a) acts of God, natural disasters, fire, flood, or epidemic or pandemic;<br />
                b) war, terrorism, civil unrest, or government actions or restrictions;<br />
                c) labour disputes or industrial action not involving the affected Party’s employees alone;<br />
                d) interruption or failure of utilities, transport, telecommunications, or internet services;<br />
                e) cyber incidents, system failures, or infrastructure outages beyond reasonable control;<br />
                f) regulatory or compliance restrictions imposed by any competent authority;<br />
                g) disruptions relating to vault facilities, custodians, bullion market suspension, liquidity constraints, or security or transport restrictions affecting the Company’s operations.</p>
                <p style={{ margin: '0 0 10px' }}>18.3 The affected Party shall:<br />
                a) promptly notify the other Party in writing of the Force Majeure Event; and<br />
                b) use reasonable endeavours to mitigate the effects of the Force Majeure Event.</p>
                <p style={{ margin: '0 0 10px' }}>18.4 If a Force Majeure Event continues for more than ninety (90) consecutive days, either Party may terminate this Agreement by written notice without liability, save for rights accrued prior to termination.</p>
                <p style={{ margin: '0 0 10px' }}>18.5 For the avoidance of doubt, a Force Majeure Event shall not excuse any obligation to pay amounts that have already become due and payable prior to the occurrence of the Force Majeure Event.</p>
                <p style={{ margin: '0 0 10px' }}>18.6 This clause shall survive termination of this Agreement.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>19. ENTIRE AGREEMENT</h5>
                <p style={{ margin: '0 0 10px' }}>19.1 This Agreement constitutes the entire agreement between the Parties in relation to the subject matter and supersedes all prior discussions, representations or understandings, whether written or oral.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>20. AMENDMENTS</h5>
                <p style={{ margin: '0 0 10px' }}>20.1 No amendment or modification to this Agreement shall be valid unless made in writing and signed by both Parties.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>21. SEVERABILITY</h5>
                <p style={{ margin: '0 0 10px' }}>21.1 If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>22. ELECTRONIC EXECUTION</h5>
                <p style={{ margin: '0 0 10px' }}>22.1 This Agreement may be executed electronically, in counterparts, or by digital or scanned signatures, each of which shall be deemed an original and together constitute one instrument.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>23. NO WAIVER</h5>
                <p style={{ margin: '0 0 10px' }}>23.1 Failure or delay by either Party to exercise any right shall not constitute a waiver of that right nor prevent its future exercise.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>24. ASSIGNMENT</h5>
                <p style={{ margin: '0 0 10px' }}>24.1 The Marketing Partner shall not assign or transfer any rights or obligations under this Agreement without the prior written consent of the Company.</p>
                <p style={{ margin: '0 0 10px' }}>24.2 The Company may assign or novate this Agreement to an Affiliated Entity or successor service provider upon written notice to the Marketing Partner.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>25. NOTICES AND COMMUNICATIONS</h5>
                <p style={{ margin: '0 0 10px' }}>25.1 Any notice or instruction under this Agreement may be given via email, electronic platform, messaging application, or written communication using the contact details last provided by the Marketing Partner.</p>
                <p style={{ margin: '0 0 10px' }}>25.2 Such communication shall be deemed received on the date sent unless proven otherwise.</p>
                <p style={{ margin: '0 0 10px' }}>25.3 The Marketing Partner is responsible for keeping contact details updated.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>26. GOVERNING LAW</h5>
                <p style={{ margin: '0 0 10px' }}>26.1 This Agreement and all rights and obligations arising from it shall be governed by and construed in accordance with the laws of India.</p>
                <p style={{ margin: '0 0 10px' }}>26.2 The validity, interpretation, performance and enforcement of this Agreement shall be determined in accordance with Indian law regardless of conflict of law principles.</p>
                <p style={{ margin: '0 0 10px' }}>26.3 The Parties agree that the location of storage, administration and performance of the Agreement is India.</p>

                <h5 style={{ fontWeight: 700, marginTop: '20px', marginBottom: '6px', color: '#1e293b' }}>27. DISPUTE RESOLUTION</h5>
                <p style={{ margin: '0 0 10px' }}>27.1 The Parties shall first attempt in good faith to resolve any dispute, controversy or claim arising out of or in connection with this Agreement through amicable discussions.</p>
                <p style={{ margin: '0 0 10px' }}>27.2 If both the parties unable to settle the disputes between them amicably on mutual discussions, then as per this agreement both the parties have to appoint Arbitrator as per the law of India & the disputes resolution will proceed through Indian Arbitration & Reconciliation Act.</p>
                <p style={{ margin: '0 0 10px' }}>27.3 If the dispute is still not resolved after arbitration then within thirty (30) days from written notice by one Party to the other, either Party may commence legal proceedings.</p>
                <p style={{ margin: '0 0 10px' }}>27.4 The Parties agree that the Courts of Mumbai, India shall have exclusive jurisdiction to hear and determine any dispute arising out of or in connection with this Agreement.</p>

                <h5 style={{ fontWeight: 700, marginTop: '24px', marginBottom: '8px', color: '#1e293b' }}>SIGNATURES:</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', fontSize: '0.75rem' }}>
                  <div>
                    <p style={{ margin: 0 }}><strong>For KINETOSCOPE FILMS PRIVATE LIMITED</strong></p>
                    <p style={{ margin: '4px 0 0' }}>Name: Sudeep Kumar Mukherjee</p>
                    <p style={{ margin: '2px 0 0' }}>Designation: Authorised Signatory</p>
                  </div>
                  <div>
                    <p style={{ margin: 0 }}><strong>For Marketing Partner</strong></p>
                    <p style={{ margin: '4px 0 0' }}>Name: {regForm.name || '__________________________'}</p>
                    <p style={{ margin: '2px 0 0' }}>Signature: [Executed Electronically]</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Privacy Policy text content */}
            {agreementStep === 'privacy' && (
              <div 
                onScroll={handleAgreementScroll}
                className="kfpl-legal-scroll"
                style={{
                  height: '480px', overflowY: 'auto', border: '1px solid #e2e8f0',
                  borderRadius: '14px', padding: '24px', background: '#f8fafc',
                  fontSize: '0.825rem', lineHeight: '1.7', color: '#334155',
                  marginBottom: '24px', scrollbarWidth: 'thin'
                }}
              >
                <h4 style={{ textAlign: 'center', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>KINETOSCOPE PRIVACY POLICY</h4>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '20px' }}>Last Updated: July 13, 2026</p>
                
                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>1. INFORMATION WE COLLECT</h5>
                <p style={{ margin: '0 0 10px' }}>We collect personal information that you provide to us directly during account registration, including your full name, email address, phone number, physical address, date of birth, and identity documentation (such as PAN, Aadhaar, and banking verification details).</p>
                
                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>2. HOW WE USE YOUR INFORMATION</h5>
                <p style={{ margin: '0 0 10px' }}>Your personal information is used exclusively to facilitate identity verification (KYC), process media financing agreements, manage portfolio returns, calculate entitlements, send transaction updates, and comply with the governing financial and corporate regulations in India.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>3. DATA PROTECTION & SECURITY</h5>
                <p style={{ margin: '0 0 10px' }}>We execute rigorous technical and organizational security controls to shield your personal details from unauthorized modification, deletion, disclosure, or access. All sensitive identity files are encrypted in transit and at rest.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>4. INFORMATION SHARING</h5>
                <p style={{ margin: '0 0 10px' }}>We do not sell, lease, or distribute your personal details to third-party advertising companies. Data sharing is limited to registered banking partners, compliance professionals, and regulatory authorities to execute transaction validation and security checks.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>5. DATA RETENTION</h5>
                <p style={{ margin: '0 0 10px' }}>We retain your personal data only for as long as is necessary to fulfill the legal and contractual business tasks outlined in our media financing programs, or as required by regulatory compliance norms.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>6. PRIVACY INQUIRIES</h5>
                <p style={{ margin: '0 0 10px' }}>If you have any questions or require updates regarding your data rights or storage, please reach out to the administrator panel at support@kinetoscope.com.</p>
              </div>
            )}

            {/* Step 3: Terms & Conditions text content */}
            {agreementStep === 'tnc' && (
              <div 
                onScroll={handleAgreementScroll}
                className="kfpl-legal-scroll"
                style={{
                  height: '480px', overflowY: 'auto', border: '1px solid #e2e8f0',
                  borderRadius: '14px', padding: '24px', background: '#f8fafc',
                  fontSize: '0.825rem', lineHeight: '1.7', color: '#334155',
                  marginBottom: '24px', scrollbarWidth: 'thin'
                }}
              >
                <h4 style={{ textAlign: 'center', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>KINETOSCOPE TERMS OF SERVICE</h4>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '20px' }}>Last Updated: July 13, 2026</p>
                
                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>1. ACCEPTANCE OF CONDITIONS</h5>
                <p style={{ margin: '0 0 10px' }}>By logging into the Kinetoscope client portal or creating an account, you unconditionally acknowledge and agree to stay bound by these Terms of Service, all applicable laws of India, and all relevant project agreements.</p>
                
                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>2. ACCOUNT REGISTRATION & ELIGIBILITY</h5>
                <p style={{ margin: '0 0 10px' }}>You must be at least 18 years of age and possess the legal capacity under Indian law to enter into binding agreements. You represent that all details submitted during onboarding are authentic, accurate, and complete.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>3. ACCOUNT SECURITY</h5>
                <p style={{ margin: '0 0 10px' }}>You are solely responsible for maintaining the confidentiality of your credentials (username, password, 2FA settings) and for any actions executed through your dashboard.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>4. PLATFORM ROLE & INHERENT RISKS</h5>
                <p style={{ margin: '0 0 10px' }}>Kinetoscope acts as an interactive client management console for media financing programs. The platform does not serve as a registered financial advisory, bank, or mutual fund. All participations contain business variables linked to production schedules, which are outlined in the core agreement.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>5. ACCESS LIMITATIONS</h5>
                <p style={{ margin: '0 0 10px' }}>We reserve the right, without liability or prior warning, to block access to your client dashboard in the event of suspected fraud, identity misrepresentation, compliance breach, or violation of these terms.</p>

                <h5 style={{ fontWeight: 700, marginTop: '16px', marginBottom: '6px', color: '#1e293b' }}>6. AMENDMENTS TO TERMS</h5>
                <p style={{ margin: '0 0 10px' }}>Kinetoscope reserves the right to modify these terms. We will notify active clients of material changes via email or direct portal notifications.</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 
                (agreementStep === 'agreement' && hasReadAgreement) || 
                (agreementStep === 'privacy' && hasReadPrivacy) || 
                (agreementStep === 'tnc' && hasReadTnc) ? 'var(--color-gold, #10b981)' : '#ef4444' 
              }}>
                {agreementStep === 'agreement' && (hasReadAgreement ? '✓ Scroll Complete' : '⚠ Scroll to the bottom')}
                {agreementStep === 'privacy' && (hasReadPrivacy ? '✓ Scroll Complete' : '⚠ Scroll to the bottom')}
                {agreementStep === 'tnc' && (hasReadTnc ? '✓ Scroll Complete' : '⚠ Scroll to the bottom')}
              </span>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="kfpl-login-btn"
                  style={{
                    background: '#f8fafc', color: '#64748b', boxShadow: 'none', border: '1px solid #cbd5e1',
                    height: '38px', padding: '0 18px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center',
                    borderRadius: '10px'
                  }}
                  onClick={() => setShowAgreementModal(false)}
                >
                  Cancel
                </button>

                {/* Case 1: Going through the wizard */}
                {!isSingleDocRead && agreementStep === 'agreement' && (
                  <button
                    type="button"
                    className="kfpl-login-btn"
                    style={{
                      height: '38px', padding: '0 20px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center',
                      borderRadius: '10px',
                      background: hasReadAgreement ? 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)' : '#e2e8f0',
                      color: hasReadAgreement ? '#fff' : '#94a3b8',
                      cursor: hasReadAgreement ? 'pointer' : 'not-allowed',
                      boxShadow: hasReadAgreement ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                    disabled={!hasReadAgreement}
                    onClick={() => {
                      setAgreementStep('privacy');
                    }}
                  >
                    Next: Privacy Policy
                  </button>
                )}

                {!isSingleDocRead && agreementStep === 'privacy' && (
                  <button
                    type="button"
                    className="kfpl-login-btn"
                    style={{
                      height: '38px', padding: '0 20px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center',
                      borderRadius: '10px',
                      background: hasReadPrivacy ? 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)' : '#e2e8f0',
                      color: hasReadPrivacy ? '#fff' : '#94a3b8',
                      cursor: hasReadPrivacy ? 'pointer' : 'not-allowed',
                      boxShadow: hasReadPrivacy ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                    disabled={!hasReadPrivacy}
                    onClick={() => {
                      setAgreementStep('tnc');
                    }}
                  >
                    Next: Terms & Conditions
                  </button>
                )}

                {!isSingleDocRead && agreementStep === 'tnc' && (
                  <button
                    type="button"
                    className="kfpl-login-btn"
                    style={{
                      height: '38px', padding: '0 20px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center',
                      borderRadius: '10px',
                      background: hasReadTnc ? 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)' : '#e2e8f0',
                      color: hasReadTnc ? '#fff' : '#94a3b8',
                      cursor: hasReadTnc ? 'pointer' : 'not-allowed',
                      boxShadow: hasReadTnc ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                    disabled={!hasReadTnc || loading}
                    onClick={() => {
                      setShowAgreementModal(false);
                      setCheckedAgreement(true);
                      setCheckedPrivacy(true);
                      setCheckedTnc(true);
                      setActiveTab('register');
                      setStep('register');
                      setError('');
                    }}
                  >
                    Agree & Proceed
                  </button>
                )}

                {/* Case 2: Reading single document from form link */}
                {isSingleDocRead && (
                  <button
                    type="button"
                    className="kfpl-login-btn"
                    style={{
                      height: '38px', padding: '0 20px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center',
                      borderRadius: '10px',
                      background: (
                        (isSingleDocRead === 'agreement' && hasReadAgreement) ||
                        (isSingleDocRead === 'privacy' && hasReadPrivacy) ||
                        (isSingleDocRead === 'tnc' && hasReadTnc)
                      ) ? 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)' : '#e2e8f0',
                      color: (
                        (isSingleDocRead === 'agreement' && hasReadAgreement) ||
                        (isSingleDocRead === 'privacy' && hasReadPrivacy) ||
                        (isSingleDocRead === 'tnc' && hasReadTnc)
                      ) ? '#fff' : '#94a3b8',
                      cursor: (
                        (isSingleDocRead === 'agreement' && hasReadAgreement) ||
                        (isSingleDocRead === 'privacy' && hasReadPrivacy) ||
                        (isSingleDocRead === 'tnc' && hasReadTnc)
                      ) ? 'pointer' : 'not-allowed',
                      boxShadow: (
                        (isSingleDocRead === 'agreement' && hasReadAgreement) ||
                        (isSingleDocRead === 'privacy' && hasReadPrivacy) ||
                        (isSingleDocRead === 'tnc' && hasReadTnc)
                      ) ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                    disabled={!(
                      (isSingleDocRead === 'agreement' && hasReadAgreement) ||
                      (isSingleDocRead === 'privacy' && hasReadPrivacy) ||
                      (isSingleDocRead === 'tnc' && hasReadTnc)
                    )}
                    onClick={() => {
                      if (isSingleDocRead === 'agreement') setCheckedAgreement(true);
                      if (isSingleDocRead === 'privacy') setCheckedPrivacy(true);
                      if (isSingleDocRead === 'tnc') setCheckedTnc(true);
                      setShowAgreementModal(false);
                    }}
                  >
                    Agree & Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
