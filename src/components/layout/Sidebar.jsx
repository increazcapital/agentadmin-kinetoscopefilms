/* ============================================================
   Component: Sidebar.jsx
   Description: Fixed left navigation for Agent Portal
   Aesthetics match Super Admin sidebar perfectly
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { apiRequest } from '../../config/apiHelper';
import { getApiUrl } from '../../config/apiUrl';

// ── SVG Icons ───────────────────────
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  commission: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  newsMedia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  grow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  withdrawal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  serviceRequests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const navSections = [
  {
    title: 'Main',
    items: [
      { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
      { path: '/profile', icon: 'profile', label: 'Profile' },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { path: '/clients', icon: 'clients', label: 'My Clients' },
      { path: '/commission', icon: 'commission', label: 'Commission' },
      { path: '/rewards', icon: 'rewards', label: 'Rewards' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { path: '/withdrawal', icon: 'withdrawal', label: 'Withdrawal' },
    ],
  },
  {
    title: 'Help & Support',
    items: [
      { path: '/service-requests', icon: 'serviceRequests', label: 'Service Requests' },
      { path: '/faq', icon: 'support', label: 'FAQ' },
      { path: '/support', icon: 'support', label: 'Support' },
    ],
  },
  {
    title: 'Others',
    items: [
      { path: '/grow', icon: 'newsMedia', label: 'Media & News' },
      { path: '/settings', icon: 'settings', label: 'Settings' },
    ],
  },
];

export default function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }) {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await apiRequest('/api/agent/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.error(e);
    }
    // Clear all cached pages from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('kfpl_') && key !== 'kfpl_agent_auth') {
        localStorage.removeItem(key);
      }
      // Nuclear wipe all SWR cached data (user-scoped)
      if (key.startsWith('swr_')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('kfpl_agent_auth');
    window.location.href = '/login';
  };

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  // ── Tooltip state for collapsed sidebar (renders outside scrolling container) ──
  const [tooltip, setTooltip] = useState({ visible: false, text: '', top: 0, left: 0 });

  // Dynamic Branding State with Instant Live Sync
  const [branding, setBranding] = useState(() => {
    try {
      const cached = localStorage.getItem('yieldiq_branding');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          companyName: parsed.companyName || 'YIELDIQ',
          tagline: parsed.tagline || '',
          logoUrl: parsed.logoUrl || '/logokfpl.jpeg',
        };
      }
    } catch (e) {}
    return {
      companyName: 'YIELDIQ',
      tagline: '',
      logoUrl: '/logokfpl.jpeg',
    };
  });

  // Real-time live branding sync engine
  useEffect(() => {
    const applyBranding = (data) => {
      if (!data) return;
      setBranding({
        companyName: data.companyName || 'YIELDIQ',
        tagline: data.tagline || '',
        logoUrl: data.logoUrl || '/logokfpl.jpeg',
      });
      if (data.faviconUrl) {
        const link = document.querySelector("link[rel*='icon']");
        if (link) link.href = data.faviconUrl;
      }
    };

    const fetchBranding = async () => {
      try {
        const res = await fetch(getApiUrl('/api/system-settings/branding'));
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            applyBranding(data.data);
          }
        }
      } catch (err) {}
    };

    fetchBranding();

    // 1. BroadcastChannel for cross-tab instant messaging
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('yieldiq_branding_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'BRANDING_UPDATED') {
          applyBranding(event.data.data);
        }
      };
    }

    // 2. Local custom event
    const handleCustomEvent = (e) => {
      if (e.detail) applyBranding(e.detail);
    };
    window.addEventListener('yieldiq_branding_updated', handleCustomEvent);

    // 3. Storage event for cross-tab sync
    const handleStorage = (e) => {
      if (e.key === 'yieldiq_branding_updated' || e.key === 'yieldiq_branding') {
        try {
          const stored = localStorage.getItem('yieldiq_branding');
          if (stored) applyBranding(JSON.parse(stored));
          else fetchBranding();
        } catch (err) {
          fetchBranding();
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. On tab focus & short background polling interval (3s)
    window.addEventListener('focus', fetchBranding);
    const pollInterval = setInterval(fetchBranding, 3000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('yieldiq_branding_updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', fetchBranding);
      clearInterval(pollInterval);
    };
  }, []);

  const handleTooltipEnter = useCallback((e) => {
    if (!isCollapsed) return;
    const el = e.currentTarget;
    const label = el.getAttribute('data-tooltip');
    if (!label) return;
    const rect = el.getBoundingClientRect();
    setTooltip({
      visible: true,
      text: label,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  }, [isCollapsed]);

  const handleTooltipLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`kfpl-sidebar-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={onMobileClose}
      />

      <aside className={`kfpl-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="kfpl-sidebar-logo">
          <div className="kfpl-sidebar-logo-icon" style={{ background: '#f8fafc', padding: '3px', width: '40px', height: '40px', minWidth: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', flexShrink: 0 }}>
            <img src={branding.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '7px', objectFit: 'contain', display: 'block' }} />
          </div>
          <div className="kfpl-sidebar-logo-text" style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div className="kfpl-sidebar-marquee-wrapper">
              <div className="kfpl-sidebar-marquee-track">
                <div className="kfpl-marquee-group">
                  <span>{branding.companyName.toUpperCase()}</span>
                  <span className="kfpl-marquee-dot">&bull;</span>
                  <span>{branding.companyName.toUpperCase()}</span>
                  <span className="kfpl-marquee-dot">&bull;</span>
                </div>
                <div className="kfpl-marquee-group" aria-hidden="true">
                  <span>{branding.companyName.toUpperCase()}</span>
                  <span className="kfpl-marquee-dot">&bull;</span>
                  <span>{branding.companyName.toUpperCase()}</span>
                  <span className="kfpl-marquee-dot">&bull;</span>
                </div>
              </div>
            </div>
            {branding.tagline ? (
              <span className="kfpl-sidebar-logo-tagline" style={{ fontSize: '9.5px', color: '#F5A800', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '1px', display: 'block', fontWeight: '700' }}>{branding.tagline}</span>
            ) : null}
            <span className="kfpl-sidebar-logo-subtitle">PARTNER DASHBOARD</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="kfpl-sidebar-nav">
          {navSections.map((section) => (
            <div className="kfpl-sidebar-section" key={section.title}>
              <div className="kfpl-sidebar-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`kfpl-sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={onMobileClose}
                  data-tooltip={item.label}
                  onMouseEnter={handleTooltipEnter}
                  onMouseLeave={handleTooltipLeave}
                >
                  <span className="kfpl-sidebar-item-icon">{icons[item.icon]}</span>
                  <span className="kfpl-sidebar-item-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom Section: Logout + Collapse */}
        <div className="kfpl-sidebar-bottom">
          <div className="kfpl-sidebar-item kfpl-sidebar-logout" onClick={handleLogout} data-tooltip="Logout" onMouseEnter={handleTooltipEnter} onMouseLeave={handleTooltipLeave}>
            <span className="kfpl-sidebar-item-icon">{icons.logout}</span>
            <span className="kfpl-sidebar-item-label">Logout</span>
          </div>
          <div className="kfpl-sidebar-toggle" onClick={onToggle} data-tooltip={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} onMouseEnter={handleTooltipEnter} onMouseLeave={handleTooltipLeave}>
            {icons.chevronLeft}
          </div>
        </div>
      </aside>

      {/* Fixed-position tooltip rendered outside sidebar scroll container */}
      {isCollapsed && tooltip.visible && (
        <div
          className="kfpl-sidebar-tooltip-fixed"
          style={{
            position: 'fixed',
            top: tooltip.top,
            left: tooltip.left,
            transform: 'translateY(-50%)',
            background: '#FFFFFF',
            color: '#F5A800',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(245, 168, 0, 0.18)',
            zIndex: 99999999,
            pointerEvents: 'none',
            letterSpacing: '0.3px',
            fontFamily: 'var(--font-family, Inter, sans-serif)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </>
  );
}
