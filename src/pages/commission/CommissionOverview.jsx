/* ============================================================
   Page: CommissionOverview.jsx
   Description: Tabbed commission view — One-Time, Monthly, Special
   PRD Section 6: OC/MC/SC features
   ============================================================ */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function formatDateDMY(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function downloadStatementCSV(com, agentName) {
  const rows = [
    ['Commission Statement'],
    ['Agent', agentName],
    ['Period', com.month],
    ['Date', formatDateDMY(com.date)],
    ['Total Amount', com.amount],
    ['Status', com.status],
    [''],
    ['Type', (String(com.type || '').toLowerCase().trim() === 'one-time' || String(com.type || '').toLowerCase().trim() === 'one-time onboarding' || String(com.type || '').toLowerCase().trim() === 'onetime' || String(com.type || '').toLowerCase().trim() === 'one time') ? 'One Time' : (String(com.type || '').toLowerCase().trim() === 'special' || String(com.type || '').toLowerCase().trim() === 'override' || String(com.type || '').toLowerCase().trim() === 'special override' ? 'Special' : 'Monthly')],
    [''],
    ['Client Name', 'Client ID', 'Investment', 'Rate %', 'Commission'],
  ];
  if (com.breakdown) {
    com.breakdown.forEach(b => {
      rows.push([b.clientName, b.clientId, b.investment, b.rate, b.amount]);
    });
  }
  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `commission_${com.month ? com.month.replace(/\s/g, '_') : 'Statement'}_${agentName.replace(/\s/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadStatementPDF(com, agentName, agentClients = []) {
  const dateStr = formatDateDMY(com.date);
  const filteredBreakdown = com.breakdown || [];
  const filteredTotal = filteredBreakdown.reduce((sum, b) => sum + b.amount, 0);

  const rowsHtml = filteredBreakdown.map(b => {
    const invDateStr = b.investmentDate || '';
    const comType = String(com.type || '').toLowerCase().trim();
    const isOneTime = comType === 'one-time' || comType === 'onetime' || comType === 'one time' || comType === 'one-time onboarding';
    const isSpecial = comType === 'special' || comType === 'override' || comType === 'special override';
    return `
      <tr>
        <td style="border: 1px solid #CFDDD5; padding: 10px; font-weight: 500;">${b.clientName}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; font-family: monospace;">${b.clientId}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center;">${invDateStr}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; ${isOneTime ? 'background: #DBEAFE; color: #1E40AF;' : isSpecial ? 'background: #FEF3C7; color: #92400E;' : 'background: #D1FAE5; color: #065F46;'}">${isOneTime ? 'One Time' : isSpecial ? 'Special' : 'Monthly'}</span>
        </td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right; font-weight: 600;">${formatCurrency(b.investment)}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right;">${b.rate}%</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right; font-weight: bold; color: #059669;">${formatCurrency(b.amount)}</td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Popup blocked! Please allow popups for this site to generate and print statements.');
    return;
  }
  printWindow.document.write(`
    <html>
    <head>
      <title>Commission Statement - ${com.month || 'Statement'} - ${agentName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #11221A; background-color: #FFFFFF; padding: 40px; margin: 0; }
        .header { margin-bottom: 30px; border-bottom: 3px solid #10B981; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 28px; font-weight: 800; color: #061D13; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
        .meta-info { margin-bottom: 30px; background-color: #F3F7F5; border: 1px solid #CFDDD5; border-radius: 12px; padding: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 11px; text-transform: uppercase; color: #4B6B5B; font-weight: 600; margin-bottom: 4px; }
        .meta-value { font-size: 15px; font-weight: 700; color: #061D13; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #F3F7F5; color: #4B6B5B; font-weight: 700; text-transform: uppercase; font-size: 11px; padding: 12px 10px; border: 1px solid #CFDDD5; text-align: left; }
        td { border: 1px solid #CFDDD5; padding: 12px 10px; font-size: 13px; }
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #4B6B5B; border-top: 1px dashed #CFDDD5; padding-top: 20px; }
      </style>
    </head>
    <body onload="window.print();">
      <div class="header">
        <div>
          <h1 class="title">Commission Statement</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #4B6B5B; font-weight: 500;">Kinetoscope Films Production Pvt Ltd</p>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Official Statement</div>
      </div>
      <div class="meta-info">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Agent Name</span>
            <span class="meta-value">${agentName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Statement Period</span>
            <span class="meta-value">${com.month}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Payment Date</span>
            <span class="meta-value">${dateStr}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Commission</span>
            <span class="meta-value" style="color: #059669; font-size: 18px;">${formatCurrency(filteredTotal)}</span>
          </div>
        </div>
      </div>
      <h3>Client Details</h3>
      <table>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Client ID</th>
            <th style="text-align: center;">Investment Date</th>
            <th style="text-align: center;">Type</th>
            <th style="text-align: right;">Investment</th>
            <th style="text-align: right;">Slab %</th>
            <th style="text-align: right;">Commission</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color: #F3F7F5; font-weight: bold;">
            <td colSpan="6" style="text-align: right; border-top: 2px solid #CFDDD5;">Total payout</td>
            <td style="text-align: right; color: #059669; border-top: 2px solid #CFDDD5; font-size: 15px;">${formatCurrency(filteredTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        This is a computer generated document and does not require a physical signature.
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';

const formatClientID = (rawId) => {
  if (!rawId || rawId === '—') return '—';
  const str = String(rawId).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    const lastFourHex = str.slice(-4);
    const decimalVal = parseInt(lastFourHex, 16);
    const num = 1000 + (decimalVal % 9000);
    return `KFPL-CL-${num}`;
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

const formatAgentID = (rawId) => {
  if (!rawId || rawId === '—') return '—';
  const str = String(rawId).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    const lastFourHex = str.slice(-4);
    const decimalVal = parseInt(lastFourHex, 16);
    const num = 1000 + (decimalVal % 9000);
    return `KFPL-AG-${num}`;
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: 'var(--shadow-dropdown)' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-gold-dark)', fontFamily: 'var(--font-display)' }}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const OdometerValue = ({ numericStr, visible }) => {
  if (!numericStr) return null;
  return (
    <span className="kfpl-odometer-wrapper">
      {numericStr.split('').map((char, index) => {
        const isDigit = /\d/.test(char);
        if (!isDigit) {
          return (
            <span key={index} className="kfpl-odometer-char">
              {char}
            </span>
          );
        }

        const digitVal = visible ? parseInt(char, 10) : 0;

        return (
          <span key={index} className="kfpl-odometer-digit-container">
            <span
              className="kfpl-odometer-digit-reel"
              style={{
                transform: `translateY(-${digitVal * 10}%)`,
                transitionDelay: `${index * 30}ms`
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

function formatDateSafe(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CommissionOverview() {
  const [activeTab, setActiveTab] = useState('one-time');
  const toast = useToast();
  const [commissions, setCommissions] = useState([]);
  const [clients, setClients] = useState([]);
  const [agentProfile, setAgentProfile] = useState(null);
  const [apiSlabs, setApiSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [odometerVisible, setOdometerVisible] = useState(false);
  const [commissionSearch, setCommissionSearch] = useState('');
  const [selectedCommission, setSelectedCommission] = useState(null);

  useEffect(() => {
    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_commission_cache');
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed.commissions) setCommissions(parsed.commissions);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.agentProfile) setAgentProfile(parsed.agentProfile);
        if (parsed.apiSlabs) setApiSlabs(parsed.apiSlabs);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse commission cache:', e);
    }

    const fetchData = async () => {
      try {
        const [commResponse, clientsResponse, profileResponse, slabsResponse] = await Promise.all([
          apiRequest('/api/agent/commissions').catch(() => null),
          apiRequest('/api/agent/clients').catch(() => null),
          apiRequest('/api/agent/profile').catch(() => null),
          apiRequest('/api/agent/commission-slabs').catch(() => null)
        ]);

        const list = Array.isArray(commResponse) ? commResponse : (commResponse.data?.commissions || commResponse.commissions || commResponse.history || (Array.isArray(commResponse.data) ? commResponse.data : []));
        setCommissions(list);

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
        const resolvedClients = extractClients(clientsResponse);
        setClients(resolvedClients);

        const extractProfile = (res) => {
          if (!res) return null;
          let data = res;
          if (res.success && res.data) {
            data = res.data;
          }
          return data.profile || data.agent || data;
        };
        const resolvedProfile = extractProfile(profileResponse);
        setAgentProfile(resolvedProfile);

        const extractArray = (res) => {
          if (!res) return [];
          if (Array.isArray(res)) return res;
          if (res.data && Array.isArray(res.data)) return res.data;
          for (const key in res) {
            if (Array.isArray(res[key])) return res[key];
            if (res[key] && typeof res[key] === 'object') {
              const nested = extractArray(res[key]);
              if (nested && nested.length > 0) return nested;
            }
          }
          return [];
        };
        const rawSlabs = extractArray(slabsResponse);
        const parsedSlabs = rawSlabs.map(s => ({
          id: s._id || s.id,
          minAmount: s.minAmount || 0,
          maxAmount: (s.maxAmount === null || s.maxAmount === undefined || s.maxAmount === 999999999) ? 999999999 : s.maxAmount,
          commissionPercentage: s.commissionPercentage !== undefined ? s.commissionPercentage : (s.percentage || 0),
          percentage: s.commissionPercentage !== undefined ? s.commissionPercentage : (s.percentage || 0),
          type: s.type || 'monthly'
        }));
        setApiSlabs(parsedSlabs);

        // Save fresh values to SWR cache
        const cacheKey = getAgentCacheKey('kfpl_agent_commission_cache');
        localStorage.setItem(cacheKey, JSON.stringify({
          commissions: list,
          clients: resolvedClients,
          agentProfile: resolvedProfile,
          apiSlabs: parsedSlabs
        }));

      } catch (err) {
        console.error('Failed to load commissions data:', err);
        setCommissions([]);
        setClients([]);
        setAgentProfile(null);
        setApiSlabs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setOdometerVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setOdometerVisible(false);
    }
  }, [loading]);

  const normalizeType = (t) => {
    if (!t) return '';
    const lower = t.toLowerCase().trim();
    if (lower === 'one time' || lower === 'one-time' || lower === 'onetime' || lower === 'one-time onboarding') return 'one-time';
    if (lower === 'monthly' || lower === 'recurring' || lower === 'monthly recurring') return 'monthly';
    if (lower === 'special' || lower === 'bonus' || lower === 'override' || lower === 'special override') return 'special';
    return lower;
  };

  const getAgentEmail = () => {
    const authData = localStorage.getItem('kfpl_agent_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return (parsed.agent?.email || parsed.user?.email || '').toLowerCase().trim();
      } catch (e) {
        console.error(e);
      }
    }
    return '';
  };

  const email = getAgentEmail();
  const isDemo = email === 'rajesh.sharma@mail.com' || email === 'karan.malhotra@mail.com' || email === 'neha.kapoor@mail.com';

  const getCalculatedCommissions = (prof, cls, slabs = []) => {
    const list = [];
    if (!prof || !cls || cls.length === 0) return [];

    const getSlabRate = (typeNorm, amount) => {
      const typeSlabs = slabs.filter(s => s.type === typeNorm);
      const fallbackSlabs = typeNorm === 'one-time' 
        ? [
            { minAmount: 500000, maxAmount: 2500000, percentage: 2 },
            { minAmount: 2500000, maxAmount: 5000000, percentage: 3 },
            { minAmount: 5000000, maxAmount: 10000000, percentage: 4 },
            { minAmount: 10000000, maxAmount: 999999999, percentage: 5 }
          ]
        : [
            { minAmount: 0, maxAmount: 1500000, percentage: 0.5 },
            { minAmount: 1500000, maxAmount: 2500000, percentage: 0.75 },
            { minAmount: 2500000, maxAmount: 5000000, percentage: 1 },
            { minAmount: 5000000, maxAmount: 10000000, percentage: 1.5 },
            { minAmount: 10000000, maxAmount: 999999999, percentage: 2 }
          ];
      const activeSlabs = typeSlabs.length > 0 ? typeSlabs : fallbackSlabs;
      const matched = activeSlabs.find(s => {
        const max = s.maxAmount === null || s.maxAmount === undefined || s.maxAmount === 999999999 ? 999999999 : s.maxAmount;
        const min = s.minAmount || 0;
        return amount >= min && amount < max;
      });
      return matched ? (matched.commissionPercentage !== undefined ? matched.commissionPercentage : (matched.percentage || 0)) : 0;
    };

    cls.forEach((cl, index) => {
      const totalInv = cl.totalInvestment || cl.investmentAmount || 0;
      if (totalInv <= 0) return;

      const otRate = getSlabRate('one-time', totalInv);
      const mRate = getSlabRate('monthly', totalInv);
      const spRate = parseFloat(prof.specialCommission || 0);

      const joinDateStr = cl.dateOfJoining || cl.joinDate || cl.createdAt || '';
      let dateVal = new Date();
      if (joinDateStr) {
        const d = new Date(joinDateStr);
        if (!isNaN(d.getTime())) {
          dateVal = d;
        }
      }

      const monthYearStr = dateVal.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      // 1. One-Time Onboarding Commission
      if (otRate > 0) {
        const otAmt = Math.round((totalInv * otRate) / 100);
        list.push({
          id: `calc-ot-${cl.id || cl._id}-${index}`,
          month: monthYearStr,
          date: dateVal.toISOString().split('T')[0],
          type: 'one-time',
          commissionType: 'One-Time',
          amount: otAmt,
          status: 'Pending',
          clientId: cl.id || cl._id,
          clientName: cl.fullName || cl.name || cl.profile?.fullName || cl.user?.name || '—',
          clientCode: formatClientID(cl.clientCode || cl.clientId || cl.profile?.clientCode || cl.user?.clientCode || ''),
          investmentAmount: totalInv,
          slabPercentage: otRate
        });
      }

      // 2. Monthly Recurring Commission
      if (mRate > 0) {
        const mAmt = Math.round((totalInv * mRate) / 100);
        const nextMonthDate = new Date(dateVal.getFullYear(), dateVal.getMonth() + 1, 1);
        if (nextMonthDate <= new Date()) {
          const nextMonthYearStr = nextMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
          list.push({
            id: `calc-m-${cl.id || cl._id}-${index}`,
            month: nextMonthYearStr,
            date: nextMonthDate.toISOString().split('T')[0],
            type: 'monthly',
            commissionType: 'Monthly',
            amount: mAmt,
            status: 'Pending',
            clientId: cl.id || cl._id,
            clientName: cl.fullName || cl.name || cl.profile?.fullName || cl.user?.name || '—',
            clientCode: formatClientID(cl.clientCode || cl.clientId || cl.profile?.clientCode || cl.user?.clientCode || ''),
            investmentAmount: totalInv,
            slabPercentage: mRate
          });
        }
      }

      // 3. Special Override Commission
      if (spRate > 0) {
        const spAmt = Math.round((totalInv * spRate) / 100);
        list.push({
          id: `calc-sp-${cl.id || cl._id}-${index}`,
          month: monthYearStr,
          date: dateVal.toISOString().split('T')[0],
          type: 'special',
          commissionType: 'Special',
          amount: spAmt,
          status: 'Pending',
          clientId: cl.id || cl._id,
          clientName: cl.fullName || cl.name || cl.profile?.fullName || cl.user?.name || '—',
          clientCode: formatClientID(cl.clientCode || cl.clientId || cl.profile?.clientCode || cl.user?.clientCode || ''),
          investmentAmount: totalInv,
          slabPercentage: spRate
        });
      }
    });

    return list;
  };

  const dbEnriched = commissions.map(c => {
    const cid = c.clientId?._id || c.clientId?.id || c.clientId || c.client?._id || c.client?.id || c.client;
    const foundClient = clients.find(cl => {
      const clid = cl._id || cl.id || cl.user?._id || cl.profile?.userId;
      return clid && cid && String(clid) === String(cid);
    });
    return {
      ...c,
      clientName: c.clientName || (foundClient ? (foundClient.fullName || foundClient.name || foundClient.profile?.fullName) : '—'),
      clientCode: c.clientCode || (foundClient ? formatClientID(foundClient.clientCode || foundClient.clientId || foundClient.profile?.clientCode || '') : '—'),
      investmentAmount: c.investmentAmount || (foundClient ? (foundClient.totalInvestment || foundClient.investmentAmount || foundClient.profile?.totalPortfolioValue || 0) : 0),
      slabPercentage: c.slabPercentage || c.slabPercent || (normalizeType(c.type || c.commissionType) === 'one-time' ? (agentProfile?.oneTimeCommission || 5) : (agentProfile?.monthlySlab || 2))
    };
  });

  const calculatedComms = getCalculatedCommissions(agentProfile, clients, apiSlabs);

  const enrichedCommissions = [...dbEnriched];
  calculatedComms.forEach(calc => {
    const hasDbEquivalent = dbEnriched.some(db => {
      const dbCid = db.clientId?._id || db.clientId?.id || db.clientId || db.client?._id || db.client?.id || db.client;
      const calcCid = calc.clientId;
      const dbType = normalizeType(db.type || db.commissionType);
      const calcType = normalizeType(calc.type);
      return String(dbCid) === String(calcCid) && dbType === calcType;
    });
    if (!hasDbEquivalent) {
      enrichedCommissions.push(calc);
    }
  });

  const oneTimeCommission = isDemo 
    ? enrichedCommissions.filter(c => normalizeType(c.type || c.commissionType) === 'one-time') 
    : enrichedCommissions.filter(c => normalizeType(c.type || c.commissionType) === 'one-time' && c.clientName && c.clientName !== '—' && c.clientName !== '-' && c.clientName !== 'Various');

  const monthlyCommission = isDemo 
    ? enrichedCommissions.filter(c => normalizeType(c.type || c.commissionType) === 'monthly') 
    : enrichedCommissions.filter(c => normalizeType(c.type || c.commissionType) === 'monthly' && c.clientName && c.clientName !== '—' && c.clientName !== '-' && c.clientName !== 'Various');

  const specialCommission = isDemo 
    ? enrichedCommissions.filter(c => normalizeType(c.type || c.commissionType) === 'special') 
    : enrichedCommissions.filter(c => normalizeType(c.type || c.commissionType) === 'special' && c.reason && c.reason !== '—' && c.reason !== '-');

  const totalOneTime = oneTimeCommission.filter(c => ['paid', 'credited'].includes(String(c.status || '').toLowerCase())).reduce((s, c) => s + (c.amount || c.commissionEarned || 0), 0);
  const totalMonthly = monthlyCommission.filter(c => ['paid', 'credited'].includes(String(c.status || '').toLowerCase())).reduce((s, c) => s + (c.amount || 0), 0);
  const totalSpecial = specialCommission.filter(s => ['credited', 'paid'].includes(String(s.status || '').toLowerCase())).reduce((s, c) => s + (c.amount || 0), 0);
  const totalEarned = totalOneTime + totalMonthly + totalSpecial;

  const getCommissionBreakdown = (com) => {
    if (com.breakdown && com.breakdown.length > 0) return com.breakdown;
    const cid = com.clientId;
    const clientObj = clients.find(c => String(c.id || c._id) === String(cid));
    if (clientObj) {
      const typeNormalized = String(com.type || com.commissionType || '').toLowerCase().trim();
      const totalInv = clientObj.totalInvestment || clientObj.investmentAmount || 0;
      let pct = com.slabPercentage !== undefined && com.slabPercentage !== '—' ? parseFloat(com.slabPercentage) : 0;
      if (!pct) {
        if (typeNormalized === 'one-time' || typeNormalized === 'onetime' || typeNormalized === 'one time' || typeNormalized === 'one-time onboarding') {
          const typeSlabs = apiSlabs.filter(s => s.type === 'one-time');
          const fallbackSlabs = [
            { minAmount: 500000, maxAmount: 2500000, percentage: 2 },
            { minAmount: 2500000, maxAmount: 5000000, percentage: 3 },
            { minAmount: 5000000, maxAmount: 10000000, percentage: 4 },
            { minAmount: 10000000, maxAmount: 999999999, percentage: 5 }
          ];
          const activeSlabs = typeSlabs.length > 0 ? typeSlabs : fallbackSlabs;
          const matched = activeSlabs.find(s => {
            const max = s.maxAmount === null || s.maxAmount === undefined || s.maxAmount === 999999999 ? 999999999 : s.maxAmount;
            const min = s.minAmount || 0;
            return totalInv >= min && totalInv < max;
          });
          pct = matched ? (matched.commissionPercentage !== undefined ? matched.commissionPercentage : (matched.percentage || 0)) : 0;
        } else if (typeNormalized === 'monthly' || typeNormalized === 'recurring' || typeNormalized === 'monthly recurring') {
          const typeSlabs = apiSlabs.filter(s => s.type === 'monthly');
          const fallbackSlabs = [
            { minAmount: 0, maxAmount: 1500000, percentage: 0.5 },
            { minAmount: 1500000, maxAmount: 2500000, percentage: 0.75 },
            { minAmount: 2500000, maxAmount: 5000000, percentage: 1 },
            { minAmount: 5000000, maxAmount: 10000000, percentage: 1.5 },
            { minAmount: 10000000, maxAmount: 999999999, percentage: 2 }
          ];
          const activeSlabs = typeSlabs.length > 0 ? typeSlabs : fallbackSlabs;
          const matched = activeSlabs.find(s => {
            const max = s.maxAmount === null || s.maxAmount === undefined || s.maxAmount === 999999999 ? 999999999 : s.maxAmount;
            const min = s.minAmount || 0;
            return totalInv >= min && totalInv < max;
          });
          pct = matched ? (matched.commissionPercentage !== undefined ? matched.commissionPercentage : (matched.percentage || 0)) : 0;
        } else if (typeNormalized === 'special' || typeNormalized === 'override' || typeNormalized === 'special override') {
          pct = agentProfile?.commissionSpecial || agentProfile?.profile?.specialCommission || 0;
        }
      }

      return [{
        clientName: clientObj.fullName || clientObj.name || clientObj.profile?.fullName || clientObj.user?.name || '—',
        clientId: formatClientID(clientObj.clientCode || clientObj.clientId || clientObj.profile?.clientCode || clientObj.user?.clientCode || clientObj._id || clientObj.id || ''),
        investment: totalInv,
        rate: pct,
        amount: com.amount,
        investmentDate: formatDateDMY(clientObj.joinDate || clientObj.dateOfJoining || '—')
      }];
    }
    return [];
  };

  const filteredCommission = enrichedCommissions.filter(com => {
    if (!com) return false;
    const term = commissionSearch.toLowerCase().trim();
    if (!term) return true;
    const comType = String(com.type || com.commissionType || '').toLowerCase().trim();
    const isOneTime = comType === 'one-time' || comType === 'onetime' || comType === 'one time' || comType === 'one-time onboarding';
    const isSpecial = comType === 'special' || comType === 'override' || comType === 'special override';
    const typeLabel = isOneTime ? 'One Time' : isSpecial ? 'Special' : 'Monthly';
    return (
      (com.month || '').toLowerCase().includes(term) ||
      formatDateDMY(com.date).includes(term) ||
      typeLabel.toLowerCase().includes(term) ||
      String(com.amount).includes(term) ||
      String(com.status || '').toLowerCase().includes(term)
    );
  });

  const commissionBreakdown = [
    { label: 'One-Time', value: totalOneTime, helper: `${oneTimeCommission.length} clients` },
    { label: 'Monthly', value: totalMonthly, helper: 'Monthly slab payouts' },
    { label: 'Special', value: totalSpecial, helper: 'Credited bonus' },
  ];

  const handleDownload = (format) => {
    if (format === 'xlsx') {
      const headers = ['Month', 'Investment Base', 'Slab Percent', 'Commission Amount'];
      const rows = monthlyCommission.map(m => [
        m.month,
        m.investmentBase,
        `${m.slabPercent}%`,
        m.amount
      ]);
      const csvContent = [headers, ...rows]
        .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Monthly_Commission_Ledger_${new Date().getFullYear()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast('Excel/CSV statement downloaded successfully.', 'success');
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      const rowsHtml = monthlyCommission.map(m => `
        <tr>
          <td style="border: 1px solid #CFDDD5; padding: 10px; font-weight: 500;">${m.month}</td>
          <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right;">₹${m.investmentBase.toLocaleString('en-IN')}</td>
          <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center;"><span style="background: #E6F4EA; color: #137333; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${m.slabPercent}%</span></td>
          <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right; font-weight: bold; color: #0F766E;">₹${m.amount.toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
      const totalAmount = monthlyCommission.reduce((sum, m) => sum + m.amount, 0);

      printWindow.document.write(`
        <html>
        <head>
          <title>Monthly Commission Ledger</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #11221A; background-color: #FFFFFF; padding: 40px; margin: 0; }
            .header { margin-bottom: 30px; border-bottom: 3px solid #0F766E; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 28px; font-weight: 800; color: #061D13; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            .table th { background-color: #E5ECE8; border: 1px solid #CFDDD5; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #2E3E36; letter-spacing: 0.5px; }
            .table td { border: 1px solid #CFDDD5; padding: 10px 12px; color: #11221A; }
            .total-row { background-color: #F3F7F5; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .print-btn-bar { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-btn-bar" style="display: flex; justify-content: flex-end; margin-bottom: 20px; gap: 10px;">
            <button onclick="window.print();" style="background: #0F766E; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px;">Print / Save PDF</button>
            <button onclick="window.close();" style="background: #e2ece7; color: #2e3e36; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px;">Close Window</button>
          </div>
          <div class="header">
            <div>
              <div class="title">Monthly Commission Ledger</div>
              <div style="font-size: 12px; color: #6D7E75; margin-top: 4px; font-weight: 500;">KFPL Agent Commission Statement</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: 600; color: #2E3E36;">Date Generated:</div>
              <div style="font-size: 14px; font-weight: 700; color: #11221A;">${new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: right;">Investment Base</th>
                <th style="text-align: center;">Slab %</th>
                <th style="text-align: right;">Commission Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row">
                <td style="text-align: left; font-weight: 800; font-size: 14px; padding: 12px;">Total Summary</td>
                <td colspan="2"></td>
                <td style="text-align: right; font-weight: 800; color: #0F766E; font-size: 14px; padding: 12px;">₹${totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast('PDF statement window opened.', 'success');
    }
  };

  return (
    <div className="kfpl-page kfpl-commission-page animate-fade-slide-up" id="commission-page">
      <div className="kfpl-page-header">
        <div className="kfpl-page-header-content">
          <h1 className="kfpl-page-title">Commission Ledger</h1>
          <p className="kfpl-page-subtitle">Track one-time, monthly slabs, and special commission payouts.</p>
        </div>
      </div>

      {/* Total Card */}
      <div className="kfpl-commission-total-card">
        <div className="kfpl-commission-total-main">
          <div className="kfpl-commission-total-label">Total Commission Earned</div>
          <div className="kfpl-commission-total-value">
            <OdometerValue numericStr={formatCurrency(totalEarned)} visible={odometerVisible} />
          </div>
          <div className="kfpl-commission-total-note">Paid and credited commission across all categories</div>
        </div>
        <div className="kfpl-commission-breakdown">
          {commissionBreakdown.map(item => (
            <div className="kfpl-commission-breakdown-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{formatCurrency(item.value)}</strong>
              <small>{item.helper}</small>
            </div>
          ))}
        </div>
      </div>

      {/* Commission History Table */}
      <div className="kfpl-panel-card" style={{ marginTop: 24 }}>
        <div className="kfpl-panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Commission History</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Click on any period to view detailed breakdown</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="kfpl-search" style={{ maxWidth: '260px' }}>
              <svg className="kfpl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search commission..."
                value={commissionSearch}
                onChange={(e) => setCommissionSearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>
        <div className="kfpl-table-wrapper">
          <div className="kfpl-table-scroll">
            <table className="kfpl-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommission.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>No commission records found</td></tr>
                ) : filteredCommission.map(com => (
                  <tr key={com.id || com._id}>
                    <td>
                      <button
                        onClick={() => setSelectedCommission(com)}
                        style={{
                          background: 'none', border: 'none', padding: '4px 8px',
                          borderRadius: '6px', color: 'var(--color-gold-dark)',
                          fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                          textUnderlineOffset: '3px', fontSize: '0.875rem',
                        }}
                        title="Click to view details"
                      >
                        {com.month || ((com.date) ? new Date(com.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Statement')}
                      </button>
                    </td>
                    <td>{formatDateDMY(com.date)}</td>
                    <td>
                      {(() => {
                        const comType = String(com.type || com.commissionType || '').toLowerCase().trim();
                        const isOneTime = comType === 'one-time' || comType === 'onetime' || comType === 'one time' || comType === 'one-time onboarding';
                        const isSpecial = comType === 'special' || comType === 'override' || comType === 'special override';
                        return (
                          <span className={`kfpl-badge kfpl-badge--${isOneTime ? 'info' : isSpecial ? 'gold' : 'success'}`}>
                            {isOneTime ? 'One Time' : isSpecial ? 'Special' : 'Monthly'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="font-semibold">{formatCurrency(com.amount)}</td>
                    <td>
                      <span className={`kfpl-badge kfpl-badge--${String(com.status).toLowerCase() === 'paid' ? 'success' : 'warning'}`}>
                        {com.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Commission Detail Modal ─── */}
      {(() => {
        if (!selectedCommission) return null;
        const filteredBreakdown = getCommissionBreakdown(selectedCommission);
        const filteredTotal = filteredBreakdown.length > 0 ? filteredBreakdown.reduce((sum, b) => sum + b.amount, 0) : (selectedCommission.amount || 0);

        return createPortal(
          <div
            className="kfpl-modal-overlay"
            onClick={() => setSelectedCommission(null)}
          >
            <div
              className="kfpl-modal"
              style={{ maxWidth: '640px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="kfpl-modal-header">
                <h3 className="kfpl-modal-title">Commission Statement</h3>
                <button className="kfpl-modal-close" onClick={() => setSelectedCommission(null)} aria-label="Close modal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="kfpl-modal-body">
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {selectedCommission.month || ((selectedCommission.date) ? new Date(selectedCommission.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Statement')} — {selectedCommission.clientName || agentProfile?.name || agentProfile?.fullName || 'Agent'} ({selectedCommission.clientCode || formatAgentID(agentProfile?.agentCode || agentProfile?.agentId || agentProfile?.code || agentProfile?._id || agentProfile?.id || '') || '—'})
                </p>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    background: 'var(--color-surface-alt, #f8fafc)', borderRadius: '12px',
                    padding: '16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Total Amount</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gold-dark)' }}>{formatCurrency(filteredTotal)}</div>
                  </div>
                  <div style={{
                    background: 'var(--color-surface-alt, #f8fafc)', borderRadius: '12px',
                    padding: '16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Type</div>
                    <div>
                      {(() => {
                        const comType = String(selectedCommission.type || selectedCommission.commissionType || '').toLowerCase().trim();
                        const isOneTime = comType === 'one-time' || comType === 'onetime' || comType === 'one time' || comType === 'one-time onboarding';
                        const isSpecial = comType === 'special' || comType === 'override' || comType === 'special override';
                        return (
                          <span className={`kfpl-badge kfpl-badge--${isOneTime ? 'info' : isSpecial ? 'gold' : 'success'}`}>
                            {isOneTime ? 'One Time' : isSpecial ? 'Special' : 'Monthly'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--color-surface-alt, #f8fafc)', borderRadius: '12px',
                    padding: '16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Date</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatDateDMY(selectedCommission.date)}</div>
                  </div>
                  <div style={{
                    background: 'var(--color-surface-alt, #f8fafc)', borderRadius: '12px',
                    padding: '16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Status</div>
                    <div>
                      <span className={`kfpl-badge kfpl-badge--${String(selectedCommission.status).toLowerCase() === 'paid' ? 'success' : 'warning'}`}>
                        {selectedCommission.status}
                      </span>
                    </div>
                  </div>
                </div>

                {filteredBreakdown.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text-primary)' }}>
                      Client-wise Breakdown
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="kfpl-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>Client ID</th>
                            <th style={{ textAlign: 'center' }}>Investment Date</th>
                            <th style={{ textAlign: 'center' }}>Type</th>
                            <th style={{ textAlign: 'right' }}>Investment</th>
                            <th style={{ textAlign: 'right' }}>Rate</th>
                            <th style={{ textAlign: 'right' }}>Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBreakdown.map((b, i) => {
                            const comType = String(selectedCommission.type || selectedCommission.commissionType || '').toLowerCase().trim();
                            const isOneTime = comType === 'one-time' || comType === 'onetime' || comType === 'one time' || comType === 'one-time onboarding';
                            const isSpecial = comType === 'special' || comType === 'override' || comType === 'special override';
                            return (
                              <tr key={i}>
                                <td className="kfpl-table-cell-primary">{b.clientName}</td>
                                <td>{b.clientId}</td>
                                <td style={{ textAlign: 'center' }}>{b.investmentDate}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`kfpl-badge kfpl-badge--${isOneTime ? 'info' : isSpecial ? 'gold' : 'success'}`}>
                                    {isOneTime ? 'One Time' : isSpecial ? 'Special' : 'Monthly'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(b.investment)}</td>
                                <td style={{ textAlign: 'right' }}>{b.rate}%</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{formatCurrency(b.amount)}</td>
                              </tr>
                            );
                          })}
                          <tr style={{ background: 'var(--color-surface-alt, #f8fafc)', fontWeight: 700 }}>
                            <td colSpan={6} style={{ textAlign: 'right' }}>Total</td>
                            <td style={{ textAlign: 'right', color: 'var(--color-gold-dark)' }}>{formatCurrency(filteredTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="kfpl-modal-footer">
                <button
                  className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm"
                  onClick={() => setSelectedCommission(null)}
                >Close</button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

/* ============ END: CommissionOverview.jsx ============ */
