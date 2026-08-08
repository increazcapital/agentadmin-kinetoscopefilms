import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';

export default function Withdrawal() {
  const toastHelper = useToast();
  const addToast = typeof toastHelper === 'function' ? toastHelper : (toastHelper?.addToast || (() => {}));

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pendingBalance, setPendingBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [bankInfo, setBankInfo] = useState({
    bankName: 'N/A',
    bankAccount: 'N/A',
    ifsc: 'N/A'
  });

  const getAgentId = () => {
    try {
      const auth = localStorage.getItem('kfpl_agent_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        const a = parsed.agent || parsed.user || {};
        return a.id || a._id || 'default';
      }
    } catch (_) {}
    return 'default';
  };

  const fetchWithdrawalData = async () => {
    try {
      setLoading(true);

      const [profileRes, dashRes, specificRes] = await Promise.all([
        apiRequest('/api/agent/profile').catch(() => null),
        apiRequest('/api/agent/dashboard').catch(() => null),
        apiRequest('/api/agent/withdrawals').catch(() => null)
      ]);

      // 1. Process Profile for Bank Info
      if (profileRes) {
        const p = profileRes.data || profileRes.profile || profileRes;
        const acct = p.accountNumber || p.bankAccount || 'N/A';
        const ifscVal = p.ifscCode || p.ifsc || 'N/A';
        setBankInfo({
          bankName: p.bankName || 'N/A',
          bankAccount: acct,
          ifsc: ifscVal
        });
      }

      // 2. Process Dashboard for pending balance
      if (dashRes) {
        const dash = dashRes.data || dashRes;
        const pendingVal = dash.commissionPending ?? dash.stats?.commissionPending ?? 0;
        setPendingBalance(pendingVal);

        if (dash.withdrawals && Array.isArray(dash.withdrawals)) {
          setHistory(dash.withdrawals);
        }
      }

      // 3. Process specific withdrawals list if endpoint exists
      if (specificRes) {
        let list = [];
        if (Array.isArray(specificRes)) {
          list = specificRes;
        } else if (specificRes.withdrawals && Array.isArray(specificRes.withdrawals)) {
          list = specificRes.withdrawals;
        } else if (specificRes.data && Array.isArray(specificRes.data)) {
          list = specificRes.data;
        }
        if (list.length > 0) {
          setHistory(list);
        }
      }
      // Save to SWR Cache
      const cacheKey = getAgentCacheKey('kfpl_agent_withdrawal_cache');
      localStorage.setItem(cacheKey, JSON.stringify({
        bankInfo: {
          bankName: profileRes ? (profileRes.data?.bankName || profileRes.bankName || 'N/A') : 'N/A',
          bankAccount: profileRes ? (profileRes.data?.accountNumber || profileRes.data?.bankAccount || profileRes.accountNumber || 'N/A') : 'N/A',
          ifsc: profileRes ? (profileRes.data?.ifscCode || profileRes.data?.ifsc || profileRes.ifscCode || 'N/A') : 'N/A'
        },
        pendingBalance: dashRes ? (dashRes.data?.commissionPending ?? dashRes.commissionPending ?? 0) : 0,
        history: (() => {
          if (specificRes) {
            const d = specificRes.data || specificRes.withdrawals;
            return Array.isArray(d) ? d : [];
          }
          return Array.isArray(dashRes?.withdrawals) ? dashRes.withdrawals : [];
        })()
      }));

    } catch (e) {
      console.error('Error loading withdrawal details:', e);
      // Rollback to SWR Cache
      try {
        const cacheKey = getAgentCacheKey('kfpl_agent_withdrawal_cache');
        const cache = localStorage.getItem(cacheKey);
        if (cache) {
          const parsed = JSON.parse(cache);
          if (parsed.bankInfo) setBankInfo(parsed.bankInfo);
          if (parsed.pendingBalance !== undefined) setPendingBalance(parsed.pendingBalance);
          if (Array.isArray(parsed.history)) setHistory(parsed.history);
          return;
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_withdrawal_cache');
      const cache = localStorage.getItem(cacheKey);
      if (cache) {
        const parsed = JSON.parse(cache);
        // Auto-purge corrupted cache where history is not an array
        if (parsed.history && !Array.isArray(parsed.history)) {
          localStorage.removeItem(cacheKey);
        } else {
          if (parsed.bankInfo) setBankInfo(parsed.bankInfo);
          if (parsed.pendingBalance !== undefined) setPendingBalance(parsed.pendingBalance);
          if (Array.isArray(parsed.history)) setHistory(parsed.history);
          setLoading(false); // bypass loading screen
        }
      }
    } catch (_) {}
    fetchWithdrawalData();
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) {
      addToast('Please enter a valid withdrawal amount.', 'error');
      return;
    }
    if (numAmt > pendingBalance && pendingBalance > 0) {
      addToast(`Amount cannot exceed available pending balance (${formatCurrency(pendingBalance)}).`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/api/agent/withdrawals', 'POST', {
        amount: numAmt,
        note: note.trim()
      });

      if (res && (res.success || res.status === 'success')) {
        addToast('Withdrawal request submitted successfully!', 'success');
        setAmount('');
        setNote('');
        fetchWithdrawalData();
      } else {
        addToast(res?.message || 'Failed to submit withdrawal request.', 'error');
      }
    } catch (err) {
      console.error('Submit withdrawal failed:', err);
      addToast(err.message || 'Error submitting withdrawal request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kfpl-page">
      <div className="kfpl-page-header">
        <div>
          <h1 className="kfpl-page-title">Commission Withdrawal</h1>
          <p className="kfpl-page-subtitle">Request payout for your earned agent commissions</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Available Balance & Request Form */}
        <div className="kfpl-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="kfpl-card-title">Payout Request</span>
            <span className="kfpl-badge kfpl-badge--success">Active Bank Linked</span>
          </div>

          <div style={{ background: 'var(--color-surface-elevated)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Available Commission Balance</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary-green)' }}>
              {formatCurrency(pendingBalance)}
            </div>
          </div>

          <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '6px' }}>
                Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.target.blur()}
                placeholder="Enter amount"
                className="kfpl-input"
                min="1"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '6px' }}>
                Notes / Reference (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any remarks for finance team..."
                className="kfpl-input"
                rows="2"
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="kfpl-btn kfpl-btn--primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            >
              {submitting ? 'Submitting Request...' : 'Submit Payout Request'}
            </button>
          </form>
        </div>

        {/* Bank Account Details */}
        <div className="kfpl-card" style={{ padding: '24px' }}>
          <div className="kfpl-card-title" style={{ marginBottom: '16px' }}>Payout Destination Account</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
            Approved payouts will be credited directly to your registered bank account below.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface-elevated, #F8FAFC)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Bank Name</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-navy)' }}>{bankInfo.bankName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface-elevated, #F8FAFC)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Account Number</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-navy)', letterSpacing: '0.04em' }}>{bankInfo.bankAccount}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface-elevated, #F8FAFC)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>IFSC Code</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-navy)', letterSpacing: '0.04em' }}>{bankInfo.ifsc}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> To update bank details, please contact Super Admin support desk.
          </div>
        </div>
      </div>

      {/* Request History Table */}
      <div className="kfpl-card">
        <div className="kfpl-card-title" style={{ padding: '20px 24px 12px' }}>Payout Request History</div>

        <div style={{ overflowX: 'auto' }}>
          <table className="kfpl-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Request ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(!Array.isArray(history) || history.length === 0) ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    No withdrawal history recorded.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr key={item._id || item.id || idx}>
                    <td>{item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—')}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{item.requestId || item._id?.slice(-8) || `WD-${1000 + idx}`}</td>
                    <td style={{ fontWeight: '700', color: 'var(--color-primary-green)' }}>{formatCurrency(item.amount)}</td>
                    <td>
                      <span className={`kfpl-badge kfpl-badge--${(item.status || 'pending').toLowerCase()}`}>
                        {(item.status || 'Pending').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{item.note || item.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
