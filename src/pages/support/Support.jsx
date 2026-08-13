/* ============================================================
   Page: Support.jsx
   Description: Dynamic Agent Support Desk with live Super Admin configuration
   ============================================================ */

import { useState, useEffect } from 'react';
import { apiRequest } from '../../config/apiHelper';
import { getApiUrl } from '../../config/apiUrl';

export default function Support() {
  const [supportData, setSupportData] = useState(() => {
    try {
      const cached = localStorage.getItem('kfpl_support_settings_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      agentSupportEmail: 'support@kfpl.in',
      agentSupportPhone: '+91 99999 99999',
      agentSupportWhatsapp: '919999999999',
      supportHours: 'Mon - Sat, 10 AM to 6 PM IST',
    };
  });

  const [agentCode, setAgentCode] = useState('KFPL-AG-1001');

  // Bulletproof Agent ID Formatter (guarantees KFPL-AG-100X format, never KFPL-AG-100001)
  const formatAgentID = (rawId) => {
    if (!rawId || rawId === '—') return 'KFPL-AG-1001';
    const str = String(rawId).trim();
    if (/^KFPL-AG-\d{4}$/i.test(str)) {
      return str.toUpperCase();
    }
    const match = str.match(/\d+/);
    if (match) {
      const lastDigits = match[0].slice(-4);
      let num = parseInt(lastDigits, 10);
      if (isNaN(num)) num = 1001;
      if (num < 1000) num = 1000 + num;
      return `KFPL-AG-${num}`;
    }
    return 'KFPL-AG-1001';
  };

  useEffect(() => {
    // 1) Read local auth storage for fast render
    try {
      const authStr = localStorage.getItem('kfpl_agent_auth');
      if (authStr) {
        const parsed = JSON.parse(authStr);
        const agentObj = parsed.agent || parsed.user || {};
        const code = agentObj.agentCode || agentObj.clientCode || agentObj.code || parsed.user?.clientCode || '';
        if (code) {
          setAgentCode(formatAgentID(code));
        }
      }
    } catch (e) {}

    // 2) Fetch live agent session from backend to populate exact Agent ID
    const fetchMe = async () => {
      try {
        const meRes = await apiRequest('/api/agent/auth/me').catch(() => null);
        if (meRes && meRes.data) {
          const userCode = meRes.data.user?.clientCode || meRes.data.profile?.clientCode || meRes.data.user?.agentCode || '';
          if (userCode) {
            setAgentCode(formatAgentID(userCode));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch agent profile details:', err);
      }
    };
    fetchMe();

    // 3) Direct fetch live Support Desk contact configuration set by Super Admin
    const fetchSupportSettings = async () => {
      try {
        const url = getApiUrl('/api/system-settings/support');
        const response = await fetch(url);
        if (response.ok) {
          const res = await response.json();
          if (res && res.data) {
            let email = res.data.agentSupportEmail;
            if (!email || !email.includes('@')) email = 'support@kfpl.in';
            const updated = {
              agentSupportEmail: email,
              agentSupportPhone: res.data.agentSupportPhone || '+91 99999 99999',
              agentSupportWhatsapp: res.data.agentSupportWhatsapp || '919999999999',
              supportHours: res.data.supportHours || 'Mon - Sat, 10 AM to 6 PM IST',
            };
            setSupportData(updated);
            localStorage.setItem('kfpl_support_settings_cache', JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error('Failed to fetch support settings:', err);
      }
    };
    fetchSupportSettings();
  }, []);

  const cleanWaNumber = (supportData.agentSupportWhatsapp || '919999999999').replace(/[^0-9]/g, '');
  const waText = agentCode ? `?text=Hi%20Kinetoscope%20Support%2C%20I'm%20agent%20${encodeURIComponent(agentCode)}` : '';
  const waLink = `https://wa.me/${cleanWaNumber}${waText}`;
  const cleanPhone = (supportData.agentSupportPhone || '+919999999999').replace(/\s/g, '');
  const displayEmail = (supportData.agentSupportEmail && supportData.agentSupportEmail.includes('@')) 
    ? supportData.agentSupportEmail 
    : 'support@kfpl.in';

  return (
    <div className="kfpl-page" id="support-page">
      {/* Header */}
      <div className="kfpl-page-header">
        <div className="kfpl-page-header-left">
          <h1 className="kfpl-page-title">Support</h1>
          <p className="kfpl-page-subtitle">Contact the Kinetoscope support desk for commission, client, and payout assistance.</p>
        </div>
      </div>

      {/* Hero Overview Banner */}
      <div className="kfpl-support-overview kfpl-support-hero" style={{
        background: 'linear-gradient(135deg, #052e16 0%, #0f5132 100%)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 8px 30px rgba(5, 46, 22, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#34d399" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(52, 211, 153, 0.15)',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '8px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              Agent Help Desk
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              We are here to help
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', margin: 0, maxWidth: '540px' }}>
              Priority assistance for agent payouts, client assignments, and platform guidance. Support requests automatically attach your verified Agent ID.
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          padding: '14px 22px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px'
        }}>
          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px' }}>
            Agent ID: {agentCode}
          </span>
          <small style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {supportData.supportHours || 'Mon - Sat, 10 AM to 6 PM IST'}
          </small>
        </div>
      </div>

      {/* Support Cards Grid */}
      <div className="kfpl-support-cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>

        {/* 1. WhatsApp Card */}
        <div style={{
          background: 'var(--color-surface, #ffffff)',
          borderRadius: '16px',
          padding: '26px',
          border: '1px solid rgba(37, 211, 102, 0.25)',
          boxShadow: '0 4px 20px -2px rgba(37, 211, 102, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #25D366 0%, #128C7E 100%)'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(37, 211, 102, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#25D366'
              }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-navy, #0f172a)', margin: 0 }}>
                  WhatsApp Support
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Instant Chat Response
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
              Chat instantly on WhatsApp (+<strong style={{ color: '#0f172a' }}>{cleanWaNumber}</strong>). Pre-filled with your verified Agent ID <strong style={{ color: '#0f172a' }}>({agentCode})</strong> for priority assistance.
            </p>
          </div>

          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 20px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.9375rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
            transition: 'transform 0.2s ease'
          }}>
            <span>Open WhatsApp</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>

        {/* 2. Email Card */}
        <div style={{
          background: 'var(--color-surface, #ffffff)',
          borderRadius: '16px',
          padding: '26px',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: '0 4px 20px -2px rgba(59, 130, 246, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6'
              }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-navy, #0f172a)', margin: 0 }}>
                  Email Support
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Official Helpdesk
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
              Send official inquiries or commission logs to <strong style={{ color: '#0f172a' }}>{displayEmail}</strong>. Available {supportData.supportHours}.
            </p>
          </div>

          <a href={`mailto:${displayEmail}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 20px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.9375rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.2s ease'
          }}>
            <span>Send Email</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>

        {/* 3. Phone Card */}
        <div style={{
          background: 'var(--color-surface, #ffffff)',
          borderRadius: '16px',
          padding: '26px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: '0 4px 20px -2px rgba(16, 185, 129, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #047857 100%)'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-navy, #0f172a)', margin: 0 }}>
                  Phone Support
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Priority Helpline
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
              Speak directly with an account manager at <strong style={{ color: '#0f172a' }}>{supportData.agentSupportPhone}</strong>. Available {supportData.supportHours}.
            </p>
          </div>

          <a href={`tel:${cleanPhone}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 20px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.9375rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            transition: 'transform 0.2s ease'
          }}>
            <span>Call Dedicated Line</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>

      </div>
    </div>
  );
}

/* ============ END: Support.jsx ============ */
