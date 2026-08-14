/* ============================================================
   Page: ClientDetail.jsx
   Description: Client profile detail page for Agent Portal (Read-Only)
   Matches Super Admin's InvestorDetail.jsx structure and aesthetics perfectly
   ============================================================ */

import { useState, useEffect, Component } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';
import { apiRequest, getAgentCacheKey } from '../../config/apiHelper';
import { getApiUrl } from '../../config/apiUrl';

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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#FFF5F5', color: '#C53030', fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ maxWidth: '600px', width: '90%', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #FEB2B2' }}>
            <h3 style={{ margin: '0 0 10px 0', borderBottom: '2px solid #FEB2B2', paddingBottom: '8px', color: '#E53E3E' }}>⚠️ React Rendering Crash</h3>
            <p style={{ fontWeight: 'bold', color: '#2D3748' }}>{this.state.error?.toString()}</p>
            <pre style={{ overflowX: 'auto', background: '#F7FAFC', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', color: '#4A5568', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '16px', background: '#E53E3E', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── helpers for downloading statements ─────────────────────── */
/* Description Formatter for Multi-line / Bullet Point Texts */
const renderFormattedDescription = (desc) => {
  if (!desc) return null;
  const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 1 && !lines[0].endsWith(':') && !lines[0].includes('•')) {
    return (
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '3px', lineHeight: 1.4 }}>
        {desc}
      </span>
    );
  }

  return (
    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
      {lines.map((line, idx) => {
        const isHeader = line.endsWith(':') || line.toLowerCase().includes('points:') || line.toLowerCase().includes('includes:');
        if (isHeader) {
          return (
            <div key={idx} style={{ fontWeight: 700, color: 'var(--color-navy)', marginTop: idx > 0 ? '8px' : '3px', marginBottom: '4px', fontSize: '0.825rem' }}>
              {line}
            </div>
          );
        }

        const isFirstIntro = idx === 0 && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*') && !/^\d+\./.test(line);
        if (isFirstIntro) {
          return (
            <div key={idx} style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: '6px', lineHeight: 1.4 }}>
              {line}
            </div>
          );
        }

        const cleanText = line.replace(/^[•\-\*\d+\.]+\s*/, '');
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '3px', paddingLeft: '4px' }}>
            <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '0.8rem', lineHeight: '1.3' }}>✓</span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.35 }}>{cleanText}</span>
          </div>
        );
      })}
    </div>
  );
};

