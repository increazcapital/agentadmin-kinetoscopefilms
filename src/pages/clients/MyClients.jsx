/* ============================================================
   Page: MyClients.jsx
   Description: Client list table with search, filter, sort
   Matches Super Admin's InvestorList.jsx exactly in layout and structure
   ============================================================ */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';

const formatClientID = (rawId) => {
  if (!rawId || rawId === '—') return '—';
  const str = String(rawId).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return 'KFPL-CL-1001';
  }
  if (/^KFPL-CL-\d+$/i.test(str)) {
    return str.toUpperCase();
  }
  const digitsMatch = str.match(/\d+/);
  if (digitsMatch) {
    let val = parseInt(digitsMatch[0], 10);
    if (val < 1000) val = 1000 + val;
    return `KFPL-CL-${val}`;
  }
  return 'KFPL-CL-1001';
};

export default function MyClients() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_clients_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        setClients(JSON.parse(cacheData));
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse clients cache:', e);
    }

    const fetchClients = async () => {
      try {
        const response = await apiRequest('/api/agent/clients');
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
        const list = extractClients(response);
        setClients(list);
        try {
          const cacheableList = list.map(c => {
            const copy = { ...c };
            if (copy.profilePic && copy.profilePic.length > 2000) delete copy.profilePic;
            return copy;
          });
          const cacheKey = getAgentCacheKey('kfpl_agent_clients_cache');
          localStorage.setItem(cacheKey, JSON.stringify(cacheableList));
        } catch (_) {}
      } catch (err) {
        console.error('Failed to load clients:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Filter clients based on statusFilter and tierFilter
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const status = c.status || 'Active';
      const investment = c.totalInvestment || c.investmentAmount || 0;
      if (statusFilter !== 'all') {
        if (status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      if (tierFilter !== 'all') {
        let tier = 'silver';
        if (investment >= 5000000) tier = 'diamond';
        else if (investment >= 3000000) tier = 'platinum';
        else if (investment >= 1500000) tier = 'gold';
        
        if (tier !== tierFilter) return false;
      }
      return true;
    });
  }, [clients, statusFilter, tierFilter]);

  const columns = [
    { 
      header: 'Client ID', 
      accessor: 'clientId',
      render: (row) => <span>{formatClientID(row.clientId || row.id || row._id)}</span>
    },
    { 
      header: 'Join Date', 
      accessor: 'dateOfJoining',
      render: (row) => {
        const joinDate = row.dateOfJoining || row.joinDate || row.createdAt;
        if (!joinDate) return <span>—</span>;
        const date = new Date(joinDate);
        const day = String(date.getDate()).padStart(2, '0');
        const mon = String(date.getMonth() + 1).padStart(2, '0');
        return <span>{`${day}/${mon}/${date.getFullYear()}`}</span>;
      }
    },
    {
      header: 'Contract End',
      render: (row) => {
        const joinDate = row.dateOfJoining || row.joinDate || row.createdAt;
        if (!joinDate) return <span>—</span>;
        const d = new Date(joinDate);
        const months = parseInt(row.contractPeriod) || 24;
        d.setMonth(d.getMonth() + months);
        const day = String(d.getDate()).padStart(2, '0');
        const mon = String(d.getMonth() + 1).padStart(2, '0');
        return <span>{`${day}/${mon}/${d.getFullYear()}`}</span>;
      }
    },
    {
      header: 'Client Name',
      accessor: 'name',
      render: (row) => {
        const pic = row.profilePic || row.user?.profilePic || row.profile?.profilePic;
        const displayName = row.name || row.fullName || 'N/A';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--color-navy-light, #11442F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-gold, #10B981)', fontWeight: 800, fontSize: 14, flexShrink: 0, overflow: 'hidden'
            }}>
              {pic ? (
                <img src={pic} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span style={{ fontWeight: 600 }}>{displayName}</span>
          </div>
        );
      }
    },
    { header: 'Email Address', accessor: 'email' },
    {
      header: 'Total Investment',
      accessor: 'totalInvestment',
      render: (row) => <span className="font-semibold">{formatCurrency(row.totalInvestment || row.investmentAmount || 0)}</span>
    },
    {
      header: 'Monthly ROI % Allocated',
      accessor: 'roiPercent',
      render: (row) => `${row.roiPercent || row.monthlyRoi || row.roiPercentage || row.profile?.monthlyRoi || row.profile?.roiPercentage || row.roi || 0}%`
    },
    {
      header: 'Perks',
      accessor: 'totalInvestment',
      render: (row) => {
        const totalInvestment = row.totalInvestment || row.investmentAmount || 0;
        let tier = 'silver';
        if (totalInvestment >= 5000000) tier = 'diamond';
        else if (totalInvestment >= 3000000) tier = 'platinum';
        else if (totalInvestment >= 1500000) tier = 'gold';
        return <Badge status={tier}>{tier.toUpperCase()}</Badge>;
      }
    },
    {
      header: 'Commission Earned',
      accessor: 'commissionPaid',
      render: (row) => <span className="font-semibold" style={{ color: 'var(--color-success)' }}>{formatCurrency((row.totalInvestment || row.investmentAmount || 0) * 0.02)}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge status={(row.status || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive'}>{row.status || 'Active'}</Badge>
    }
  ];

  if (loading) {
    return (
      <div className="kfpl-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading clients...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="kfpl-page" id="my-clients-page">
      
      {/* ── Page Header matching Super Admin style ── */}
      <div className="kfpl-page-header kfpl-card-header-responsive">
        <div className="kfpl-page-header-left">
          <h2 className="kfpl-page-title">My Clients</h2>
          <p className="kfpl-page-subtitle">Overview of your registered clients, active contracts, and commission slab stats.</p>
        </div>
        <div className="kfpl-page-header-actions">
          {/* Status filter dropdown */}
          <select
            className="kfpl-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '130px', padding: '8px 12px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginRight: '8px' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Tier filter dropdown */}
          <select
            className="kfpl-select"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{ width: '140px', padding: '8px 12px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginRight: '8px' }}
          >
            <option value="all">All Tiers</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="diamond">Diamond</option>
          </select>

          <button className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredClients}
        onRowClick={(row) => {
          const pathId = row.id || row._id || row.clientId;
          console.log('MyClients: Row click received. Navigating to:', `/clients/${pathId}`);
          navigate(`/clients/${pathId}`);
        }}
        searchPlaceholder="Search clients by name, email, ID..."
      />
    </div>
  );
}
