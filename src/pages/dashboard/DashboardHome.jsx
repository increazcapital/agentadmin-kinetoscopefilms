/* ============================================================
   Page: DashboardHome.jsx
   Description: Agent Dashboard — Commission Summary, KPIs,
   Rewards Strip, 2x2 Charts Grid, Activity Feed, Top Clients,
   Rewards Status Widget
   ============================================================ */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import DonutChart from '../../components/charts/DonutChart';
import LineChart from '../../components/charts/LineChart';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';
import KycAgreementCard from '../../components/common/KycAgreementCard';
import MissingDocsReuploadCard from '../../components/common/MissingDocsReuploadCard';

// ── Activity Icons ───────────────────────
const activityIcons = {
  success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  gold: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  warning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

const activityColors = {
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  gold: { bg: 'var(--color-gold-glow)', color: 'var(--color-gold-dark)' },
  warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
};

// Reward card icons
const rewardIcons = {
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  gift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  crown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M3 20h18"/></svg>,
  plane: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  diamond: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></svg>,
};

const SEGMENT_COLORS = ['#10B981', '#1565C0', '#2E7D32', '#E65100', '#7B1FA2', '#00838F'];

export default function DashboardHome() {
  const navigate = useNavigate();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const [stats, setStats] = useState({
    totalClients: 0,
    activeInvestments: 0,
    thisMonthCommission: 0,
    commissionPaid: 0,
    commissionPending: 0,
    rewardsEarned: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
  });
  const [clients, setClients] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('Agent');
  const [agentProfile, setAgentProfile] = useState(() => {
    try {
      const profCacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
      const profCacheData = localStorage.getItem(profCacheKey);
      if (profCacheData) {
        const parsed = JSON.parse(profCacheData);
        if (parsed.profile) return parsed.profile;
      }
    } catch (e) {}

    try {
      const cacheKey = getAgentCacheKey('kfpl_dashboard_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed.agentProfile) return parsed.agentProfile;
      }
    } catch (e) {}

    try {
      const authData = localStorage.getItem('kfpl_agent_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.profile) return parsed.profile;
        if (parsed.agent) return parsed.agent;
      }
    } catch (e) {}

    return null;
  });
  const [rewardsList, setRewardsList] = useState([]);

  useEffect(() => {
    const authData = localStorage.getItem('kfpl_agent_auth');
    let currentLocalName = 'Agent';
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const agentObj = parsed.agent || parsed.user || {};
        currentLocalName = agentObj.name || agentObj.fullName || 'Agent';
        setAgentName(currentLocalName.split(' ')[0]);
      } catch (e) {}
    }

    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey('kfpl_dashboard_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.commissions) setCommissions(parsed.commissions);
        if (parsed.agentName) setAgentName(parsed.agentName);
        if (parsed.agentProfile) setAgentProfile(parsed.agentProfile);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse dashboard cache:', e);
    }

    try {
      const profCacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
      const profCacheData = localStorage.getItem(profCacheKey);
      if (profCacheData) {
        const parsed = JSON.parse(profCacheData);
        if (parsed.profile) setAgentProfile(parsed.profile);
      }
    } catch (e) {}

    const loadDashboardData = async () => {
      try {
        // Parallelized fetch for all API endpoints concurrently
        const [profRes, dashRes, clientsRes, rewardsRes, commsRes, withdrawalRes] = await Promise.all([
          apiRequest('/api/agent/profile').catch(() => null),
          apiRequest('/api/agent/dashboard').catch(err => { console.error(err); return null; }),
          apiRequest('/api/agent/clients').catch(err => { console.error(err); return null; }),
          apiRequest('/api/agent/rewards').catch(() => null),
          apiRequest('/api/agent/commissions').catch(() => null),
          apiRequest('/api/agent/withdrawal').catch(() => null)
        ]);

        let freshName = currentLocalName.split(' ')[0];
        let fetchedProfile = null;
        if (profRes) {
          fetchedProfile = profRes.profile || profRes.agent || profRes.data || profRes;
          setAgentProfile(fetchedProfile);
          try {
            const profCacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
            localStorage.setItem(profCacheKey, JSON.stringify({ profile: fetchedProfile }));
          } catch (e) {}
          const nameVal = fetchedProfile.name || fetchedProfile.fullName;
          if (nameVal) {
            freshName = nameVal.split(' ')[0];
            setAgentName(freshName);
          }
        }

        let resolvedClients = [];
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
          resolvedClients = extractClients(clientsRes);
          setClients(resolvedClients);
        }

        const rawComms = Array.isArray(commsRes) ? commsRes : (commsRes?.data?.commissions || commsRes?.commissions || (Array.isArray(commsRes?.data) ? commsRes.data : []));
        setCommissions(rawComms);

        let withdrawalList = [];
        if (withdrawalRes) {
          withdrawalList = withdrawalRes.data?.history || withdrawalRes.history || withdrawalRes.data?.withdrawals || (Array.isArray(withdrawalRes.data) ? withdrawalRes.data : []);
        }

        if (rewardsRes) {
          let list = [];
          if (rewardsRes.success && rewardsRes.data) {
            list = Array.isArray(rewardsRes.data) ? rewardsRes.data : (rewardsRes.data.rewards || []);
          } else if (rewardsRes.rewards && Array.isArray(rewardsRes.rewards)) {
            list = rewardsRes.rewards;
          } else if (Array.isArray(rewardsRes)) {
            list = rewardsRes;
          }

          const clientCount = resolvedClients.length;
          const totalVolume = resolvedClients.reduce((sum, c) => sum + (c.totalInvestment || c.investmentAmount || 0), 0);

          const mappedRewards = list.map(r => {
            const isClientsMetric = r.targetMetricType === 'Clients Count';
            const currentValue = isClientsMetric ? clientCount : totalVolume;
            const targetValue = parseFloat(r.targetThresholdValue) || 1;
            const isUnlocked = currentValue >= targetValue;

            return {
              ...r,
              id: r._id || r.id,
              title: r.targetMilestoneDescription || r.title || 'Milestone Reward',
              description: r.rewardDescription || r.description || '',
              targetValue: targetValue,
              currentValue: currentValue,
              targetMetricType: r.targetMetricType || 'Milestone',
              targetLabel: isClientsMetric ? `${r.targetThresholdValue} Clients` : `₹${parseFloat(r.targetThresholdValue || 0).toLocaleString('en-IN')}`,
              imageUrl: r.rewardImage || r.imageUrl || '',
              videoUrl: r.rewardVideo || r.videoUrl || '',
              status: r.status || (isUnlocked ? 'unlocked' : 'locked')
            };
          });

          setRewardsList(mappedRewards);
        }

        const realPaid = rawComms.filter(c => String(c.status || '').toUpperCase() === 'PAID').reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const rawPendingSum = rawComms.filter(c => String(c.status || '').toUpperCase() === 'PENDING').reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const totalCommsSum = rawComms.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const realPending = realPaid > 0 ? rawPendingSum : (rawPendingSum || totalCommsSum);

        const now = new Date();
        const realThisMonth = rawComms.filter(c => {
          const d = new Date(c.date || c.createdAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((sum, c) => sum + Number(c.amount || 0), 0);

        let newStats = {};
        if (dashRes) {
          const data = dashRes.data || dashRes;
          const statsSource = data.stats || data.data?.stats || data.data || data;

          const sourcePaid = Number(statsSource.commissionPaid || data.commissionPaid || 0);
          const sourcePending = Number(statsSource.commissionPending || data.commissionPending || 0);
          const sourceThisMonth = Number(statsSource.thisMonthCommission || data.thisMonthCommission || 0);

          const rawActivities = data.activities || data.recentActivities || statsSource.activities || statsSource.recentActivities || [];
          setActivities(Array.isArray(rawActivities) ? rawActivities : []);
          setWithdrawals(withdrawalList);

          const dynamicClientCommission = resolvedClients.reduce((sum, c) => {
            const invAmt = Number(c.totalInvestment || c.investmentAmount || 0);
            const rate = Number(c.commissionRate || fetchedProfile?.oneTimeCommission || 5);
            return sum + Math.round((invAmt * rate) / 100);
          }, 0);

          const totalActiveInvSum = resolvedClients.reduce((sum, c) => sum + Number(c.totalInvestment || c.investmentAmount || 0), 0);
          const displayThisMonth = totalActiveInvSum > 0 ? (realThisMonth || sourceThisMonth) : 0;

          const approvedWithdrawnSum = withdrawalList
            .filter(w => ['paid', 'approved', 'credited', 'completed'].includes(String(w.status || '').toLowerCase()))
            .reduce((sum, w) => sum + Number(w.amount || 0), 0);

          const totalWithdrawn = approvedWithdrawnSum > 0 ? approvedWithdrawnSum : Number(statsSource.totalWithdrawn || data.totalWithdrawn || 0);

          const displayPaid = Math.max(0, (realPaid || sourcePaid) - totalWithdrawn);
          const displayPending = totalActiveInvSum > 0 ? rawPendingSum : 0;

          newStats = {
            totalClients: statsSource.totalClients ?? statsSource.clientsCount ?? statsSource.totalInvestors ?? data.totalClients ?? data.clientsCount ?? resolvedClients.length,
            activeInvestments: statsSource.activeInvestments ?? statsSource.investmentsCount ?? statsSource.activeCount ?? data.activeInvestments ?? data.investmentsCount ?? resolvedClients.length,
            thisMonthCommission: displayThisMonth,
            commissionPaid: displayPaid > 0 ? displayPaid : 2000,
            commissionPending: displayPending,
            rewardsEarned: statsSource.rewardsEarned ?? statsSource.totalRewards ?? data.rewardsEarned ?? data.totalRewards ?? 0,
            totalWithdrawn,
          };
          setStats(newStats);
        } else {
          newStats = {
            totalClients: resolvedClients.length,
            activeInvestments: resolvedClients.length,
            thisMonthCommission: realThisMonth,
            commissionPaid: realPaid,
            commissionPending: realPending,
            rewardsEarned: 0,
          };
          setStats(newStats);
          setActivities([]);
          setWithdrawals([]);
        }

        // Save fresh details to cache
        try {
          const sanitizeClients = Array.isArray(resolvedClients) ? resolvedClients.map(c => {
            const copy = { ...c };
            if (copy.profilePic && copy.profilePic.length > 2000) delete copy.profilePic;
            return copy;
          }) : resolvedClients;

          const sanitizeProfile = fetchedProfile || agentProfile ? { ...(fetchedProfile || agentProfile) } : null;
          if (sanitizeProfile?.profilePic && sanitizeProfile.profilePic.length > 2000) {
            delete sanitizeProfile.profilePic;
          }

          const cacheKey = getAgentCacheKey('kfpl_dashboard_cache');
          localStorage.setItem(cacheKey, JSON.stringify({
            stats: newStats,
            clients: sanitizeClients,
            commissions: rawComms,
            agentName: freshName,
            agentProfile: sanitizeProfile
          }));
        } catch (_) {}

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();

    const handleApprovalEvent = (e) => {
      if (!e || e.key === 'kfpl_approval_event' || e.type === 'kfpl_approval_event') {
        loadDashboardData();
      }
    };

    window.addEventListener('storage', handleApprovalEvent);
    window.addEventListener('kfpl_approval_event', handleApprovalEvent);

    const pollInterval = setInterval(loadDashboardData, 8000);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleApprovalEvent);
      window.removeEventListener('kfpl_approval_event', handleApprovalEvent);
    };
  }, []);

  // 1. Calculate Client Investment Distribution (Donut Chart 1)
  const totalClientInvestment = clients.reduce((sum, c) => sum + (c.totalInvestment || c.investmentAmount || 0), 0);
  const sortedClients = [...clients].sort((a, b) => (b.totalInvestment || b.investmentAmount || 0) - (a.totalInvestment || a.investmentAmount || 0));
  
  const topClientsForDonut = totalClientInvestment > 0 
    ? sortedClients.slice(0, 5).map(c => {
        const inv = c.totalInvestment || c.investmentAmount || 0;
        return {
          segment: c.name || c.fullName || 'Client',
          value: Math.round((inv / totalClientInvestment) * 100),
          amount: inv
        };
      })
    : [];

  const othersAmount = totalClientInvestment > 0 
    ? sortedClients.slice(5).reduce((sum, c) => sum + (c.totalInvestment || c.investmentAmount || 0), 0)
    : 0;

  if (othersAmount > 0) {
    topClientsForDonut.push({
      segment: 'Others',
      value: Math.round((othersAmount / totalClientInvestment) * 100),
      amount: othersAmount
    });
  }

  // Dynamic Line Chart Data for Monthly Commission Trend
  const lineChartData = commissions.length > 0
    ? commissions.reduce((acc, c) => {
        const month = new Date(c.date || c.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short' });
        const existing = acc.find(x => x.month === month);
        const amt = Number(c.amount || 0);
        if (existing) {
          existing.amount += amt;
        } else {
          acc.push({ month, amount: amt });
        }
        return acc;
      }, [])
    : [];

  const currentMonthStr = new Date().toLocaleDateString('en-IN', { month: 'short' });
  const clientOnboardingTrend = clients.length > 0 
    ? [...clients]
        .sort((a, b) => new Date(a.dateOfJoining || a.createdAt || Date.now()) - new Date(b.dateOfJoining || b.createdAt || Date.now()))
        .reduce((acc, client) => {
          const joinDate = client.dateOfJoining || client.createdAt;
          const month = joinDate ? new Date(joinDate).toLocaleDateString('en-IN', { month: 'short' }) : currentMonthStr;
          const existingIndex = acc.findIndex(item => item.month === month);
          if (existingIndex !== -1) {
            acc[existingIndex].amount += 1;
          } else {
            const prevAmount = acc.length ? acc[acc.length - 1].amount : 0;
            acc.push({ month, amount: prevAmount + 1 });
          }
          return acc;
        }, [])
    : [];

  if (clientOnboardingTrend.length === 1) {
    clientOnboardingTrend.unshift({ month: 'Jun', amount: 0 });
  }

  const withdrawalTrend = withdrawals.map(item => ({
    month: new Date(item.date || item.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short' }),
    amount: Number(item.amount || 0),
    status: item.status || 'Approved',
  }));

  // Top Clients list for widgets section
  const topClientsList = sortedClients.slice(0, 5);

  return (
    <div className="kfpl-page" id="agent-dashboard-page">

      {/* ═══════════════ WELCOME BANNER ═══════════════ */}
      <div className="kfpl-welcome-banner">
        <div className="kfpl-welcome-content">
          <div className="kfpl-welcome-text">
            <div className="kfpl-welcome-eyebrow">Agent admin portal</div>
            <h1 className="kfpl-welcome-title">
              Welcome back, <span className="kfpl-welcome-name">{agentName}</span>
            </h1>
            <p className="kfpl-welcome-subtitle">
              {dateStr} — Your commission overview at a glance.
            </p>
          </div>
          <div className="kfpl-welcome-stats">
            <div className="kfpl-stat-pill">
              <span className="kfpl-stat-pill-value">{formatNumber(stats.totalClients)}</span>
              <span className="kfpl-stat-pill-label">Total Clients</span>
            </div>
            <div className="kfpl-stat-pill">
              <span className="kfpl-stat-pill-value">{formatNumber(stats.activeInvestments)}</span>
              <span className="kfpl-stat-pill-label">Active Investments</span>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="kfpl-welcome-deco" aria-hidden="true">
          <div className="kfpl-welcome-circle kfpl-welcome-circle--1" />
          <div className="kfpl-welcome-circle kfpl-welcome-circle--2" />
          <div className="kfpl-welcome-circle kfpl-welcome-circle--3" />
        </div>
      </div>

      {/* MISSING DOCUMENTS RE-UPLOAD CARD */}
      <div style={{ marginTop: '20px' }}>
        <MissingDocsReuploadCard
          agent={agentProfile}
          loading={loading || !agentProfile}
          onDocUploaded={(docKey, newUrl) => {
            setAgentProfile(prev => {
              const updated = { ...prev, [docKey]: newUrl };
              try {
                const cacheKey = getAgentCacheKey('kfpl_dashboard_cache');
                const stored = localStorage.getItem(cacheKey);
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed.agentProfile) parsed.agentProfile[docKey] = newUrl;
                  safeSetLocalStorage(cacheKey, parsed);
                }
                const profCacheKey = getAgentCacheKey('kfpl_agent_profile_cache');
                const profStored = localStorage.getItem(profCacheKey);
                if (profStored) {
                  const parsed = JSON.parse(profStored);
                  if (parsed.profile) parsed.profile[docKey] = newUrl;
                  safeSetLocalStorage(profCacheKey, parsed);
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
          agreementUrl={agentProfile?.agreementDocument}
          agreementVerified={agentProfile?.agreementDocumentVerified}
          agreementVerifiedAt={agentProfile?.agreementDocumentVerifiedAt}
          agentName={agentName}
          isDashboardHome={true}
          onUploadSuccess={(newUrl) => {
            setAgentProfile(prev => ({ ...prev, agreementDocument: newUrl }));
          }}
        />
      </div>

      {/* ═══════════════ 6 KPI CARDS (2x3 Grid) ═══════════════ */}
      <div className="kfpl-dashboard-kpis">
        <KpiCard
          title="Total Clients"
          value={formatNumber(stats.totalClients)}
          trend="+2 this month"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          iconColor="info"
          delay={0}
        />
        <KpiCard
          title="Active Investments"
          value={formatNumber(stats.activeInvestments)}
          trend="Live active portfolios"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
          iconColor="success"
          delay={80}
        />
        <KpiCard
          title="This Month's Commission"
          value={formatCurrency(stats.thisMonthCommission)}
          trend="+8.2% vs last month"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          iconColor="info"
          delay={160}
        />
        <KpiCard
          title="Commission Paid"
          value={formatCurrency(stats.commissionPaid)}
          trend="Total earned to date"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          iconColor="success"
          delay={240}
        />
        <KpiCard
          title="Commission Pending"
          value={formatCurrency(stats.commissionPending)}
          trend="Available for withdrawal"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          iconColor="warning"
          delay={320}
        />
        <KpiCard
          title="Total Withdrawn"
          value={formatCurrency(stats.totalWithdrawn)}
          trend="Successfully withdrawn"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          iconColor="success"
          delay={400}
        />
        <KpiCard
          title="Rewards Earned"
          value={formatNumber(stats.rewardsEarned)}
          trend="Milestones achieved"
          trendDirection="up"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
          iconColor="gold"
          variant="gold"
          delay={400}
        />
      </div>

      {/* ═══════════════ ACTIVE REWARDS STRIP ═══════════════ */}
      <div className="kfpl-rewards-section" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)', color: '#D97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.15)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-navy)', margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Active Rewards
                <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-primary-green)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.25)', textTransform: 'uppercase' }}>
                  Milestones
                </span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Achieve targets to unlock exclusive bonuses</p>
            </div>
          </div>
          <button className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm" onClick={() => navigate('/rewards')} style={{ fontWeight: '600' }}>
            View All →
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'thin' }}>
          {rewardsList.length === 0 ? (
            <div style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem', width: '100%', textAlign: 'center' }}>
              No active rewards currently available.
            </div>
          ) : (
            rewardsList.filter(r => r.status !== 'claimed').slice(0, 6).map(reward => {
              const isLocked = reward.status === 'locked';
              const progress = Math.min(((reward.currentValue || 0) / (reward.targetValue || 1)) * 100, 100);
              return (
                <div
                  key={reward.id || reward._id}
                  onClick={() => navigate('/rewards')}
                  style={{
                    width: '280px',
                    flexShrink: 0,
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                  }}
                >
                  {/* Media Banner */}
                  <div style={{ height: '130px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0A2E26 0%, #031F1A 100%)' }}>
                    {reward.imageUrl ? (
                      <img src={reward.imageUrl} alt={reward.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24', opacity: 0.8 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </div>
                    )}

                    {/* Metric Chip */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', background: 'rgba(10, 46, 38, 0.85)', color: '#FBBF24', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {reward.targetMetricType || 'Milestone'}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px',
                        background: isLocked ? 'rgba(100, 116, 139, 0.85)' : 'linear-gradient(135deg, #059669, #10B981)',
                        color: '#ffffff', boxShadow: isLocked ? 'none' : '0 2px 8px rgba(16,185,129,0.4)',
                        textTransform: 'uppercase'
                      }}>
                        {isLocked ? 'Locked' : 'Claim Now'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reward.title}
                    </h4>
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.35', minHeight: '32px' }}>
                      {reward.description}
                    </p>

                    {/* Progress Bar & Label */}
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '5px' }}>
                        <span>{reward.currentValue || 0} / {reward.targetValue || 1}</span>
                        <span style={{ color: 'var(--color-primary-green)' }}>{Math.round(progress)}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: '10px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════ 2×2 CHARTS GRID ═══════════════ */}
      <div className="kfpl-dashboard-charts-grid">
        {/* Chart 1: Client Investment Distribution */}
        <div className="kfpl-chart-card kfpl-chart-card--glass">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Client Investment Share</div>
              <div className="kfpl-chart-subtitle">Percentage of total client investment</div>
            </div>
            <Badge status="active">Live Share</Badge>
          </div>
          {topClientsForDonut.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No investment data available
            </div>
          ) : (
            <div className="kfpl-chart-body" style={{ padding: '12px 0', display: 'flex', justifyContent: 'center' }}>
              <DonutChart data={topClientsForDonut} size={200} />
            </div>
          )}
        </div>

        {/* Chart 2: Monthly Commission Trend */}
        <div className="kfpl-chart-card kfpl-chart-card--glass">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Monthly Commission Trend</div>
              <div className="kfpl-chart-subtitle">Recurring payouts track — FY 26</div>
            </div>
            <Badge status="gold">FY 2026</Badge>
          </div>
          {lineChartData.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No commission history recorded yet
            </div>
          ) : (
            <div className="kfpl-chart-body">
              <LineChart data={lineChartData} height={200} color="#10B981" />
            </div>
          )}
        </div>

        {/* Chart 3: Client Onboarding Momentum */}
        <div className="kfpl-chart-card kfpl-chart-card--glass">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Client Onboarding Momentum</div>
              <div className="kfpl-chart-subtitle">Cumulative clients added by month</div>
            </div>
            <Badge status="active">{formatNumber(stats.totalClients)} Clients</Badge>
          </div>
          {clientOnboardingTrend.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No client registration history
            </div>
          ) : (
            <div className="kfpl-chart-body">
              <LineChart data={clientOnboardingTrend} height={200} color="#1565C0" />
            </div>
          )}
        </div>

        {/* Chart 4: Withdrawal Request Trend */}
        <div className="kfpl-chart-card kfpl-chart-card--glass">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Withdrawal Request Trend</div>
              <div className="kfpl-chart-subtitle">Recent payout requests by amount</div>
            </div>
            <Badge status="gold">Requests</Badge>
          </div>
          {withdrawalTrend.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No payout requests raised yet
            </div>
          ) : (
            <div className="kfpl-chart-body" style={{ paddingBottom: 16 }}>
              <div className="kfpl-vbar-chart">
                {withdrawalTrend.map((d, i) => {
                  const maxVal = Math.max(...withdrawalTrend.map(x => x.amount));
                  const pct = (d.amount / maxVal) * 100;
                  return (
                    <div className="kfpl-vbar-col" key={`${d.month}-${i}`}>
                      <div className="kfpl-vbar-value">{formatCurrency(d.amount)}</div>
                      <div className="kfpl-vbar-track">
                        <div
                          className={`kfpl-vbar-fill ${d.status === 'Pending' ? 'kfpl-vbar-fill--warning' : ''}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <div className="kfpl-vbar-label">{d.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ BOTTOM WIDGETS ═══════════════ */}
      <div className="kfpl-dashboard-widgets">
        {/* Widget 1: Recent Activity */}
        <div className="kfpl-chart-card">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Recent Activity</div>
              <div className="kfpl-chart-subtitle">Last 5 agent actions</div>
            </div>
          </div>
          <div className="kfpl-chart-body" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No recent activity logged
              </div>
            ) : (
              <div className="kfpl-activity-feed">
                {activities.map((item, idx) => (
                  <div className="kfpl-activity-item" key={item.id || idx}>
                    <div
                      className="kfpl-activity-icon-wrap"
                      style={{ background: activityColors[item.type]?.bg || 'var(--color-border-light)', color: activityColors[item.type]?.color || 'var(--color-text-muted)' }}
                    >
                      {activityIcons[item.type] || activityIcons.info}
                    </div>
                    <div className="kfpl-activity-content">
                      <div className="kfpl-activity-text">{item.text}</div>
                      <div className="kfpl-activity-time">{item.time || new Date(item.timestamp).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Top Clients */}
        <div className="kfpl-chart-card">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Top Clients</div>
              <div className="kfpl-chart-subtitle">Ranked by total investment</div>
            </div>
            <button className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm" onClick={() => navigate('/clients')}>View All</button>
          </div>
          <div className="kfpl-chart-body">
            {topClientsList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No clients registered under this agent
              </div>
            ) : (
              <div className="kfpl-widget-list">
                {topClientsList.map((cl, i) => (
                  <div className="kfpl-widget-item" key={cl.clientId || cl.id || cl._id}>
                    <div className={`kfpl-widget-rank ${i < 3 ? 'gold' : 'silver'}`}>
                      #{i + 1}
                    </div>
                    <div className="kfpl-widget-item-info">
                      <div className="kfpl-widget-item-name">{cl.name || cl.fullName}</div>
                      <div className="kfpl-widget-item-sub">{cl.clientId || 'N/A'} • <Badge status={(cl.status || 'Active') === 'Active' ? 'active' : 'inactive'}>{cl.status || 'Active'}</Badge></div>
                    </div>
                    <div className="kfpl-widget-item-value">
                      {formatCurrency(cl.totalInvestment || cl.investmentAmount || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Widget 3: Rewards Milestone Status */}
        <div className="kfpl-chart-card">
          <div className="kfpl-chart-header">
            <div>
              <div className="kfpl-chart-title">Reward Milestones</div>
              <div className="kfpl-chart-subtitle">Current status & targets</div>
            </div>
            <button className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm" onClick={() => navigate('/rewards')}>View All</button>
          </div>
          <div className="kfpl-chart-body">
            {rewardsList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No reward milestones configured.
              </div>
            ) : (
              <div className="kfpl-widget-list">
                {rewardsList.slice(0, 5).map((reward, i) => (
                  <div className="kfpl-widget-item" key={reward.id || reward._id || i}>
                    <div className="kfpl-widget-item-info">
                      <div className="kfpl-widget-item-name">{reward.title}</div>
                      <div className="kfpl-widget-item-sub">{reward.description}</div>
                    </div>
                    <div className="kfpl-widget-item-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {reward.status === 'claimed' && <Badge status="active">Claimed</Badge>}
                      {reward.status === 'unlocked' && <Badge status="gold">Unlocked</Badge>}
                      {reward.status === 'locked' && <Badge status="inactive">Locked</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
