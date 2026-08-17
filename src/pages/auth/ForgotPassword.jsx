/* ============================================================
   Page: ForgotPassword.jsx
   Description: Email-based OTP password reset flow
   ============================================================ */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=newPassword
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 800);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 800);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/login');
    }, 800);
  };

  return (
    <div className="kfpl-login">
      {/* Left Column: Cinema Wallpaper */}
      <div className="kfpl-login-wallpaper">
        <div className="kfpl-login-brand">
          <div style={{ background: '#ffffff', padding: '6px', width: '68px', height: '68px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginBottom: '16px' }}>
            <img src="/logokfpl.jpeg" alt="KFPL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px', display: 'block' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.15 }}>Kinetoscope Films Pvt Ltd</h1>
          <p style={{ fontSize: '12px', color: 'rgba(240, 253, 244, 0.9)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '6px', marginBottom: '12px', fontWeight: '700' }}>A Global Media Fund</p>
          <p>Partner Dashboard. Reset your credentials securely here.</p>
        </div>
      </div>

      {/* Right Column: Form Panel */}
      <div className="kfpl-login-panel">
        <div className="kfpl-login-card animate-scale-in">
          <div className="kfpl-login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ background: '#ffffff', padding: '6px', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.18)', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
              <img src="/logokfpl.jpeg" alt="KFPL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', display: 'block' }} />
            </div>
            <h1 className="kfpl-login-title">Reset Password</h1>
            <p className="kfpl-login-subtitle">
              {step === 1 ? 'Enter your email to receive a 6-digit OTP' : step === 2 ? 'Enter the OTP sent to your email' : 'Set your new password'}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="kfpl-login-form animate-fade-in">
              <div className="kfpl-login-input-group">
                <label className="kfpl-login-label">Email Address</label>
                <input 
                  className="kfpl-login-input" 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  autoFocus 
                />
              </div>
              <button type="submit" className="kfpl-login-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="kfpl-login-form animate-fade-in">
              <div className="kfpl-login-input-group">
                <label className="kfpl-login-label">6-Digit OTP</label>
                <input 
                  className="kfpl-login-input" 
                  type="text" 
                  placeholder="Enter verification code" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)} 
                  maxLength={6} 
                  required 
                  autoFocus 
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem', fontWeight: 700 }} 
                />
              </div>
              <button type="submit" className="kfpl-login-btn" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="kfpl-login-form animate-fade-in">
              <div className="kfpl-login-input-group">
                <label className="kfpl-login-label">New Password</label>
                <input 
                  className="kfpl-login-input" 
                  type="password" 
                  placeholder="Enter your new password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="kfpl-login-input-group">
                <label className="kfpl-login-label">Confirm Password</label>
                <input 
                  className="kfpl-login-input" 
                  type="password" 
                  placeholder="Confirm your new password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="kfpl-login-btn" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span className="kfpl-login-forgot" onClick={() => navigate('/login')}>
              ← Back to Sign In
            </span>
          </div>

          <div className="kfpl-login-footer">
            © 2026 Kinetoscope Films Pvt Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ END: ForgotPassword.jsx ============ */
