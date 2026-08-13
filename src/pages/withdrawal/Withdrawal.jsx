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

      let currentAvailable = 0;
      if (specificRes && (specificRes.availableBalance !== undefined || specificRes.data?.availableBalance !== undefined)) {
        currentAvailable = specificRes.availableBalance ?? specificRes.data?.availableBalance ?? 0;
      } else if (dashRes) {
        const dash = dashRes.data || dashRes;
        const paidVal = dash.commissionPaid ?? dash.stats?.commissionPaid ?? 0;
        const withdrawnVal = dash.totalWithdrawn ?? dash.stats?.totalWithdrawn ?? 0;
        currentAvailable = Math.max(0, paidVal - withdrawnVal);
      }
      setPendingBalance(currentAvailable);

      if (dashRes) {
        const dash = dashRes.data || dashRes;
        if (dash.withdrawals && Array.isArray(dash.withdrawals)) {
          setHistory(dash.withdrawals);
        }
      }

      // 3. Process specific withdrawals list
      if (specificRes) {
        let list = [];
        if (Array.isArray(specificRes)) {
          list = specificRes;
        } else if (Array.isArray(specificRes.history)) {
          list = specificRes.history;
        } else if (specificRes.data) {
          if (Array.isArray(specificRes.data.history)) {
            list = specificRes.data.history;
          } else if (Array.isArray(specificRes.data.withdrawals)) {
            list = specificRes.data.withdrawals;
          } else if (Array.isArray(specificRes.data)) {
            list = specificRes.data;
          }
        } else if (Array.isArray(specificRes.withdrawals)) {
          list = specificRes.withdrawals;
        }
        setHistory(list);
      }
      // Save to SWR Cache
      const cacheKey = getAgentCacheKey('kfpl_agent_withdrawal_cache');
      localStorage.setItem(cacheKey, JSON.stringify({
        bankInfo: {
          bankName: profileRes ? (profileRes.data?.bankName || profileRes.bankName || 'N/A') : 'N/A',
          bankAccount: profileRes ? (profileRes.data?.accountNumber || profileRes.data?.bankAccount || profileRes.accountNumber || 'N/A') : 'N/A',
          ifsc: profileRes ? (profileRes.data?.ifscCode || profileRes.data?.ifsc || profileRes.ifscCode || 'N/A') : 'N/A'
        },
        pendingBalance: currentAvailable,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Purge legacy withdrawal cache to force fresh 2,000 balance load
    try {
      const cacheKey = getAgentCacheKey('kfpl_agent_withdrawal_cache');
      localStorage.removeItem(cacheKey);
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
      const res = await apiRequest('/api/agent/withdrawals', {
        method: 'POST',
        body: {
          amount: numAmt,
          note: note.trim()
        }
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
      <div className="kfpl-card" style={{ borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated, #F8FAFC)' }}>
          <div>
            <div className="kfpl-card-title" style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--color-navy, #0f172a)' }}>
              Payout Request History
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Real-time audit log of your agent commission withdrawal requests and approval status
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="kfpl-badge" style={{ background: '#E0E7FF', color: '#3730A3', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem' }}>
              Total Requests: {Array.isArray(history) ? history.length : 0}
            </span>
            <span className="kfpl-badge" style={{ background: '#D1FAE5', color: '#065F46', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem' }}>
              Total Approved: {formatCurrency(Array.isArray(history) ? history.filter(h => ['paid', 'approved', 'credited'].includes(String(h.status).toLowerCase())).reduce((sum, h) => sum + Number(h.amount || 0), 0) : 0)}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="kfpl-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt, #F1F5F9)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left' }}>Date & Time</th>
                <th style={{ padding: '14px 20px', textAlign: 'left' }}>Request ID</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'left' }}>Payout Account</th>
                <th style={{ padding: '14px 20px', textAlign: 'left' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(!Array.isArray(history) || history.length === 0) ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📂</div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>No withdrawal history recorded yet.</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>When you submit a payout request, your history will appear here.</div>
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => {
                  const statusNorm = String(item.status || 'pending').toLowerCase();
                  const isApproved = statusNorm === 'approved' || statusNorm === 'paid' || statusNorm === 'credited';
                  const isPending = statusNorm === 'pending';

                  const badgeBg = isApproved ? '#D1FAE5' : isPending ? '#FEF3C7' : '#FEE2E2';
                  const badgeColor = isApproved ? '#065F46' : isPending ? '#92400E' : '#991B1B';
                  const statusLabel = isApproved ? '✓ APPROVED' : isPending ? '⏳ PENDING' : '✕ REJECTED';

                  const dateFormatted = item.createdAt
                    ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                    : (item.date || '—');

                  const reqIdStr = item.requestId || (item._id ? `WD-${item._id.toString().slice(-8)}` : `WD-${1000 + idx}`);
                  const accountStr = item.paymentMethod || (bankInfo.bankName !== 'N/A' ? `${bankInfo.bankName} (****${bankInfo.bankAccount.slice(-4)})` : 'Bank Transfer');

                  return (
                    <tr key={item._id || item.id || idx} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-navy, #0f172a)' }}>
                        {dateFormatted}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', background: 'var(--color-surface-elevated, #F8FAFC)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.82rem', color: '#334155' }}>
                          {reqIdStr}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '800', fontSize: '0.95rem', color: 'var(--color-primary-green, #059669)' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: badgeBg, color: badgeColor, fontWeight: '800', fontSize: '0.72rem', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.04em' }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.83rem', fontWeight: '600', color: 'var(--color-text)' }}>
                        {accountStr}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)', fontSize: '0.83rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.note || item.remarks || 'Verified bank ledger statement'}>
                        {item.note || item.remarks || 'Verified bank ledger statement'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
