/* ============================================================
   Page: FAQPage.jsx (Agent Portal)
   Description: Clean, modern agent FAQ page with smooth accordion layout
   ============================================================ */

import { useState, useEffect } from 'react';
import { apiRequest } from '../../config/apiHelper';

const PORTAL_TYPE = 'agent';

const defaultFAQs = [
  {
    id: 'default-a1',
    question: 'How is my agent commission slab calculated?',
    answer: 'Agent commission is determined automatically based on your configured monthly commission slab tier. Calculations activate once client funds/deposits are verified by Super Admin, and payouts reflect under your Commission dashboard.',
    category: 'Commissions',
    target: 'agent',
    priority: 0
  },
  {
    id: 'default-a2',
    question: 'How do I onboard and link new clients to my account?',
    answer: 'Navigate to "My Clients" in the sidebar menu. You can add new client details directly or share your unique agent referral code (e.g. KFPL-AG-1001). Newly registered clients using your code auto-link to your commission portfolio.',
    category: 'Clients & Onboarding',
    target: 'agent',
    priority: 1
  },
  {
    id: 'default-a3',
    question: 'When and how are monthly payout withdrawals processed?',
    answer: 'Payout requests are submitted via the "Withdrawal" section. Super Admin reviews and approves earnings monthly, transferring funds directly to your verified bank account within 2-3 business days.',
    category: 'Payouts',
    target: 'agent',
    priority: 2
  },
  {
    id: 'default-a4',
    question: 'How can I contact YieldIQ Support Desk?',
    answer: 'Visit the "Support" section from your agent menu. You can connect directly with our support desk via WhatsApp, Email, or Phone helpline during advisory operating hours.',
    category: 'Support',
    target: 'both',
    priority: 3
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [helpfulFeedback, setHelpfulFeedback] = useState({});

  useEffect(() => {
    const fetchFAQs = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/api/agent/faqs');
        if (res.success && res.data) {
          const mapped = res.data.map(faq => ({
            id: faq._id,
            question: faq.question,
            answer: faq.answer,
            category: faq.category || 'General',
            target: faq.targetPortal === 'Both Portals (Client & Agent)' ? 'both' :
                    faq.targetPortal === 'Client Dashboard Only' ? 'client' :
                    faq.targetPortal === 'Agent Dashboard Only' ? 'agent' : 'both',
            priority: faq.priority ?? 0
          }));
          mapped.sort((a, b) => a.priority - b.priority);
          setFaqs(mapped.length > 0 ? mapped : defaultFAQs.filter(f => f.target === PORTAL_TYPE || f.target === 'both'));
        } else {
          setFaqs(defaultFAQs.filter(f => f.target === PORTAL_TYPE || f.target === 'both'));
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
        setFaqs(defaultFAQs.filter(f => f.target === PORTAL_TYPE || f.target === 'both'));
      } finally {
        setLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  const categories = ['All', ...new Set(faqs.map(f => f.category || 'General'))];

  const filteredFaqs = faqs.filter(f => {
    const matchesSearch = searchQuery === '' ||
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (f.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFeedback = (id, value) => {
    setHelpfulFeedback(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="kfpl-page" id="agent-faq-page">
      {/* Page Header */}
      <div className="kfpl-page-header" style={{ marginBottom: '20px' }}>
        <div className="kfpl-page-header-left">
          <h1 className="kfpl-page-title">Frequently Asked Questions</h1>
          <p className="kfpl-page-subtitle">Agent guidance on commissions, client referrals, and payout timelines.</p>
        </div>
      </div>

      {/* Hero Banner with Integrated Search */}
      <div style={{
        background: 'linear-gradient(135deg, #052e16 0%, #0f5132 100%)',
        borderRadius: '16px',
        padding: '28px',
        color: '#ffffff',
        boxShadow: '0 8px 24px rgba(5, 46, 22, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: '0 0 6px 0', color: '#ffffff' }}>
            Got questions about agent commissions or payouts?
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.85)', margin: '0 0 20px 0' }}>
            Search questions by keyword or select a category below.
          </p>

          <div style={{ position: 'relative', width: '100%' }}>
            <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search agent questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 40px 12px 44px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer',
                  fontSize: '1.2rem', padding: '2px 6px'
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--color-gold)' : '1px solid var(--color-border, #e2e8f0)',
                  background: isActive ? 'var(--color-gold)' : 'var(--color-surface, #ffffff)',
                  color: isActive ? '#ffffff' : 'var(--color-text-secondary, #64748b)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Accordion FAQ List */}
      {loading ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--color-surface, #ffffff)', borderRadius: '14px',
          border: '1px solid var(--color-border, #e2e8f0)'
        }}>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.875rem' }}>Loading agent guide...</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--color-surface, #ffffff)', borderRadius: '14px',
          border: '1px solid var(--color-border, #e2e8f0)'
        }}>
          <h3 style={{ color: 'var(--color-text-primary, #0f172a)', fontWeight: 700, margin: '0 0 4px 0', fontSize: '1rem' }}>
            No matching questions found
          </h3>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.84rem', margin: 0 }}>
            Try a different search term or category filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                style={{
                  background: 'var(--color-surface, #ffffff)',
                  border: isExpanded ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  boxShadow: isExpanded ? '0 4px 16px rgba(245, 168, 0, 0.08)' : '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isExpanded ? 'rgba(245, 168, 0, 0.15)' : 'var(--color-surface-elevated, #f1f5f9)',
                      color: isExpanded ? 'var(--color-gold)' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      ?
                    </div>

                    <div>
                      <h4 style={{
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        color: isExpanded ? 'var(--color-gold)' : 'var(--color-text-primary, #0f172a)',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        {faq.question}
                      </h4>
                      {faq.category && faq.category !== 'General' && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'inline-block' }}>
                          {faq.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{
                    transition: 'transform 0.25s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    color: isExpanded ? 'var(--color-gold)' : '#94a3b8',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                </div>

                {/* Accordion Expanded Content */}
                {isExpanded && (
                  <div style={{
                    padding: '16px 20px 20px 20px',
                    borderTop: '1px solid var(--color-border, #f1f5f9)',
                    background: 'var(--color-surface-subtle, #f8fafc)'
                  }}>
                    <p style={{
                      margin: 0,
                      color: 'var(--color-text-secondary, #475569)',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {faq.answer}
                    </p>

                    {/* Helpful Feedback Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: '1px dashed var(--color-border, #e2e8f0)',
                      fontSize: '0.78rem',
                      color: '#94a3b8'
                    }}>
                      <span>Was this answer helpful?</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFeedback(faq.id, 'yes'); }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: helpfulFeedback[faq.id] === 'yes' ? 'var(--color-gold)' : '#ffffff',
                            color: helpfulFeedback[faq.id] === 'yes' ? '#ffffff' : '#475569',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> Helpful
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFeedback(faq.id, 'no'); }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: helpfulFeedback[faq.id] === 'no' ? '#ef4444' : '#ffffff',
                            color: helpfulFeedback[faq.id] === 'no' ? '#ffffff' : '#475569',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 1-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg> Not helpful
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Assistance Card */}
      <div style={{
        marginTop: '32px',
        padding: '20px 24px',
        borderRadius: '14px',
        background: 'var(--color-surface, #ffffff)',
        border: '1px solid var(--color-border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--color-text-primary, #0f172a)', margin: '0 0 2px 0' }}>
            Need additional support?
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted, #64748b)', margin: 0 }}>
            Contact our Agent Helpdesk directly via WhatsApp, Email, or Phone helpline.
          </p>
        </div>

        <a href="/support" className="kfpl-btn kfpl-btn-primary kfpl-btn-sm" style={{ fontWeight: '600', display: 'inline-flex' }}>
          Contact Agent Support →
        </a>
      </div>
    </div>
  );
}

/* ============ END: FAQPage.jsx (Agent Portal) ============ */
