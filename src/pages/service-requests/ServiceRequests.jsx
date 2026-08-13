import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../../config/apiHelper';
import { getApiUrl } from '../../config/apiUrl';
import { useToast } from '../../components/ui/Toast';

const statusColors = {
  'Open': 'kfpl-badge--warning',
  'In Progress': 'kfpl-badge--emerald',
  'Resolved': 'kfpl-badge--success',
  'Closed': 'kfpl-badge--muted',
};

const categories = ['Profile Update', 'Nominee Update', 'Commission Query', 'Client Query', 'Reward Issue', 'Withdrawal Issue', 'Other'];

export default function ServiceRequests() {
  const toastHelper = useToast();
  const addToast = typeof toastHelper === 'function' ? toastHelper : (toastHelper?.addToast || (() => {}));
  const location = useLocation();
  const requestDraft = location.state || {};

  const [activeView, setActiveView] = useState(requestDraft.activeView || 'list');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newRequest, setNewRequest] = useState({
    category: requestDraft.category || '',
    subject: requestDraft.subject || '',
    description: '',
  });
  
  const [attachment, setAttachment] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seqMap, setSeqMap] = useState({});
  const fileInputRef = useRef(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/agent/service-requests');
      console.log('Agent Service Requests Raw Data:', data);

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data) {
        if (data.requests && Array.isArray(data.requests)) {
          list = data.requests;
        } else if (data.serviceRequests && Array.isArray(data.serviceRequests)) {
          list = data.serviceRequests;
        } else if (data.data) {
          if (Array.isArray(data.data)) {
            list = data.data;
          } else if (data.data.requests && Array.isArray(data.data.requests)) {
            list = data.data.requests;
          } else if (data.data.serviceRequests && Array.isArray(data.data.serviceRequests)) {
            list = data.data.serviceRequests;
          }
        }
      }

      // Sort chronologically (oldest first) to assign stable sequence numbers starting from SR-101
      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateA - dateB;
      });

      const newSeqMap = {};
      sorted.forEach((sr, idx) => {
        const key = sr._id || sr.id;
        if (key) {
          newSeqMap[key] = `SR-${101 + idx}`;
        }
      });
      setSeqMap(newSeqMap);

      setRequests(list);
      setError(null);
    } catch (err) {
      console.error('Failed to load agent service requests:', err);
      setError('Failed to fetch service requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File size must be less than 5MB', 'danger', 'File Too Large');
        return;
      }
      setAttachment(file);
    }
  };

  const handleRemoveAttachment = (e) => {
    e.stopPropagation();
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newRequest.category || !newRequest.subject || !newRequest.description) return;
    if (newRequest.category === 'Other' && !customTopic.trim()) {
      addToast('Please specify your custom issue topic.', 'danger', 'Custom Topic Required');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('category', newRequest.category);
      const finalSubject = newRequest.category === 'Other' && customTopic ? `[${customTopic.trim()}] ${newRequest.subject}` : newRequest.subject;
      formData.append('subject', finalSubject);
      formData.append('description', newRequest.description);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await apiRequest('/api/agent/service-requests', {
        method: 'POST',
        body: formData,
      });

      addToast('Service request submitted successfully!', 'success', 'Success');
      setNewRequest({ category: '', subject: '', description: '' });
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Reload and return to list view
      await fetchRequests();
      setActiveView('list');
    } catch (err) {
      console.error('Failed to raise service request:', err);
      addToast(err.message || 'Failed to submit service request', 'danger', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAttachmentUrl = (sr) => {
    if (!sr) return null;
    const urlVal = sr.attachmentUrl || sr.attachment || sr.fileUrl || sr.file || sr.filePath;
    if (!urlVal) return null;
    if (typeof urlVal === 'string') return urlVal;
    if (typeof urlVal === 'object') {
      return urlVal.url || urlVal.filePath || urlVal.path || null;
    }
    return null;
  };

  // Generate dynamic timeline fallback if not provided by backend
  const getTimeline = (sr) => {
    const timeline = [];
    const normalizedStatus = (sr.status || 'OPEN').toUpperCase();
    
    // Step 1: Submitted (always present)
    timeline.push({
      date: sr.createdAt || sr.date ? new Date(sr.createdAt || sr.date).toLocaleDateString('en-IN') : 'N/A', 
      title: 'Request Submitted', 
      desc: 'Your request has been received by our support center.' 
    });

    // Step 2: In Progress (if current status is In Progress, Resolved or Closed)
    if (normalizedStatus === 'IN PROGRESS' || normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED') {
      timeline.push({
        date: sr.updatedAt ? new Date(sr.updatedAt).toLocaleDateString('en-IN') : '—', 
        title: 'In Progress', 
        desc: 'Our administration team is reviewing this ticket.' 
      });
    }

    // Step 3: Resolved or Closed (if status is Resolved or Closed)
    if (normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED') {
      timeline.push({
        date: sr.updatedAt ? new Date(sr.updatedAt).toLocaleDateString('en-IN') : '—', 
        title: sr.status || 'Resolved', 
        desc: sr.adminRemarks || sr.adminNote || 'Your ticket has been processed.' 
      });
    }

    return timeline;
  };

  const openCount = requests.filter(r => (r.status || '').toUpperCase() === 'OPEN').length;
  const progressCount = requests.filter(r => (r.status || '').toUpperCase() === 'IN PROGRESS').length;
  const resolvedCount = requests.filter(r => {
    const s = (r.status || '').toUpperCase();
    return s === 'RESOLVED' || s === 'CLOSED';
  }).length;

  const getStatusStyle = (statusStr) => {
    const status = (statusStr || 'OPEN').toUpperCase();
    if (status === 'IN PROGRESS') {
      return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', text: 'In Progress' };
    } else if (status === 'RESOLVED') {
      return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', text: 'Resolved' };
    } else if (status === 'CLOSED') {
      return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', text: 'Closed' };
    }
    return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', text: 'Open' };
  };

  const getDisplayId = (sr) => {
    if (!sr) return 'N/A';
    const key = sr._id || sr.id;
    return seqMap[key] || sr.id || (sr._id ? 'SR-' + sr._id.substring(sr._id.length - 6).toUpperCase() : 'N/A');
  };

  return (
    <div className="kfpl-page animate-fade-slide-up" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ═══ 1. REQUEST LIST VIEW ═══ */}
      {activeView === 'list' && !selectedRequest && (
        <>
          {/* Header section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0, letterSpacing: '-0.5px' }}>
                Support Tickets
              </h1>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                View progress and raise service inquiries to our administrator helpdesk.
              </p>
            </div>
            <button 
              onClick={() => setActiveView('new')}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--color-navy)', 
                color: '#fff', 
                border: 'none', 
                padding: '12px 22px', 
                borderRadius: '8px', 
                fontWeight: 700, 
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(10, 25, 47, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Request
            </button>
          </div>

          {/* ── Status Count Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.5px' }}>Open Tickets</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-navy)', fontWeight: 800 }}>{openCount}</strong>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.5px' }}>In Progress</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-navy)', fontWeight: 800 }}>{progressCount}</strong>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.5px' }}>Resolved / Closed</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-navy)', fontWeight: 800 }}>{resolvedCount}</strong>
              </div>
            </div>
          </div>

          {/* ── Request List ── */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
              Loading service requests...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-danger)', fontWeight: 600 }}>
              {error}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.map((sr) => {
                  const st = getStatusStyle(sr.status);
                  const displayId = getDisplayId(sr);
                  return (
                    <div 
                      key={sr._id || sr.id} 
                      className="kfpl-table-row-hover kfpl-sr-ticket-row"
                      onClick={() => setSelectedRequest(sr)}
                      style={{ 
                        background: '#fff',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '20px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Color Bar Indication */}
                        <div style={{ width: '4px', height: '44px', background: st.color, borderRadius: '4px' }}></div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold-dark)' }}>{displayId}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                              {sr.category}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)' }}>{sr.subject}</h4>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {sr.createdAt || sr.date ? new Date(sr.createdAt || sr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ color: st.color, background: st.bg, padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {st.text}
                        </span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-text-muted)' }}><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </div>
                  );
                })}
              </div>

              {requests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--color-text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 6px 0' }}>No Service Requests</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>You haven't raised any service requests yet.</p>
                  <button 
                    onClick={() => setActiveView('new')} 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      background: 'var(--color-navy)', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '10px 20px', 
                      borderRadius: '8px', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Your First Request
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ 2. REQUEST DETAIL VIEW ═══ */}
      {activeView === 'list' && selectedRequest && (
        <>
          {/* Header section with back button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                <span>Account</span>
                <span>•</span>
                <span>Support Tickets</span>
                <span>•</span>
                <span style={{ color: 'var(--color-gold-dark)' }}>{getDisplayId(selectedRequest)}</span>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0, letterSpacing: '-0.5px' }}>
                Request {getDisplayId(selectedRequest)}
              </h1>
            </div>
            <button 
              className="kfpl-btn" 
              onClick={() => setSelectedRequest(null)}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--color-surface)', 
                border: '1px solid var(--color-border)', 
                color: 'var(--color-text-primary)', 
                padding: '10px 18px', 
                borderRadius: '8px', 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to List
            </button>
          </div>

          <div className="kfpl-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '28px', alignItems: 'start' }}>
            {/* Main details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="kfpl-card" style={{ padding: '28px', borderRadius: '12px', border: '1px solid var(--color-border)', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>Ticket Information</h3>
                  <span className={`kfpl-request-status ${selectedRequest.status.toLowerCase().replace(' ', '-')}`} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {selectedRequest.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 30px', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Category</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-navy)' }}>{selectedRequest.category}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Date Submitted</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-navy)' }}>
                      {selectedRequest.createdAt || selectedRequest.date ? new Date(selectedRequest.createdAt || selectedRequest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-navy)' }}>{selectedRequest.subject}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '24px', background: 'var(--color-surface)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {selectedRequest.description}
                  </p>
                </div>

                {getAttachmentUrl(selectedRequest) && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attachments</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <a 
                        href={getAttachmentUrl(selectedRequest).startsWith('http') ? getAttachmentUrl(selectedRequest) : getApiUrl(getAttachmentUrl(selectedRequest).startsWith('/') ? getAttachmentUrl(selectedRequest) : '/' + getAttachmentUrl(selectedRequest))}
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          color: 'var(--color-gold-dark)', 
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                          padding: '8px 12px',
                          background: 'var(--color-gold-light)',
                          borderRadius: '6px',
                          width: 'fit-content',
                          border: '1px solid rgba(212, 175, 55, 0.2)'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66"/></svg>
                        View Uploaded File
                      </a>
                      {/\.(jpg|jpeg|png|gif|webp)$/i.test(getAttachmentUrl(selectedRequest)) && (
                        <div style={{ marginTop: '4px' }}>
                          <img 
                            src={getAttachmentUrl(selectedRequest).startsWith('http') ? getAttachmentUrl(selectedRequest) : getApiUrl(getAttachmentUrl(selectedRequest).startsWith('/') ? getAttachmentUrl(selectedRequest) : '/' + getAttachmentUrl(selectedRequest))}
                            alt="Attachment Preview"
                            style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '8px', border: '1px solid var(--color-border)', objectFit: 'contain', background: '#f8fafc', padding: '6px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin response */}
              {(selectedRequest.adminRemarks || selectedRequest.adminNote || selectedRequest.remarks) && (
                <div className="kfpl-card" style={{ padding: '24px', borderRadius: '12px', borderLeft: '4px solid var(--color-gold)', background: 'var(--color-gold-light)', borderTop: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-gold-dark)' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gold-dark)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Administrator Response / Remarks</h4>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-navy)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontWeight: 600 }}>
                    {selectedRequest.adminRemarks || selectedRequest.adminNote || selectedRequest.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="kfpl-card" style={{ padding: '28px', borderRadius: '12px', border: '1px solid var(--color-border)', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.03)', position: 'relative' }}>
              <h3 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '2px solid var(--color-gold)', color: 'var(--color-navy)', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 24px 0' }}>
                Status Timeline
              </h3>
              <div style={{ position: 'relative', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Vertical Line */}
                <div style={{ 
                  position: 'absolute', 
                  left: '11px', 
                  top: '8px', 
                  bottom: '8px', 
                  width: '2px', 
                  background: 'linear-gradient(to bottom, #10B981, #F59E0B, #cbd5e1)', 
                  borderRadius: '1px' 
                }} />
                
                {getTimeline(selectedRequest).map((item, idx) => {
                  const isProgress = item.title.toUpperCase() === 'IN PROGRESS';
                  const isResolved = item.title.toUpperCase() === 'RESOLVED' || item.title.toUpperCase() === 'CLOSED';
                  
                  let dotColor = '#10B981';
                  let shadowColor = 'rgba(16, 185, 129, 0.2)';
                  if (isProgress) {
                    dotColor = '#F59E0B';
                    shadowColor = 'rgba(245, 158, 11, 0.2)';
                  } else if (isResolved) {
                    dotColor = '#10B981';
                    shadowColor = 'rgba(16, 185, 129, 0.2)';
                  }
                  
                  return (
                    <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* Glowing Dot */}
                      <div style={{ 
                        position: 'absolute', 
                        left: '-32px', 
                        top: '4px', 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: '#fff', 
                        border: `3px solid ${dotColor}`, 
                        boxShadow: `0 0 0 4px ${shadowColor}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        zIndex: 2
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />
                      </div>
                      
                      {/* Timeline Text */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dotColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.date}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ 3. NEW REQUEST FORM VIEW ═══ */}
      {activeView === 'new' && (
        <>
          {/* Header section with back button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                <span>Account</span>
                <span>•</span>
                <span>Support Tickets</span>
                <span>•</span>
                <span style={{ color: 'var(--color-gold-dark)' }}>New Ticket</span>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0, letterSpacing: '-0.5px' }}>
                New Service Request
              </h1>
            </div>
            <button 
              onClick={() => { setActiveView('list'); setSelectedRequest(null); }}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--color-surface)', 
                border: '1px solid var(--color-border)', 
                color: 'var(--color-text-primary)', 
                padding: '10px 18px', 
                borderRadius: '8px', 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <div className="kfpl-card" style={{ width: '100%', maxWidth: '680px', padding: '32px', borderRadius: '12px', border: '1px solid var(--color-border)', background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-gold)', paddingBottom: '14px', marginBottom: '24px', margin: 0 }}>
                Create Support Ticket
              </h3>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.85rem' }}>Category <span className="required" style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    className="kfpl-form-select" 
                    value={newRequest.category} 
                    onChange={e => setNewRequest({ ...newRequest, category: e.target.value })} 
                    required
                    disabled={submitting}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: '#fff', fontSize: '0.9rem' }}
                  >
                    <option value="">Select a category...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {newRequest.category === 'Other' && (
                  <div className="kfpl-form-group">
                    <label className="kfpl-form-label" style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.85rem' }}>Specify Your Issue / Topic <span className="required" style={{ color: '#ef4444' }}>*</span></label>
                    <input 
                      type="text"
                      className="kfpl-form-input" 
                      placeholder="Describe your custom issue topic..." 
                      value={customTopic} 
                      onChange={e => setCustomTopic(e.target.value)} 
                      required 
                      disabled={submitting}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '0.9rem', background: '#F8FAFC' }}
                    />
                  </div>
                )}

                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.85rem' }}>Subject <span className="required" style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text"
                    className="kfpl-form-input" 
                    placeholder="Brief summary of your request..." 
                    value={newRequest.subject} 
                    onChange={e => setNewRequest({ ...newRequest, subject: e.target.value })} 
                    required 
                    disabled={submitting}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.85rem' }}>Description <span className="required" style={{ color: '#ef4444' }}>*</span></label>
                  <textarea 
                    className="kfpl-form-textarea" 
                    placeholder="Describe your request in detail so we can assist you..." 
                    value={newRequest.description} 
                    onChange={e => setNewRequest({ ...newRequest, description: e.target.value })} 
                    required 
                    disabled={submitting}
                    rows="5"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', resize: 'vertical', fontSize: '0.9rem' }}
                  />
                </div>
                
                <div className="kfpl-form-group">
                  <label className="kfpl-form-label" style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Attachment (Optional)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <div 
                    className="kfpl-file-upload" 
                    onClick={() => !submitting && fileInputRef.current?.click()}
                    style={{ 
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      border: '2px dashed var(--color-border)',
                      borderRadius: '10px',
                      padding: '24px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {attachment ? (
                      <div style={{ width: '100%' }}>
                        <div className="kfpl-file-upload-icon" style={{ color: 'var(--color-gold-dark)', marginBottom: '8px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 36, height: 36, margin: '0 auto' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="kfpl-file-upload-text" style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                          <strong>{attachment.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={handleRemoveAttachment}
                          style={{
                            marginTop: '12px',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 16px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Remove Attachment
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="kfpl-file-upload-icon" style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 36, height: 36, margin: '0 auto' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                        <div className="kfpl-file-upload-text" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          <strong style={{ color: 'var(--color-gold-dark)' }}>Click to upload</strong> or drag and drop files here
                          <div style={{ fontSize: '11px', marginTop: '4px' }}>PDF, DOCX, JPG, PNG up to 5MB</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="kfpl-btn kfpl-btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    background: 'var(--color-navy)', 
                    color: '#fff', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(10, 25, 47, 0.15)',
                    transition: 'all 0.2s'
                  }}
                  disabled={submitting || !newRequest.category || !newRequest.subject || !newRequest.description}
                >
                  {submitting ? 'Submitting Request...' : 'Submit Support Request'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
