/* ============================================================
   Page: RewardsAndRedemption.jsx
   Description: Premium rewards grid (locked/unlocked), claim form, history, media preview lightbox
   PRD Section 7: RW-01 through RW-06
   ============================================================ */

import { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';

export default function RewardsAndRedemption() {
  const toast = useToast();
  const [rewards, setRewards] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(null);
  const [activeView, setActiveView] = useState('grid');
  const [lightboxMedia, setLightboxMedia] = useState(null);

  // Claim form fields
  const [claimAddress, setClaimAddress] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const fetchRewards = async () => {
    try {
      const [rewardsRes, clientsRes, claimsRes] = await Promise.all([
        apiRequest('/api/agent/rewards').catch(() => null),
        apiRequest('/api/agent/clients').catch(() => null),
        apiRequest('/api/agent/service-requests').catch(() => null)
      ]);

      let list = [];
      if (rewardsRes && rewardsRes.success && rewardsRes.data) {
        if (Array.isArray(rewardsRes.data)) {
          list = rewardsRes.data;
        } else if (rewardsRes.data.rewards) {
          list = rewardsRes.data.rewards;
        } else if (rewardsRes.data.data) {
          list = Array.isArray(rewardsRes.data.data) ? rewardsRes.data.data : (rewardsRes.data.data.rewards || []);
        }
      }

      let clientsList = [];
      if (clientsRes) {
        if (Array.isArray(clientsRes)) {
          clientsList = clientsRes;
        } else if (clientsRes.data) {
          clientsList = Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data.clients || []);
        } else if (clientsRes.clients) {
          clientsList = clientsRes.clients;
        }
      }

      let hist = [];
      if (claimsRes) {
        const rawClaims = claimsRes.data?.serviceRequests || claimsRes.data?.requests || claimsRes.data || claimsRes.requests || [];
        if (Array.isArray(rawClaims)) {
          hist = rawClaims
            .filter(c => c.category === 'Reward Issue' || (c.subject && c.subject.startsWith('[REWARD_CLAIM]')))
            .map(c => ({
              id: c._id || c.id,
              rewardId: c.rewardId || '',
              rewardTitle: c.subject ? c.subject.replace('[REWARD_CLAIM] ', '') : 'Reward Claim',
              claimedDate: c.createdAt || c.date,
              status: c.status === 'Resolved' ? 'Fulfilled' : c.status === 'Closed' ? 'Closed' : 'Pending',
              note: c.adminRemarks || c.remarks || c.description || '—'
            }));
        }
      }

      const clientCount = clientsList.length;
      const totalVolume = clientsList.reduce((sum, c) => sum + (c.totalInvestment || c.investmentAmount || 0), 0);

      const mapped = list.map(r => {
        const isClientsMetric = r.targetMetricType === 'Clients Count';
        const currentValue = isClientsMetric ? clientCount : totalVolume;
        const targetValue = parseFloat(r.targetThresholdValue) || 0;
        
        // Determine status: check if already claimed (Fulfilled / Pending in Service Requests)
        let status = 'locked';
        const associatedClaim = hist.find(h => h.rewardTitle === r.targetMilestoneDescription || h.rewardId === r._id || h.rewardId === r.id);
        
        if (associatedClaim) {
          status = associatedClaim.status === 'Fulfilled' ? 'claimed' : 'claimed'; // Mark as claimed/pending
        } else if (currentValue >= targetValue) {
          status = 'unlocked';
        }

        return {
          ...r,
          id: r._id || r.id,
          title: r.targetMilestoneDescription || '',
          description: r.rewardDescription || '',
          targetValue: targetValue,
          targetLabel: isClientsMetric ? `${r.targetThresholdValue} Clients` : `₹${parseFloat(r.targetThresholdValue).toLocaleString('en-IN')}`,
          imageUrl: r.rewardImage || '',
          videoUrl: r.rewardVideo || '',
          status: status,
          currentValue: currentValue,
          claimStatusLabel: associatedClaim ? associatedClaim.status : null
        };
      });

      let finalRewards = [];
      let finalHistory = [];

      if (mapped.length === 0) {
        setRewards([]);
        setHistory([]);
      } else {
        finalRewards = mapped;
        finalHistory = hist;
        setRewards(finalRewards);
        setHistory(finalHistory);
      }

      // Save to SWR cache
      const cacheKey = getAgentCacheKey('kfpl_agent_rewards_cache');
      localStorage.setItem(cacheKey, JSON.stringify({
        rewards: finalRewards,
        history: finalHistory
      }));

    } catch (err) {
      console.error('Failed to load rewards:', err);
      setRewards([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_rewards_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed.rewards) setRewards(parsed.rewards);
        if (parsed.history) setHistory(parsed.history);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse rewards cache:', e);
    }
    fetchRewards();
  }, []);

  const rewardSummary = {
    unlocked: rewards.filter(r => r.status === 'unlocked').length,
    claimed: rewards.filter(r => r.status === 'claimed').length,
    locked: rewards.filter(r => r.status === 'locked').length,
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimAddress.trim() || !claimPhone.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmittingClaim(true);
      const formData = new FormData();
      formData.append('category', 'Reward Issue');
      formData.append('subject', `[REWARD_CLAIM] ${showClaimForm.title}`);
      formData.append('description', `Reward Claim Details:\nReward: ${showClaimForm.description}\nShipping Address: ${claimAddress}\nContact Number: ${claimPhone}\nNotes: ${claimNotes || 'None'}`);

      await apiRequest('/api/agent/service-requests', {
        method: 'POST',
        body: formData
      });

      toast('Reward claim request submitted successfully!', 'success');
      setShowClaimForm(null);
      setClaimAddress('');
      setClaimPhone('');
      setClaimNotes('');
      fetchRewards();
    } catch (err) {
      console.error('Failed to submit claim:', err);
      toast(err.message || 'Failed to submit claim request', 'danger');
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div className="kfpl-page" id="rewards-page" style={{ paddingTop: '10px' }}>
      <style>{`
        /* Premium dashboard header styling */
        .rewards-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 30px;
          background: linear-gradient(135deg, #0A2E26 0%, #031F1A 100%);
          padding: 30px;
          border-radius: 20px;
          color: #ffffff !important;
          border: 1px solid rgba(245, 168, 0, 0.15);
          box-shadow: 0 12px 36px rgba(10, 46, 38, 0.15);
        }

        @media (max-width: 991px) {
          .rewards-dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        .rewards-dashboard-intro {
          flex: 1;
        }

        .rewards-badge-premium {
          display: inline-block;
          background: rgba(212, 175, 55, 0.15);
          color: #FBBF24 !important;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
          border: 1px solid rgba(212, 175, 55, 0.3);
        }

        .rewards-dashboard-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
          color: #ffffff !important;
        }

        .rewards-dashboard-desc {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.85) !important;
          margin: 0;
          max-width: 500px;
          line-height: 1.5;
        }

        .rewards-stats-container {
          display: flex;
          gap: 16px;
        }

        @media (max-width: 576px) {
          .rewards-stats-container {
            width: 100%;
            flex-direction: column;
          }
        }

        .reward-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 140px;
          backdrop-filter: blur(10px);
        }

        .reward-stat-card.unlocked .stat-card-icon {
          background: rgba(245, 158, 11, 0.15);
          color: #F59E0B;
        }

        .reward-stat-card.claimed .stat-card-icon {
          background: rgba(245, 168, 0, 0.15);
          color: #F5A800;
        }

        .reward-stat-card.locked .stat-card-icon {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
        }

        .stat-card-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-card-icon svg {
          width: 20px;
          height: 20px;
        }

        .stat-card-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
          color: #ffffff !important;
        }

        .stat-card-content p {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6) !important;
          margin: 0;
          font-weight: 600;
        }

        /* Premium Segmented Tabs */
        .rewards-tab-wrapper {
          margin-bottom: 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .rewards-tabs-custom {
          display: flex;
          gap: 24px;
        }

        .rewards-tab-btn {
          background: none;
          border: none;
          padding: 12px 4px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-muted);
          cursor: pointer;
          position: relative;
          transition: color 0.2s ease;
        }

        .rewards-tab-btn:hover {
          color: var(--color-navy);
        }

        .rewards-tab-btn.active {
          color: var(--color-gold-dark, #B58D3D);
          font-weight: 700;
        }

        .rewards-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #F5A800, #FFC83D);
          border-radius: 3px;
        }

        /* Premium Card Layout */
        .rewards-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 28px;
          margin-top: 10px;
        }

        .reward-card-premium {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }

        .reward-card-premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
        }

        .reward-card-media-wrapper {
          height: 170px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .reward-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .reward-card-premium:hover .reward-card-img {
          transform: scale(1.06);
        }

        .reward-card-img-placeholder {
          width: 100%;
          height: 100%;
          position: relative;
          background: linear-gradient(135deg, #0A2E26 0%, #04241E 100%);
        }

        .placeholder-pattern {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.08;
          background-image: radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0);
          background-size: 16px 16px;
        }

        .reward-video-play-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(10, 25, 47, 0.85);
          border: 2px solid #F59E0B;
          color: #F59E0B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 2;
        }

        .reward-video-play-btn svg {
          width: 18px;
          height: 18px;
          margin-left: 2px;
        }

        .reward-video-play-btn:hover {
          background: #FBBF24;
          color: #0A192F;
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
        }

        .reward-badge-overlay {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 2;
        }

        .metric-type-chip {
          padding: 4px 10px;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }

        .metric-type-chip.clients {
          background: rgba(212, 175, 55, 0.95);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .metric-type-chip.volume {
          background: rgba(245, 168, 0, 0.95);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .reward-card-status-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          padding: 5px 12px;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 2;
        }

        .status-claimed {
          background: rgba(245, 168, 0, 0.95);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .status-locked {
          background: rgba(108, 117, 125, 0.9);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .status-unlocked {
          background: linear-gradient(90deg, #FBBF24, #F59E0B);
          color: #fff;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .pulse-glowing {
          animation: pulse-glow 2s infinite alternate;
        }

        @keyframes pulse-glow {
          0% {
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
            transform: scale(1);
          }
          100% {
            box-shadow: 0 2px 18px rgba(245, 158, 11, 0.8);
            transform: scale(1.03);
          }
        }

        .reward-card-body {
          padding: 24px;
          flex: 1;
          position: relative;
        }

        .reward-card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-navy);
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .reward-card-desc {
          font-size: 0.88rem;
          color: var(--color-text-muted);
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .reward-card-progress-section {
          background: var(--color-surface);
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
        }

        .progress-text-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .current-progress-label {
          color: var(--color-navy);
        }

        .percentage-complete-label {
          color: var(--color-gold-dark, #B58D3D);
        }

        .reward-card-progress-track {
          height: 6px;
          background: #E2E8F0;
          border-radius: 4px;
          overflow: hidden;
        }

        .reward-card-progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #F5A800 0%, #FFC83D 100%);
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .reward-card-footer {
          padding: 16px 24px 24px 24px;
          border-top: 1px dashed var(--color-border);
        }

        .reward-action-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-claim-active {
          background: linear-gradient(180deg, #123A78 0%, #F5A800 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(245, 168, 0, 0.25);
        }

        .btn-claim-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(245, 168, 0, 0.4);
        }

        .btn-claimed-disabled {
          background: #E2E8F0;
          color: var(--color-text-muted);
          cursor: not-allowed;
        }

        .reward-locked-status-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-muted);
        }

        .reward-locked-status-label svg {
          width: 14px;
          height: 14px;
        }

        /* Lightbox overlay Styles */
        .media-lightbox-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(3, 31, 26, 0.9);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .media-lightbox-content {
          background: #ffffff;
          padding: 24px;
          border-radius: 20px;
          max-width: 700px;
          width: 95%;
          position: relative;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lightbox-close-btn {
          position: absolute;
          top: -15px;
          right: -15px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--color-border);
          font-size: 1.25rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          transition: transform 0.2s;
          color: var(--color-navy);
        }

        .lightbox-close-btn:hover {
          transform: scale(1.1);
          color: #ef4444;
        }

        .lightbox-title {
          margin: 0 0 16px 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--color-navy);
        }

        .lightbox-body {
          border-radius: 12px;
          overflow: hidden;
          background: #000;
          max-height: 450px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .lightbox-media-element {
          max-width: 100%;
          max-height: 450px;
          object-fit: contain;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Top Banner & Stats Overview */}
      <div className="rewards-dashboard-header">
        <div className="rewards-dashboard-intro">
          <span className="rewards-badge-premium">Agent Perks</span>
          <h2 className="rewards-dashboard-title">Performance Pipeline</h2>
          <p className="rewards-dashboard-desc">
            Track your milestones, view reward media previews, and claim exclusive gifts as you scale your client portfolio.
          </p>
        </div>
        <div className="rewards-stats-container">
          <div className="reward-stat-card unlocked">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <div className="stat-card-content">
              <h3>{rewardSummary.unlocked}</h3>
              <p>Unlocked</p>
            </div>
          </div>
          <div className="reward-stat-card claimed">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="stat-card-content">
              <h3>{rewardSummary.claimed}</h3>
              <p>Claimed</p>
            </div>
          </div>
          <div className="reward-stat-card locked">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="stat-card-content">
              <h3>{rewardSummary.locked}</h3>
              <p>Locked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rewards-tab-wrapper">
        <div className="rewards-tabs-custom">
          <button className={`rewards-tab-btn ${activeView === 'grid' ? 'active' : ''}`} onClick={() => setActiveView('grid')}>Rewards Grid</button>
          <button className={`rewards-tab-btn ${activeView === 'history' ? 'active' : ''}`} onClick={() => setActiveView('history')}>Redemption History</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)', fontSize: '1.05rem', fontWeight: 500 }}>
          Loading rewards dashboard...
        </div>
      ) : activeView === 'grid' ? (
        <div className="rewards-grid-premium">
          {rewards.map(reward => {
            const isLocked = reward.status === 'locked';
            const isClaimed = reward.status === 'claimed';
            const progress = Math.min((reward.currentValue / reward.targetValue) * 100, 100);

            return (
              <div
                key={reward.id || reward._id}
                className={`reward-card-premium ${isLocked ? 'locked' : isClaimed ? 'claimed' : 'unlocked'}`}
              >
                {/* Media Section */}
                <div className="reward-card-media-wrapper">
                  {reward.imageUrl ? (
                    <img 
                      src={reward.imageUrl} 
                      alt={reward.title} 
                      className="reward-card-img" 
                    />
                  ) : (
                    <div className="reward-card-img-placeholder">
                      <div className="placeholder-pattern"></div>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="reward-badge-overlay">
                    <span className={`metric-type-chip ${reward.targetMetricType === 'Clients Count' ? 'clients' : 'volume'}`}>
                      {reward.targetMetricType || 'Milestone'}
                    </span>
                  </div>

                  {/* Status Ribbon */}
                  {isClaimed ? (
                    <div className="reward-card-status-badge status-claimed">
                      {reward.claimStatusLabel === 'Pending' ? 'Claim Pending' : 'Claimed'}
                    </div>
                  ) : isLocked ? (
                    <div className="reward-card-status-badge status-locked">Locked</div>
                  ) : (
                    <div 
                      className="reward-card-status-badge status-unlocked pulse-glowing"
                      onClick={() => setShowClaimForm(reward)}
                    >
                      Claim Now
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="reward-card-body">
                  <h4 className="reward-card-title">{reward.title}</h4>
                  <p className="reward-card-desc">{reward.description}</p>

                  {/* Media View Options */}
                  {(reward.imageUrl || reward.videoUrl) && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {reward.imageUrl && (
                        <button
                          type="button"
                          className="kfpl-btn kfpl-btn--secondary kfpl-btn--sm"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            color: 'var(--color-gold-dark, #B58D3D)',
                            fontWeight: 600
                          }}
                          onClick={() => setLightboxMedia({ type: 'image', url: reward.imageUrl, title: reward.title })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, marginRight: 2 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          Show Image
                        </button>
                      )}
                      {reward.videoUrl && (
                        <button
                          type="button"
                          className="kfpl-btn kfpl-btn--secondary kfpl-btn--sm"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            background: 'rgba(245, 168, 0, 0.12)',
                            border: '1px solid rgba(245, 168, 0, 0.25)',
                            color: '#F5A800',
                            fontWeight: 600
                          }}
                          onClick={() => setLightboxMedia({ type: 'video', url: reward.videoUrl, title: reward.title })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, marginRight: 2 }}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                          Show Video
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Progress & Target Section */}
                  <div className="reward-card-progress-section">
                    <div className="progress-text-row">
                      <span className="current-progress-label">
                        {reward.targetMetricType === 'Clients Count' 
                          ? `${reward.currentValue} / ${reward.targetValue} Clients`
                          : `₹${(reward.currentValue / 100000).toFixed(1)} L / ₹${(reward.targetValue / 100000).toFixed(0)} L`
                        }
                      </span>
                      <span className="percentage-complete-label">{Math.round(progress)}%</span>
                    </div>
                    <div className="reward-card-progress-track">
                      <div className="reward-card-progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                {/* Footer Claim Actions */}
                <div className="reward-card-footer">
                  {isClaimed ? (
                    <button className="reward-action-btn btn-claimed-disabled" disabled>
                      {reward.claimStatusLabel === 'Pending' ? '⏳ Fulfilling Claim Request...' : '✓ Claim Fulfilled'}
                    </button>
                  ) : isLocked ? (
                    <div className="reward-locked-status-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Complete milestone to unlock
                    </div>
                  ) : (
                    <button 
                      className="reward-action-btn btn-claim-active"
                      onClick={() => setShowClaimForm(reward)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, marginRight: 4 }}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                      Claim Your Reward
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="kfpl-table-wrapper" style={{ marginTop: '10px' }}>
          <table className="kfpl-table">
            <thead>
              <tr><th>Reward Details</th><th>Claimed Date</th><th>Status</th><th>Verification Note</th></tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No previous claims found.</td>
                </tr>
              ) : (
                history.map(r => (
                  <tr key={r.id || r._id}>
                    <td style={{ fontWeight: 600 }}>{r.rewardTitle || r.title}</td>
                    <td>{r.claimedDate ? new Date(r.claimedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>
                      <span className={`kfpl-badge ${
                        r.status === 'Fulfilled' 
                          ? 'kfpl-badge--success' 
                          : r.status === 'Closed' 
                            ? 'kfpl-badge--muted' 
                            : 'kfpl-badge--warning'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{r.note || r.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Claim Form Modal */}
      {showClaimForm && (
        <div className="kfpl-modal-overlay" onClick={() => setShowClaimForm(null)}>
          <div className="kfpl-modal" onClick={e => e.stopPropagation()} style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div className="kfpl-modal-header" style={{ padding: '20px 24px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)' }}>Claim Reward: {showClaimForm.title}</h3>
              <button className="kfpl-modal-close" onClick={() => setShowClaimForm(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleClaimSubmit}>
              <div className="kfpl-modal-body" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.15)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ color: '#D4AF37', display: 'flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-navy)' }}>You are claiming:</h5>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{showClaimForm.description}</p>
                  </div>
                </div>
                
                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600 }}>Delivery Address <span className="required">*</span></label>
                  <textarea 
                    className="kfpl-form-textarea" 
                    placeholder="Enter complete shipping address with pincode..." 
                    value={claimAddress}
                    onChange={e => setClaimAddress(e.target.value)}
                    required 
                    style={{ minHeight: '80px', borderRadius: '10px' }}
                  />
                </div>
                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600 }}>Contact Number <span className="required">*</span></label>
                  <input 
                    className="kfpl-form-input" 
                    type="tel" 
                    placeholder="+91 XXXXX XXXXX" 
                    value={claimPhone}
                    onChange={e => setClaimPhone(e.target.value)}
                    required 
                    style={{ borderRadius: '10px' }}
                  />
                </div>
                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600 }}>Additional Note</label>
                  <textarea 
                    className="kfpl-form-textarea" 
                    placeholder="Size options, specific time preferences or delivery instructions..." 
                    value={claimNotes}
                    onChange={e => setClaimNotes(e.target.value)}
                    style={{ minHeight: '60px', borderRadius: '10px' }} 
                  />
                </div>
              </div>
              <div className="kfpl-modal-footer" style={{ padding: '16px 24px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="kfpl-btn kfpl-btn-secondary" onClick={() => setShowClaimForm(null)} style={{ borderRadius: '8px' }}>Cancel</button>
                <button type="submit" className="kfpl-btn kfpl-btn-primary" style={{ borderRadius: '8px', background: 'linear-gradient(180deg, #123A78 0%, #F5A800 100%)', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={submittingClaim}>{submittingClaim ? 'Submitting Request...' : 'Submit Claim Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Media Modal */}
      {lightboxMedia && (
        <div className="media-lightbox-overlay" onClick={() => setLightboxMedia(null)}>
          <div className="media-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setLightboxMedia(null)}>×</button>
            <h3 className="lightbox-title">{lightboxMedia.title}</h3>
            <div className="lightbox-body">
              {lightboxMedia.type === 'video' ? (
                <video src={lightboxMedia.url} controls autoPlay className="lightbox-media-element" />
              ) : (
                <img src={lightboxMedia.url} alt={lightboxMedia.title} className="lightbox-media-element" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
