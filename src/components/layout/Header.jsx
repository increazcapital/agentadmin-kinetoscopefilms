/* ============================================================
   Component: Header.jsx
   Description: Top header bar — page title, interactive notifications, profile
   ============================================================ */

import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/profile': 'Profile',
  '/clients': 'My Clients',
  '/commission': 'Commission',
  '/rewards': 'Rewards & Redemption',
  '/grow': 'Media & News',
  '/withdrawal': 'Withdrawal',
  '/service-requests': 'Service Requests',
  '/support': 'Support',
  '/settings': 'Settings',
};

export default function Header({ isCollapsed, onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const readAgentInfo = () => {
    let name = 'Agent';
    let profilePic = '';

    try {
      const authData = localStorage.getItem('kfpl_agent_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const agentObj = parsed.agent || parsed.user || {};
        name = agentObj.name || agentObj.fullName || name;
        if (agentObj.profilePic !== undefined) profilePic = agentObj.profilePic || '';
      }
    } catch (e) {}

    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        const p = parsed.profile || {};
        if (p.name || p.fullName) name = p.name || p.fullName;
        if (p.profilePic !== undefined) profilePic = p.profilePic || '';
      }
    } catch (e) {}

    return { name, profilePic };
  };

  const [agentInfo, setAgentInfo] = useState(() => readAgentInfo());
  const agentName = agentInfo.name;
  const agentPic = agentInfo.profilePic;

  useEffect(() => {
    const handleUpdate = () => {
      setAgentInfo(readAgentInfo());
    };
    window.addEventListener('agentProfileUpdated', handleUpdate);
    return () => window.removeEventListener('agentProfileUpdated', handleUpdate);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('/api/agent/notifications');
      if (res && (res.notifications || res.data)) {
        const list = res.notifications || res.data || [];
        
        let readIds = [];
        try {
          const stored = localStorage.getItem('kfpl_agent_read_notifs');
          readIds = stored ? JSON.parse(stored) : [];
        } catch (e) {}

        const formatted = list.map((n) => ({
          ...n,
          isRead: readIds.includes(n.id),
        }));

        setNotifications(formatted);
        setUnreadCount(formatted.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to fetch agent notifications:', err);
    }
  };

  useEffect(() => {
    const loadAgentName = async () => {
      const authData = localStorage.getItem('kfpl_agent_auth');
      let currentLocalName = 'Agent';
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          const agentObj = parsed.agent || parsed.user || {};
          currentLocalName = agentObj.name || agentObj.fullName || 'Agent';
          setAgentInfo(prev => ({ ...prev, name: currentLocalName }));
        } catch (e) {
          console.error(e);
        }
      }

      try {
        const res = await apiRequest('/api/agent/profile');
        if (res) {
          const profile = res.profile || res.agent || res.data || res;
          let freshName = profile.name || profile.fullName || currentLocalName;
          
          if (
            (freshName.toLowerCase().includes('demo') || freshName.toLowerCase() === 'agent') &&
            currentLocalName &&
            !currentLocalName.toLowerCase().includes('demo')
          ) {
            freshName = currentLocalName;
          }

          setAgentInfo(prev => ({ ...prev, name: freshName }));

          if (authData) {
            const parsed = JSON.parse(authData);
            parsed.agent = {
              ...(parsed.agent || {}),
              name: freshName,
              fullName: freshName
            };
            localStorage.setItem('kfpl_agent_auth', JSON.stringify(parsed));
          }
        }
      } catch (err) {
        console.warn('Failed to load fresh agent profile in header:', err);
      }
    };

    loadAgentName();
    fetchNotifications();
    window.addEventListener('storage', loadAgentName);
    return () => window.removeEventListener('storage', loadAgentName);
  }, []);

  const pageTitle = routeTitles[location.pathname] || 'Agent Portal';

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem('kfpl_agent_read_notifs', JSON.stringify(allIds));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markSingleAsRead = (id) => {
    let readIds = [];
    try {
      const stored = localStorage.getItem('kfpl_agent_read_notifs');
      readIds = stored ? JSON.parse(stored) : [];
    } catch (e) {}

    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('kfpl_agent_read_notifs', JSON.stringify(readIds));
    }

    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(updated.filter((n) => !n.isRead).length);
      return updated;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('kfpl_agent_auth');
    window.location.href = '/login';
  };

  return (
    <header className="kfpl-header">
      <style>{`
        .kfpl-notif-dropdown-card {
          position: absolute;
          top: 50px;
          right: 0;
          width: 360px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.15);
          border: 1px solid #e2e8f0;
          z-index: 1000;
          animation: slideDownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .kfpl-notif-dropdown-header {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kfpl-notif-dropdown-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: #0f172a;
        }

        .kfpl-notif-dropdown-body {
          max-height: 320px;
          overflow-y: auto;
        }

        .kfpl-notif-item {
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid #f1f5f9;
        }

        .kfpl-notif-item:hover {
          background: #f8fafc;
        }

        .kfpl-notif-item:last-child {
          border-bottom: none;
        }

        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="kfpl-header-left">
        <button className="kfpl-header-menu-btn" onClick={onMenuClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="kfpl-header-page-title">{pageTitle}</h1>
      </div>

      <div className="kfpl-header-right">
        {/* Notifications Dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button 
            className="kfpl-header-icon-btn" 
            title="Notifications"
            onClick={() => {
              const next = !showNotifDropdown;
              setShowNotifDropdown(next);
              setShowDropdown(false);
              if (next) {
                markAllAsRead();
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="kfpl-header-notif-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 800, color: '#fff', background: '#e11d48', width: '15px', height: '15px', top: '-2px', right: '-2px', borderRadius: '50%', position: 'absolute' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="kfpl-notif-dropdown-card">
              <div className="kfpl-notif-dropdown-header">
                <span className="kfpl-notif-dropdown-title">Agent Notifications</span>
                {notifications.some((n) => !n.isRead) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.725rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="kfpl-notif-dropdown-body">
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.825rem' }}>
                    No recent notifications found.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className="kfpl-notif-item"
                      style={{ background: n.isRead ? 'transparent' : 'rgba(16, 185, 129, 0.04)' }}
                      onClick={() => {
                        markSingleAsRead(n.id);
                        if (n.link) navigate(n.link);
                        setShowNotifDropdown(false);
                      }}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: n.category === 'danger' ? '#fef2f2' : n.category === 'success' ? '#ecfdf5' : '#e0f2fe',
                        color: n.category === 'danger' ? '#ef4444' : n.category === 'success' ? '#10b981' : '#0284c7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', fontWeight: 800, flexShrink: 0
                      }}>
                        {n.type === 'client_onboarded' ? 'C' : n.type === 'commission' ? '₹' : 'N'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.825rem', color: '#0f172a', fontWeight: 700 }}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span style={{ fontSize: '0.625rem', background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>New</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>{n.message}</span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>
                          {new Date(n.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Agent Profile Pill */}
        <div className="kfpl-header-agent-pill" ref={dropdownRef} onClick={() => setShowDropdown(!showDropdown)} style={{ position: 'relative' }}>
          <div className="kfpl-header-agent-pill-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {agentPic ? (
              <img src={agentPic} alt={agentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              agentName.charAt(0)
            )}
          </div>
          <span className="kfpl-header-agent-pill-name">{agentName}</span>
          <svg className="kfpl-header-agent-pill-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>

          {showDropdown && (
            <div className="kfpl-dropdown">
              <button className="kfpl-dropdown-item" onClick={() => { navigate('/profile'); setShowDropdown(false); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <button className="kfpl-dropdown-item" onClick={() => { navigate('/commission'); setShowDropdown(false); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Commission
              </button>
              <div className="kfpl-dropdown-divider" />
              <button className="kfpl-dropdown-item" onClick={handleLogout} style={{ color: 'var(--color-danger)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============ END: Header.jsx ============ */