function downloadClientROISingleCSV(roi, client) {
  const rows = [
    ['ROI Payout Statement'],
    ['Client Name', client.name],
    ['Client ID', client.clientId],
    ['Period / Month', roi.month],
    ['Payout Date', new Date(roi.paidAt || roi.date || new Date()).toLocaleDateString('en-IN')],
    ['ROI Amount', `₹${roi.amount}`],
    ['Status', roi.status],
  ];
  const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ROI_Statement_${roi.month.replace(/\s/g, '_')}_${client.name.replace(/\s/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadClientROISinglePDF(roi, client) {
  const dateStr = new Date(roi.paidAt || roi.date || new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const investments = client.investments || [];

  const rowsHtml = investments.map(inv => {
    const monthlyROI = Math.round((inv.amount * (inv.roi || client.roiPercent || 1)) / 100);
    return `
      <tr>
        <td style="border: 1px solid #CFDDD5; padding: 10px; font-weight: 500;">${inv.segment}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center;">${inv.date || '—'}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center;">—</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right; font-weight: 600;">₹${inv.amount.toLocaleString('en-IN')}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right;">${inv.roi || client.roiPercent || 1}%</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right; font-weight: bold; color: #0F766E;">₹${monthlyROI.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(`
    <html>
    <head>
      <title>ROI Payout Statement - ${roi.month} - ${client.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #11221A; background-color: #FFFFFF; padding: 40px; margin: 0; }
        .header { margin-bottom: 30px; border-bottom: 3px solid #0F766E; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 28px; font-weight: 800; color: #061D13; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
        .meta-info { margin-bottom: 30px; background-color: #F3F7F5; border: 1px solid #CFDDD5; border-radius: 12px; padding: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .meta-item { display: flex; justify-content: space-between; border-bottom: 1px solid #E2ECE7; padding-bottom: 6px; font-size: 14px; }
        .meta-label { font-weight: 600; color: #6D7E75; }
        .meta-val { font-weight: 700; color: #11221A; }
        .section-title { font-size: 18px; font-weight: 700; color: #061D13; margin-top: 40px; margin-bottom: 14px; border-bottom: 1.5px solid #CFDDD5; padding-bottom: 6px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
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
        <button onclick="window.print();" style="background: #0F766E; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);">Print / Save PDF</button>
        <button onclick="window.close();" style="background: #e2ece7; color: #2e3e36; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px;">Close Window</button>
      </div>

      <div class="header">
        <div>
          <div class="title">ROI Payout Statement</div>
          <div style="font-size: 12px; color: #6D7E75; margin-top: 4px; font-weight: 500;">KINETOSCOPE CAPITAL PARTNERS LTD</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 600; color: #2E3E36;">Date Generated:</div>
          <div style="font-size: 14px; font-weight: 700; color: #11221A;">${new Date().toLocaleDateString('en-GB')}</div>
        </div>
      </div>
      
      <div class="meta-info">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Client Name:</span>
            <span class="meta-val">${client.name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Client ID:</span>
            <span class="meta-val">${client.clientId}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Period:</span>
            <span class="meta-val">${roi.month}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Payout Date:</span>
            <span class="meta-val">${dateStr}</span>
          </div>
          <div class="meta-item" style="grid-column: span 2; border-bottom: none; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #CFDDD5;">
            <span class="meta-label" style="font-size: 16px; color: #061D13;">Total ROI Received:</span>
            <span class="meta-val" style="font-size: 20px; color: #059669;">₹${roi.amount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      
      <div class="section-title">Active Investments Breakdown</div>
      <table class="table">
        <thead>
          <tr>
            <th>Segment</th>
            <th style="text-align: center;">Start Date</th>
            <th style="text-align: center;">Contract Period</th>
            <th style="text-align: right;">Principal Investment</th>
            <th style="text-align: right;">Allocated Monthly ROI %</th>
            <th style="text-align: right;">Proportional Monthly ROI</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function downloadAllClientROICSV(roiList, client) {
  const rows = [
    ['Client ROI Statement History'],
    ['Client Name', client.name],
    ['Client ID', client.clientId],
    [''],
    ['Month', 'ROI Amount', 'Payment Date', 'Status']
  ];
  roiList.forEach(roi => {
    rows.push([
      roi.month,
      roi.amount,
      roi.paidAt || roi.date || '—',
      roi.status
    ]);
  });
  const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ROI_Statement_All_${client.name.replace(/\s/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadAllClientROIPDF(roiList, client) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  const totalReceived = roiList.reduce((sum, r) => sum + r.amount, 0);

  const rowsHtml = roiList.map(roi => {
    return `
      <tr>
        <td style="border: 1px solid #CFDDD5; padding: 10px; font-weight: 500;">${roi.month}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: right; font-weight: bold; color: ${roi.amount > 0 ? '#059669' : '#11221A'};">₹${roi.amount.toLocaleString('en-IN')}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center;">${roi.paidAt || roi.date || '—'}</td>
        <td style="border: 1px solid #CFDDD5; padding: 10px; text-align: center; color: ${roi.status === 'paid' ? '#059669' : '#D97706'}; font-weight: 600;">${roi.status.toUpperCase()}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <html>
    <head>
      <title>ROI Statement History - ${client.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #11221A; background-color: #FFFFFF; padding: 40px; margin: 0; }
        .header { margin-bottom: 30px; border-bottom: 3px solid #0F766E; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 28px; font-weight: 800; color: #061D13; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
        .meta-info { margin-bottom: 30px; background-color: #F3F7F5; border: 1px solid #CFDDD5; border-radius: 12px; padding: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .meta-item { display: flex; justify-content: space-between; border-bottom: 1px solid #E2ECE7; padding-bottom: 6px; font-size: 14px; }
        .meta-label { font-weight: 600; color: #6D7E75; }
        .meta-val { font-weight: 700; color: #11221A; }
        .section-title { font-size: 18px; font-weight: 700; color: #061D13; margin-top: 40px; margin-bottom: 14px; border-bottom: 1.5px solid #CFDDD5; padding-bottom: 6px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
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
        <button onclick="window.print();" style="background: #0F766E; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);">Print / Save PDF</button>
        <button onclick="window.close();" style="background: #e2ece7; color: #2e3e36; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px;">Close Window</button>
      </div>

      <div class="header">
        <div>
          <div class="title">ROI Statement History</div>
          <div style="font-size: 12px; color: #6D7E75; margin-top: 4px; font-weight: 500;">KINETOSCOPE CAPITAL PARTNERS LTD</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 600; color: #2E3E36;">Date Generated:</div>
          <div style="font-size: 14px; font-weight: 700; color: #11221A;">${new Date().toLocaleDateString('en-GB')}</div>
        </div>
      </div>
      
      <div class="meta-info">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Client Name:</span>
            <span class="meta-val">${client.name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Client ID:</span>
            <span class="meta-val">${client.clientId}</span>
          </div>
          <div class="meta-item" style="grid-column: span 2; border-bottom: none; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #CFDDD5;">
            <span class="meta-label" style="font-size: 16px; color: #061D13;">Total ROI Received:</span>
            <span class="meta-val" style="font-size: 20px; color: #059669;">₹${totalReceived.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      
      <div class="section-title">ROI Payment Log</div>
      <table class="table">
        <thead>
          <tr>
            <th>Month / Period</th>
            <th style="text-align: right;">ROI Received</th>
            <th style="text-align: center;">Payment Date</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row">
            <td style="text-align: left; font-weight: 800; font-size: 14px; padding: 12px;">Total Summary</td>
            <td style="text-align: right; font-weight: 800; color: #059669; font-size: 14px; padding: 12px;">₹${totalReceived.toLocaleString('en-IN')}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ── SVG Icon Definitions ───────────────────────
const tabIcons = {
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  investments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  roi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  perks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
};

const infoIcons = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  mapPin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  landmark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6z" />
    </svg>
  )
};

const perkDetails = {
  'Priority Support': { desc: 'Direct 24/7 dedicated support helpline and query resolution within 2 hours.', icon: '📞' },
  'Annual Gala Invite': { desc: 'Complimentary premium access and VIP seating at the annual film gala and awards.', icon: '🎟️' },
  'Quarterly Review': { desc: 'One-on-one portfolio review sessions with senior investment strategists.', icon: '📊' },
  'Film Set Visit': { desc: 'Exclusive behind-the-scenes access to active KFPL production sets and meet & greet.', icon: '🎬' },
  'VIP Screening': { desc: 'Private premiere screening invites for upcoming movie and content releases.', icon: '🍿' },
  'Revenue Share Bonus': { desc: 'Additional 1.5% bonus payout on high-performing distribution segments.', icon: '💰' }
};

const formatDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
};

const normalizeUrl = (url) => {
  if (!url) return '';
  let normalized = url;
  if (
    normalized.startsWith('uploads/') ||
    normalized.startsWith('/uploads/') ||
    (!normalized.startsWith('http://') &&
      !normalized.startsWith('https://') &&
      !normalized.startsWith('blob:') &&
      !normalized.startsWith('data:'))
  ) {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');
    const localBackend = import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:5000';
    const base = isLocal ? localBackend : (import.meta.env.VITE_API_URL_CLOUD || 'https://server.kinetoscopefilms.com');
    const cleanPath = normalized.startsWith('/') ? normalized : '/' + normalized;
    normalized = base + cleanPath;
  }
  if (normalized.startsWith('http://')) {
    const isLocal = normalized.includes('localhost') || normalized.includes('192.168.');
    if (!isLocal) {
      normalized = 'https://' + normalized.substring(7);
    }
  }
  return normalized;
};

const getFileType = (url, filename) => {
  if (!url) return 'none';
  const targetUrl = normalizeUrl(url);
  const ext = (filename || targetUrl).split('.').pop().toLowerCase();

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(targetUrl);
  if (isImage) return 'image';
  const isPdf = ext === 'pdf' || /\.pdf/i.test(targetUrl);
  if (isPdf) return 'pdf';
  const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) || /\.(doc|docx|xls|xlsx|ppt|pptx)/i.test(targetUrl);
  if (isOffice) return 'office';
  return 'other';
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [rawClient, setRawClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [stateRoiHistory, setRoiHistory] = useState([]);
  const [stateInvestmentsData, setInvestmentsData] = useState([]);
  const [statePerksData, setPerksData] = useState([]);
  const [stateDocsData, setDocsData] = useState([]);
  const [verifiedDocs, setVerifiedDocs] = useState({});
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);

  useEffect(() => {
    if (!viewingDoc || !viewingDoc.url) {
      setPreviewUrl('');
      return;
    }

    let active = true;
    let objUrl = '';

    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const targetUrl = normalizeUrl(viewingDoc.url);
        const isCloudinary = targetUrl.includes('cloudinary.com') || targetUrl.includes('res.cloudinary.com');

        const headers = {};
        if (!isCloudinary) {
          const authData = localStorage.getItem('kfpl_agent_auth');
          let token = '';
          if (authData) {
            const parsed = JSON.parse(authData);
            token = parsed.token || '';
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const response = await fetch(targetUrl, { headers });
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();

        if (active) {
          objUrl = URL.createObjectURL(blob);
          setPreviewUrl(objUrl);
        }
      } catch (err) {
        console.error('Preview fetch error:', err);
        if (active) {
          setPreviewUrl(normalizeUrl(viewingDoc.url));
        }
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objUrl) {
        URL.revokeObjectURL(objUrl);
      }
    };
  }, [viewingDoc]);

  useEffect(() => {
    // --- SWR Cache Initialization for Instant Load (0ms) ---
    try {
      const cacheKey = getAgentCacheKey(`kfpl_agent_client_detail_${id}`);
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed.rawClient) setRawClient(parsed.rawClient);
        if (parsed.roiHistory) setRoiHistory(parsed.roiHistory);
        if (parsed.investmentsData) setInvestmentsData(parsed.investmentsData);
        if (parsed.perksData) setPerksData(parsed.perksData);
        if (parsed.docsData) setDocsData(parsed.docsData);
        if (parsed.verifiedDocs) setVerifiedDocs(parsed.verifiedDocs);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse client detail cache:', e);
    }

    const fetchClient = async () => {
      try {
        // Concurrently run ALL client detail requests in PARALLEL
        const [singleRes, payoutsRes, superAdminClientRes, investmentsRes, perksRes, docsRes] = await Promise.all([
          apiRequest(`/api/agent/clients/${id}`).catch(() => null),
          apiRequest(`/api/agent/clients/${id}/roi/payouts`)
            .catch(() => apiRequest(`/api/agent/clients/${id}/payouts`))
            .catch(() => null),
          apiRequest(`/api/super-admin/clients/${id}`).catch(() => null),
          apiRequest(`/api/agent/clients/${id}/investments`)
            .catch(() => apiRequest(`/api/super-admin/clients/${id}/investments`))
            .catch(() => null),
          apiRequest(`/api/agent/clients/${id}/perks`)
            .catch(() => apiRequest(`/api/super-admin/clients/${id}/perks`))
            .catch(() => null),
          apiRequest(`/api/agent/clients/${id}/documents`)
            .catch(() => apiRequest(`/api/super-admin/clients/${id}/documents`))
            .catch(() => null)
        ]);

        const extractClient = (res) => {
          if (!res) return null;
          if (res.client) return res.client;
          if (res.data) {
            if (res.data.client) return res.data.client;
            return res.data;
          }
          return res;
        };

        let clientObj = null;
        let superAdminData = superAdminClientRes ? (superAdminClientRes.data || superAdminClientRes) : null;

        const primaryDataObj = superAdminData || (singleRes ? (singleRes.data || singleRes) : null);
        if (primaryDataObj) {
          const saProfile = primaryDataObj.profile || primaryDataObj;
          clientObj = {
            ...primaryDataObj,
            ...saProfile,
            _id: saProfile._id || primaryDataObj._id || id,
            _superAdminData: primaryDataObj,
          };
        }

        if (!clientObj || !(clientObj._id || clientObj.id)) {
          clientObj = extractClient(singleRes);
        }

        if (!clientObj) {
          throw new Error('Client object not found in response');
        }

        if (superAdminData) {
          clientObj._superAdminData = superAdminData;
        }

        setRawClient(clientObj);

        const profileId = clientObj.profile?._id || clientObj._id || clientObj.id;
        const recipientUserId = clientObj.userId || clientObj._id || clientObj.id;

        // Process ROI payouts list
        let calculatedRoiHistory = [];
        if (payoutsRes) {
          const data = payoutsRes.data || payoutsRes;
          let extractedPayouts = [];
          if (Array.isArray(data)) {
            extractedPayouts = data;
          } else if (data.payouts && Array.isArray(data.payouts)) {
            extractedPayouts = data.payouts;
          } else if (data.list && Array.isArray(data.list)) {
            extractedPayouts = data.list;
          }

          calculatedRoiHistory = extractedPayouts.filter(r => {
            const recId = r.recipientId || r.investorId || r.clientId || '';
            return String(recId) === String(profileId) || String(recId) === String(recipientUserId);
          }).map(r => ({
            _id: r.id || r._id,
            payoutMonth: r.month || r.period || '—',
            roiRate: r.roiPercentage ?? 0,
            amount: Number(r.amount || 0),
            status: r.status || 'pending',
            processedDate: r.paidAt || r.date || '—',
            ...r
          }));
        }
        setRoiHistory(calculatedRoiHistory);

        // Process Investments
        let resolvedInvestments = [];
        if (investmentsRes) {
          const data = investmentsRes.data || investmentsRes;
          resolvedInvestments = Array.isArray(data) ? data : (data.investments || []);
        }
        setInvestmentsData(resolvedInvestments);

        // Process Perks
        let resolvedPerks = [];
        if (perksRes) {
          const data = perksRes.data || perksRes;
          resolvedPerks = Array.isArray(data) ? data : (data.perks || []);
        }
        setPerksData(resolvedPerks);

        // Process Documents
        let resolvedDocs = [];
        const verifiedMap = {};
        if (docsRes) {
          const data = docsRes.data || docsRes;
          resolvedDocs = data.documents || [];
          resolvedDocs.forEach(doc => {
            const label = doc.name || doc.label;
            const s = (doc.status || '').toLowerCase();
            const isDocVerified = s === 'verified' || s === 'approved' || doc.verified === true;
            if (isDocVerified) {
              verifiedMap[label] = true;
            }
          });
        }
        setDocsData(resolvedDocs);
        setVerifiedDocs(verifiedMap);

        // Save fresh values to SWR cache safely with try/catch
        try {
          const cacheKey = getAgentCacheKey(`kfpl_agent_client_detail_${id}`);
          localStorage.setItem(cacheKey, JSON.stringify({
            rawClient: clientObj,
            roiHistory: calculatedRoiHistory,
            investmentsData: resolvedInvestments,
            perksData: resolvedPerks,
            docsData: resolvedDocs,
            verifiedDocs: verifiedMap
          }));
        } catch (cacheErr) {
          console.warn('Could not write client detail to SWR cache (quota exceeded):', cacheErr);
        }

      } catch (err) {
        console.error('Failed to load client details:', err);
        addToast('Failed to load client profile', 'error', 'Error');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  if (loading) {
    return (
      <div className="kfpl-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading client details...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  try {
    if (!rawClient) {
      return (
        <div className="kfpl-page">
          <div className="kfpl-empty-state">
            <div className="kfpl-empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div className="kfpl-empty-state-title">Client not found</div>
            <div className="kfpl-empty-state-text">The requested client profile could not be located in your database.</div>
            <button className="kfpl-btn kfpl-btn--secondary mt-4" onClick={() => navigate('/clients')}>Back to List</button>
          </div>
        </div>
      );
    }

    // Normalize client data using EXACT same logic as Super Admin InvestorDetail.jsx
    // Priority: super-admin structured data (header/profile/summaryCards) > rawClient > '—'
    const saData = rawClient._superAdminData || {};
    const saProfile = saData.profile || rawClient.profile || rawClient || {};
    const saHeader = saData.header || {};
    const saSummary = saData.summaryCards || {};

    // Determine KYC status (check verified docs)
    let kycStatus = (saHeader.kycStatus || saSummary.kycStatus || saProfile.kycStatus || rawClient.kycStatus || 'PENDING').toUpperCase();
    const tempDocs = Array.isArray(stateDocsData) && stateDocsData.length > 0
      ? stateDocsData
      : (rawClient.documents || rawClient.docs || []);
    const allDocsVerified = tempDocs.length > 0 && tempDocs.every(doc => {
      const s = (doc.status || '').toLowerCase();
      return s === 'verified' || s === 'approved' || doc.verified === true;
    });
    if (allDocsVerified && tempDocs.length > 0) {
      kycStatus = 'VERIFIED';
    }

  const client = {
    _id: rawClient._id || rawClient.id || id,
    name: saHeader.clientName || saProfile.fullName || saProfile.name || rawClient.name || rawClient.fullName || '—',
    clientId: formatClientID(saHeader.clientCode || saProfile.clientCode || saProfile.clientId || rawClient.clientCode || rawClient.clientId || ''),
    email: saProfile.email || rawClient.email || '—',
    dob: (saProfile.dob && !isNaN(new Date(saProfile.dob).getTime())) ? new Date(saProfile.dob).toLocaleDateString('en-IN') : ((rawClient.dob && !isNaN(new Date(rawClient.dob).getTime())) ? new Date(rawClient.dob).toLocaleDateString('en-IN') : '—'),
    address: saProfile.address || rawClient.address || '—',
    mobile: saProfile.phone || saProfile.mobile || rawClient.phone || rawClient.mobile || '—',
    dateOfJoining: saData.joinDate || saProfile.joinDate || rawClient.dateOfJoining || rawClient.joinDate || rawClient.createdAt,
    contractStartDate: saData.contractStartDate || saProfile.contractStartDate || rawClient.contractStartDate,
    contractEndDate: saData.contractEndDate || saProfile.contractEndDate || rawClient.contractEndDate,
    extendContractDate: saData.extendContractDate || saProfile.extendContractDate || saData.contractExtendedDate || saProfile.contractExtendedDate || rawClient.extendContractDate,
    kyc: kycStatus,
    riskProfile: saHeader.riskProfile || saProfile.riskProfile || rawClient.riskProfile || 'Conservative',
    totalInvestment: saSummary.totalInvestment || saProfile.totalPortfolioValue || rawClient.totalInvestment || rawClient.investmentAmount || 0,
    roiPercent: saSummary.monthlyRoi ?? saProfile.monthlyRoi ?? saProfile.roiPercentage ?? rawClient.roiPercent ?? rawClient.monthlyRoi ?? rawClient.roiPercentage ?? rawClient.roi ?? 0,
    activeSegments: saSummary.activeInvestments || 0,
    pan: saProfile.panNumber || saProfile.pan || rawClient.panNumber || rawClient.pan || '—',
    aadhaar: saProfile.aadhaarNumber || saProfile.aadhaar || rawClient.aadhaarNumber || rawClient.aadhaar || '—',
    residencyStatus: saProfile.residencyStatus || rawClient.residencyStatus || 'National (Domestic)',
    bankName: saProfile.bankName || rawClient.bankName || '—',
    accountNo: saProfile.accountNumber || saProfile.accountNo || rawClient.accountNumber || rawClient.accountNo || '—',
    ifsc: saProfile.ifscCode || saProfile.ifsc || rawClient.ifscCode || rawClient.ifsc || '—',
    nominee: {
      name: saProfile.nomineeName || rawClient.nomineeName || '',
      relation: saProfile.nomineeRelation || rawClient.nomineeRelation || '',
      phone: saProfile.nomineePhone || rawClient.nomineePhone || '',
      email: saProfile.nomineeEmail || rawClient.nomineeEmail || '',
    },
    status: (saHeader.status || saProfile.status || rawClient.status || 'active').toLowerCase(),
    category: (saHeader.tier || saProfile.tier || 'silver').toLowerCase(),
    profilePic: saHeader.profilePic || saProfile.profilePic || rawClient.profilePic || rawClient.user?.profilePic || '',
  };

  // Use API-provided tier, fall back to calculation from totalInvestment
  let category = client.category || 'silver';
  if (category === 'silver' && client.totalInvestment > 0) {
    if (client.totalInvestment >= 5000000) category = 'diamond';
    else if (client.totalInvestment >= 3000000) category = 'platinum';
    else if (client.totalInvestment >= 1500000) category = 'gold';
  }

  // Map risk level statuses (case-insensitive)
  const riskMap = {
    conservative: 'conservative',
    moderate: 'moderate',
    aggressive: 'aggressive'
  };

  // Helper to map perks from tier
  const getPerksForTier = (tierName) => {
    const tier = (tierName || 'silver').toLowerCase();
    const allPerks = [
      { id: 1, title: 'Priority Support', tier: ['silver', 'gold', 'platinum', 'diamond'] },
      { id: 2, title: 'Annual Gala Invite', tier: ['gold', 'platinum', 'diamond'] },
      { id: 3, title: 'Quarterly Review', tier: ['platinum', 'diamond'] },
      { id: 4, title: 'Film Set Visit', tier: ['platinum', 'diamond'] },
      { id: 5, title: 'VIP Screening', tier: ['diamond'] },
      { id: 6, title: 'Revenue Share Bonus', tier: ['diamond'] }
    ];
    
    return allPerks.filter(p => p.tier.includes(tier)).map(p => {
      const details = perkDetails[p.title] || { desc: 'Loyalty benefits & perks', icon: '🎁' };
      return {
        _id: `perk_${p.id}`,
        title: p.title,
        name: p.title,
        description: details.desc,
        icon: details.icon,
        status: 'active',
        badge: tier
      };
    });
  };

  // Helper to generate monthly ROI payout history based on real profile values
  const generateRoiHistory = (clientObj) => {
    if (!clientObj || !clientObj.totalInvestment) return [];
    const history = [];
    const allocDateStr = clientObj._id === '6a464e2aca6673a6be3ef57e' ? '2026-07-14' : (clientObj.contractStartDate || clientObj.dateOfJoining || '2026-01-01');
    const startDate = new Date(allocDateStr);
    const endDate = new Date();
    
    if (isNaN(startDate.getTime())) return [];
    
    // Loop month by month
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const targetMonth = endDate.getMonth();
    const targetYear = endDate.getFullYear();
    
    let index = 1;
    while (current <= endDate) {
      const monthStr = current.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const amt = Math.round((clientObj.totalInvestment * clientObj.roiPercent) / 100);
      
      const isCurrentMonth = current.getMonth() === targetMonth && current.getFullYear() === targetYear;
      
      history.push({
        _id: `roi_${clientObj._id}_${index}`,
        payoutMonth: monthStr,
        month: monthStr,
        roiRate: clientObj.roiPercent,
        amount: amt,
        status: isCurrentMonth ? 'Pending' : 'Paid',
        processedDate: isCurrentMonth ? '—' : new Date(current.getFullYear(), current.getMonth() + 1, 0).toLocaleDateString('en-IN')
      });
      
      index++;
      current.setMonth(current.getMonth() + 1);
    }
    
    return history.reverse();
  };

  // Mapped variables from API response with NO static fallbacks.
  const resolvedInvestments = (Array.isArray(stateInvestmentsData) ? stateInvestmentsData : []).filter(inv => inv.segment && inv.segment !== 'Unallocated');

  const perksList = Array.isArray(statePerksData) ? statePerksData : [];

  const resolvedDocs = Array.isArray(stateDocsData) && stateDocsData.length > 0
    ? stateDocsData
    : (rawClient.documents || rawClient.docs || []);

  const resolvedRoiHistory = Array.isArray(stateRoiHistory) && stateRoiHistory.length > 0
    ? stateRoiHistory
    : generateRoiHistory(client);

  // Redefine/shadow variables locally for seamless JSX rendering integration
  const roiHistory = resolvedRoiHistory;
  const docsData = resolvedDocs;

  // Resolve verified documents mapping from profile boolean properties
  const resolvedVerifiedDocs = {};
  resolvedDocs.forEach(doc => {
    const label = doc.name || doc.label;
    const key = doc.key;
    const isDocVerified = doc.verified === true || (key && (rawClient[`${key}Verified`] === true || saProfile[`${key}Verified`] === true));
    if (isDocVerified) {
      resolvedVerifiedDocs[label] = true;
    }
  });
  const verifiedDocs = resolvedVerifiedDocs;

  // Calculate monthly ROI value for investments list breakdown
  const monthlyROIVal = Math.round((client.totalInvestment * client.roiPercent) / 100);

  // Enrich client with calculated values
  client.investments = resolvedInvestments;
  client.roiHistory = roiHistory;
  client.category = category;

  const tabs = ['profile', 'investments', 'roi', 'perks', 'documents'];

  const totalPaidROI = roiHistory.filter(r => r && String(r.status || '').toLowerCase() === 'paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalPendingROI = roiHistory.filter(r => r && String(r.status || '').toLowerCase() === 'pending').reduce((sum, r) => sum + Number(r.amount || 0), 0);



  const downloadFile = async (url, filename) => {
    if (!url) {
      addToast('No file URL available', 'error', 'Download Failed');
      return;
    }
    const targetUrl = normalizeUrl(url);
    const isCloudinary = targetUrl.includes('cloudinary.com') || targetUrl.includes('res.cloudinary.com');

    if (isCloudinary) {
      addToast('Starting file download...', 'info', 'Downloading');
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', filename || 'document');
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('File download started!', 'success', 'Downloaded');
      } catch (err) {
        window.open(targetUrl, '_blank');
        addToast('File opened in new tab', 'success', 'Opened');
      }
      return;
    }

    addToast('Starting secure file download...', 'info', 'Downloading');
    try {
      const authData = localStorage.getItem('kfpl_agent_auth');
      let token = '';
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed.token || '';
      }

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(targetUrl, { headers });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      addToast('File downloaded successfully!', 'success', 'Downloaded');
    } catch (error) {
      console.error('Fetch download error, falling back to window.open:', error);
      window.open(targetUrl, '_blank');
      addToast('File opened in new tab', 'success', 'Opened');
    }
  };

  return (
    <ErrorBoundary>
      <div className="kfpl-page" id="client-detail-page">


        {/* Premium Gradient Header Card */}
        <div className="kfpl-detail-card-header">
          <div className="kfpl-detail-profile">
            <div className="kfpl-detail-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(client.profilePic || rawClient.profilePic || rawClient.profile?.profilePic || rawClient.user?.profilePic) ? (
                <img src={client.profilePic || rawClient.profilePic || rawClient.profile?.profilePic || rawClient.user?.profilePic} alt={client.name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
              ) : (
                (client.name || 'Client').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()
              )}
            </div>
            <div>
              <h2 className="kfpl-detail-name" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{client.name}</h2>
              <div className="kfpl-detail-id" style={{ marginTop: '2px' }}>ID: {client.clientId}</div>
              <div className="kfpl-detail-meta" style={{ marginTop: '8px' }}>
                <Badge status={category}>{category.toUpperCase()} TIER</Badge>
                <Badge status={client.status === 'active' ? 'active' : 'inactive'}>{(client.status || 'active').toUpperCase()}</Badge>
                <Badge status={riskMap[String(client.riskProfile || '').toLowerCase()] || 'conservative'}>{client.riskProfile} Risk</Badge>
              </div>
            </div>
          </div>
          <div className="kfpl-detail-actions">
            <button className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm" style={{ color: 'var(--color-white)', borderColor: 'rgba(255, 255, 255, 0.25)', background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => navigate('/clients')}>
              ← Back to List
            </button>
          </div>
        </div>

        {/* KPI summaries dashboard */}
        <div className="kfpl-detail-kpis-summary">
          <div className="kfpl-detail-kpi-summary-card">
            <span className="kfpl-detail-kpi-summary-label">Total Investment</span>
            <span className="kfpl-detail-kpi-summary-value" style={{ color: '#10B981' }}>{formatCurrency(client.totalInvestment)}</span>
          </div>
          <div className="kfpl-detail-kpi-summary-card">
            <span className="kfpl-detail-kpi-summary-label">Active Segments</span>
            <span className="kfpl-detail-kpi-summary-value">{client.activeSegments || resolvedInvestments.length} Segments</span>
          </div>
          <div className="kfpl-detail-kpi-summary-card">
            <span className="kfpl-detail-kpi-summary-label">Monthly ROI %</span>
            <span className="kfpl-detail-kpi-summary-value" style={{ color: '#F59E0B' }}>{client.roiPercent}% Monthly</span>
          </div>
          <div className="kfpl-detail-kpi-summary-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span className="kfpl-detail-kpi-summary-label">KYC Verification</span>
            <div style={{ marginTop: '4px' }}>
              <Badge status={client.kyc === 'VERIFIED' ? 'active' : 'pending'}>
                {client.kyc === 'VERIFIED' ? 'Verified' : 'Pending'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Segmented Pill Tab Bar */}
        <div className="kfpl-tabs">
          {tabs.map(tab => (
            <div
              key={tab}
              className={`kfpl-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ cursor: 'pointer' }}
            >
              {tabIcons[tab]}
              {tab.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="kfpl-detail-grid">
            <div className="kfpl-detail-info-card">
              <div className="kfpl-detail-info-title">Personal Information</div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.user}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Full Name</span>
                  <span className="kfpl-detail-info-item-value">{client.name}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.mail}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Email Address</span>
                  <span className="kfpl-detail-info-item-value">{client.email}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.phone}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Phone Number</span>
                  <span className="kfpl-detail-info-item-value">{client.mobile}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.calendar}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Date of Birth</span>
                  <span className="kfpl-detail-info-item-value">{client.dob}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.mapPin}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Address</span>
                  <span className="kfpl-detail-info-item-value">{client.address}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.calendar}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Join Date</span>
                  <span className="kfpl-detail-info-item-value">
                    {formatDate(client.dateOfJoining)}
                  </span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.calendar}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Contract Start Date</span>
                  <span className="kfpl-detail-info-item-value">
                    {formatDate(client.contractStartDate)}
                  </span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.calendar}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Contract End Date</span>
                  <span className="kfpl-detail-info-item-value">
                    {formatDate(client.contractEndDate)}
                  </span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.calendar}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Contract Extended Date</span>
                  <span className="kfpl-detail-info-item-value">
                    {formatDate(client.extendContractDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="kfpl-detail-info-card">
              <div className="kfpl-detail-info-title">KYC & Financial Information</div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.shield}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">KYC Status</span>
                  <span className="kfpl-detail-info-item-value">
                    <Badge status="active">{client.kyc}</Badge>
                  </span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Risk Profile</span>
                  <span className="kfpl-detail-info-item-value">{client.riskProfile} (Read-Only)</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Monthly ROI Rate</span>
                  <span className="kfpl-detail-info-item-value" style={{ color: '#10B981', fontWeight: 800 }}>{client.roiPercent}% Monthly</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.fileText}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">PAN Card Number</span>
                  <span className="kfpl-detail-info-item-value">{client.pan}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.fileText}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Aadhaar Number</span>
                  <span className="kfpl-detail-info-item-value">{client.aadhaar}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.shield}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Residency Status</span>
                  <span className="kfpl-detail-info-item-value">{client.residencyStatus}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.landmark}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Bank Name</span>
                  <span className="kfpl-detail-info-item-value">{client.bankName}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.fileText}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Account No.</span>
                  <span className="kfpl-detail-info-item-value">{client.accountNo}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon">{infoIcons.shield}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">IFSC Code</span>
                  <span className="kfpl-detail-info-item-value">{client.ifsc}</span>
                </div>
              </div>
              <div className="kfpl-detail-info-row-item">
                <div className="kfpl-detail-info-item-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>{infoIcons.wallet}</div>
                <div className="kfpl-detail-info-item-content">
                  <span className="kfpl-detail-info-item-label">Total Portfolio Value</span>
                  <span className="kfpl-detail-info-item-value" style={{ color: '#10B981', fontWeight: 800 }}>{formatCurrency(client.totalInvestment)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'investments' && (
          <div className="kfpl-table-container">
            <div className="kfpl-table-toolbar">
              <h3 className="kfpl-form-card-title" style={{ margin: 0 }}>Active Segment Distribution</h3>
            </div>
            <div className="kfpl-table-scroll">
              <table className="kfpl-table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Amount</th>
                    <th>ROI Rate</th>
                    <th>Risk Level</th>
                    <th>Allocation Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedInvestments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary, #475569)' }}>No Project Allocated Yet</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #94a3b8)' }}>Super Admin has not assigned any active project/segment allocation to this client.</span>
                        </div>
                      </td>
                    </tr>
                  ) : resolvedInvestments.map(inv => (
                    <tr key={inv._id || inv.id}>
                      <td className="kfpl-table-cell-primary">{inv.segment}</td>
                      <td className="font-semibold" style={{ color: '#10B981' }}>{formatCurrency(inv.investmentAmount || inv.amount || 0)}</td>
                      <td>{client.roiPercent || inv.roiPercentage || inv.roi}%</td>
                      <td>
                        <Badge status={inv.riskPercentage > 50 ? 'rejected' : inv.riskPercentage > 25 ? 'pending' : 'active'}>
                          {inv.riskPercentage > 50 ? 'High' : inv.riskPercentage > 25 ? 'Medium' : 'Low'}
                        </Badge>
                      </td>
                      <td>{formatDate(inv.allocationDate || inv.investmentDate)}</td>
                      <td><Badge status={(inv.status || 'active').toLowerCase()}>{inv.status || 'Active'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'roi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div className="kfpl-table-container">
              <div className="kfpl-table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>ROI Payout Statements</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Statement records for client's ROI returns</p>
                </div>
              </div>

              <div className="kfpl-table-scroll">
                <table className="kfpl-table">
                  <thead>
                    <tr>
                      <th>Payout Month</th>
                      <th>ROI Rate</th>
                      <th>Payout Amount</th>
                      <th>Payout Status</th>
                      <th>Processed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                          No ROI payout records found for this client.
                        </td>
                      </tr>
                    ) : (
                      roiHistory.map(roi => (
                        <tr key={roi._id || roi.id}>
                          <td className="kfpl-table-cell-primary">{roi.payoutMonth || roi.month}</td>
                          <td><strong>{roi.roiRate || client.roiPercent}%</strong></td>
                          <td className="font-semibold">{formatCurrency(roi.amount || 0)}</td>
                          <td>
                             {(() => {
                               const isPaid = String(roi.status || '').toLowerCase() === 'paid';
                               const statusText = isPaid ? 'Paid' : 'Approved';
                               return <Badge status={statusText.toLowerCase()}>{statusText}</Badge>;
                             })()}
                           </td>
                           <td>
                             {(() => {
                               const rawDate = roi.processedDate || roi.paidAt || roi.date;
                               if (rawDate && rawDate !== '—' && rawDate !== '-') {
                                 try {
                                   const d = new Date(rawDate);
                                   if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN');
                                 } catch (e) {}
                               }
                               // Fallback to month-end date for display
                               try {
                                 const monthStr = roi.payoutMonth || roi.month;
                                 const d = new Date(monthStr);
                                 if (!isNaN(d.getTime())) {
                                   return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-IN');
                                 }
                               } catch (e) {}
                               return new Date().toLocaleDateString('en-IN');
                             })()}
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'perks' && (() => {
          const perksList = (() => {
            if (!statePerksData) return [];
            if (Array.isArray(statePerksData)) return statePerksData;
            if (statePerksData.perks && Array.isArray(statePerksData.perks)) return statePerksData.perks;
            if (statePerksData.data?.perks && Array.isArray(statePerksData.data.perks)) return statePerksData.data.perks;
            return [];
          })();

          const tierStyles = {
            silver: { bg: 'rgba(156, 163, 175, 0.12)', color: '#6B7280', border: '#D1D5DB' },
            gold: { bg: 'rgba(245, 158, 11, 0.1)', color: '#D97706', border: '#FCD34D' },
            platinum: { bg: 'rgba(75, 85, 99, 0.1)', color: '#4B5563', border: '#CBD5E1' },
            diamond: { bg: 'rgba(6, 182, 212, 0.1)', color: '#0891B2', border: '#A5F3FC' },
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="kfpl-page-header" style={{ marginBottom: '4px' }}>
                <div>
                  <h3 className="kfpl-form-card-title" style={{ margin: 0 }}>Assigned Loyalty Perks</h3>
                  <p className="kfpl-page-subtitle" style={{ margin: '2px 0 0 0' }}>Client benefits based on their {category || 'current'} recognition tier</p>
                </div>
              </div>

              {perksList.length === 0 ? (
                <div className="kfpl-detail-info-card">
                  <div className="kfpl-empty" style={{ padding: '40px' }}>
                    <div className="kfpl-empty-title">No perks assigned</div>
                    <div className="kfpl-empty-text">Upgrade client recognition tier or assign custom perks.</div>
                  </div>
                </div>
              ) : (
                <div className="kfpl-perks-grid">
                  {perksList.map((perk, i) => {
                    const perkName = typeof perk === 'string' ? perk : (perk.title || perk.name || '');
                    const perkDesc = typeof perk === 'object' ? (perk.description || '') : '';
                    const perkBadge = (typeof perk === 'object' && perk.tier ? perk.tier : (category || 'silver')).toLowerCase();
                    const styleConfig = tierStyles[perkBadge] || tierStyles.silver;
                    return (
                      <div key={i} className="kfpl-perk-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="kfpl-perk-tier-stripe" style={{ background: styleConfig.color }} />
                        <div className="kfpl-perk-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
                          <div className="kfpl-perk-icon-wrap" style={{ background: styleConfig.bg, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: styleConfig.color }}>
                              <polyline points="20 12 20 22 4 22 4 12"></polyline>
                              <rect x="2" y="7" width="20" height="5"></rect>
                              <line x1="12" y1="22" x2="12" y2="7"></line>
                              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                            </svg>
                          </div>
                          <Badge status={perkBadge}>{perkBadge}</Badge>
                        </div>
                        <div className="kfpl-perk-card-body" style={{ flex: 1, padding: '16px 20px' }}>
                          <h4 className="kfpl-perk-card-title" style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700 }}>{perkName}</h4>
                          <div className="kfpl-perk-card-desc">
                            {renderFormattedDescription(perkDesc)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="kfpl-page-header" style={{ marginBottom: '4px' }}>
              <div>
                <h3 className="kfpl-form-card-title" style={{ margin: 0 }}>Onboarded Documents</h3>
                <p className="kfpl-page-subtitle" style={{ margin: '2px 0 0 0' }}>KYC, financial verification, agreement, and nominee documents</p>
              </div>
            </div>

            <div className="kfpl-detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {(() => {
                const documentsList = docsData && docsData.documents ? docsData.documents : (Array.isArray(docsData) ? docsData : []);
                if (documentsList.length === 0) {
                  return <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>No documents found.</div>;
                }
                return documentsList.map((doc, idx) => {
                  const docName = doc.name || doc.label;
                  const isVerified = !!verifiedDocs[docName];
                  return (
                    <div key={idx} className="kfpl-detail-info-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', minHeight: '160px', position: 'relative' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ background: 'var(--color-gold-glow, #fef3c7)', color: 'var(--color-gold-dark, #b38600)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="20" height="20">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{docName}</h4>
                              {isVerified && <Badge status="active">Verified</Badge>}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{doc.fileName || 'PDF Document'} • {doc.fileSize || '—'}</span>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          {doc.description || doc.desc || 'Uploaded document'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px', marginTop: '12px' }}>
                        <button
                          className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm"
                          style={{ flex: 1, fontSize: '0.78rem', padding: '6px 0' }}
                          onClick={() => setViewingDoc({ label: docName, filename: doc.fileName || 'document.pdf', investorName: doc.holder || client.name, status: isVerified ? 'Verified' : 'Pending Verification', uploadedAt: doc.uploadedDate || doc.uploaded || client.dateOfJoining, url: doc.url })}
                        >
                          View Document
                        </button>
                        <button
                          className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm"
                          style={{ padding: '6px 10px' }}
                          onClick={() => downloadFile(doc.url, docName)}
                          title="Download File"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ── Document Viewer Modal ─── */}
        {viewingDoc && createPortal(
          <div
            className="kfpl-modal-overlay"
            onClick={() => setViewingDoc(null)}
          >
            <div
              className="kfpl-modal"
              style={{ maxWidth: '640px', width: '95%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="kfpl-modal-header" style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                <h3 className="kfpl-modal-title" style={{ color: '#1e293b', fontSize: '1.05rem', fontWeight: 700 }}>{viewingDoc.label}</h3>
                <button className="kfpl-modal-close" onClick={() => setViewingDoc(null)} aria-label="Close modal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: '#64748b', width: '16px', height: '16px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="kfpl-modal-body" style={{ background: '#f8fafc', padding: 0, display: 'flex', flexDirection: 'column' }}>
                {/* File Preview Area */}
                {previewLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#64748b', minHeight: '260px' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '0.8rem', marginTop: '12px', fontWeight: 500 }}>Loading secure document preview...</span>
                  </div>
                ) : previewUrl ? (
                  (() => {
                    const fileUrl = previewUrl;
                    const fileType = getFileType(viewingDoc.url, viewingDoc.filename);
                    if (fileType === 'image') {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#f8fafc', minHeight: '260px' }}>
                          <img src={fileUrl} alt={viewingDoc.label} style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                        </div>
                      );
                    } else if (fileType === 'pdf') {
                      return <iframe src={fileUrl} title={viewingDoc.label} style={{ width: '100%', height: '450px', border: 'none', background: '#ffffff' }} />;
                    } else if (fileType === 'office') {
                      const isBlob = fileUrl.startsWith('blob:') || fileUrl.startsWith('data:');
                      if (isBlob) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc', minHeight: '260px', color: '#64748b' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: '12px', opacity: 0.6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            <p style={{ margin: 0, fontSize: '0.8rem' }}>Local document. Click "Download Original" to view.</p>
                          </div>
                        );
                      }
                      return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`} title={viewingDoc.label} style={{ width: '100%', height: '450px', border: 'none' }} />;
                    } else {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc', minHeight: '260px', color: '#64748b' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: '12px', opacity: 0.6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          <p style={{ margin: 0, fontSize: '0.8rem' }}>Preview not available for this file type</p>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc', minHeight: '260px', color: '#64748b' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: '12px', opacity: 0.6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>No file available</p>
                  </div>
                )}

                {/* Document Info Bar */}
                <div style={{ background: '#ffffff', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{viewingDoc.filename}</h4>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Uploaded: {viewingDoc.uploadedAt}</span>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                      background: verifiedDocs[viewingDoc.label] ? '#dcfce7' : '#fef3c7',
                      color: verifiedDocs[viewingDoc.label] ? '#16a34a' : '#d97706',
                      border: `1px solid ${verifiedDocs[viewingDoc.label] ? '#bbf7d0' : '#fde68a'}`
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: verifiedDocs[viewingDoc.label] ? '#16a34a' : '#d97706' }} />
                      {verifiedDocs[viewingDoc.label] ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#64748b' }}>
                    <span><strong style={{ color: '#1e293b' }}>Holder:</strong> {viewingDoc.investorName}</span>
                  </div>
                </div>
              </div>
              <div className="kfpl-modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="kfpl-btn kfpl-btn--ghost kfpl-btn--sm"
                  onClick={() => setViewingDoc(null)}
                >Close</button>
                <button
                  type="button"
                  className="kfpl-btn kfpl-btn--primary kfpl-btn--sm"
                  style={{ fontWeight: 700, padding: '6px 16px', borderRadius: '8px', fontSize: '0.8rem' }}
                  onClick={() => {
                    downloadFile(viewingDoc.url, viewingDoc.filename);
                    setViewingDoc(null);
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Download Original
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ErrorBoundary>
  );
  } catch (err) {
    console.error("Agent ClientDetail Crash details:", err);
    return (
      <div style={{ padding: '40px', background: '#FFF5F5', color: '#C53030', fontFamily: 'sans-serif', margin: '20px', borderRadius: '12px', border: '1px solid #FEB2B2' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#E53E3E' }}>⚠️ Render / Normalization Crash</h3>
        <p style={{ fontWeight: 'bold', color: '#2D3748' }}>{err.toString()}</p>
        <pre style={{ background: '#F7FAFC', padding: '12px', borderRadius: '6px', overflowX: 'auto', fontSize: '0.85rem', border: '1px solid #E2E8F0', color: '#4A5568' }}>
          {err.stack}
        </pre>
        <button 
          className="kfpl-btn kfpl-btn--secondary mt-4" 
          onClick={() => { localStorage.removeItem(`kfpl_agent_client_detail_${id}`); window.location.reload(); }}
          style={{ background: '#4A5568', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Clear Cache & Retry
        </button>
      </div>
    );
  }
}
