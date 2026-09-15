/* ============================================================
   Utility: realtimeSync.js (Agent Portal)
   Description: Native Server-Sent Events (SSE) listener for
                instant real-time updates across portals without refresh.
   ============================================================ */

import { getApiUrl } from '../config/apiUrl';
import { getAgentCacheKey } from '../config/apiHelper';
import { invalidateSWRCache } from './swrHelper';

let eventSource = null;
let reconnectTimer = null;

export function initRealtimeSync() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

  const url = getApiUrl('/api/realtime/stream');

  try {
    eventSource = new EventSource(url);

    eventSource.addEventListener('connected', () => {
      // Handshake connected
    });

    eventSource.addEventListener('DATA_UPDATED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        handleRealtimeUpdate(payload);
      } catch (err) {
        console.warn('[RealtimeSync:Agent] Parse error:', err);
      }
    });

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          initRealtimeSync();
        }, 5000);
      }
    };
  } catch (err) {
    console.warn('[RealtimeSync:Agent] Init error:', err);
  }

  // Cross-tab broadcast channel
  try {
    const bc = new BroadcastChannel('yieldiq_realtime_channel');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'DATA_UPDATED') {
        handleRealtimeUpdate(event.data.payload, false);
      }
    };
  } catch {}
}

export function handleRealtimeUpdate(payload, propagate = true) {
  // 1. Invalidate relevant SWR & local agent caches
  invalidateSWRCache('ag_dashboard');
  invalidateSWRCache('ag_clients');
  invalidateSWRCache('ag_commissions');

  try {
    const dashKey = getAgentCacheKey('kfpl_dashboard_cache');
    const clientsKey = getAgentCacheKey('kfpl_agent_clients_cache');
    const commsKey = getAgentCacheKey('kfpl_agent_commission_cache');
    const profKey = getAgentCacheKey('kfpl_agent_profile_cache');
    localStorage.removeItem(dashKey);
    localStorage.removeItem(clientsKey);
    localStorage.removeItem(commsKey);
    localStorage.removeItem(profKey);

    if (payload.clientId) {
      const detailKey = getAgentCacheKey(`kfpl_agent_client_detail_${payload.clientId}`);
      localStorage.removeItem(detailKey);
    }
  } catch (e) {
    console.warn('[RealtimeSync:Agent] Cache invalidation error:', e);
  }

  // 2. Dispatch custom window events so active components re-fetch instantly
  window.dispatchEvent(new CustomEvent('yieldiq_data_updated', { detail: payload }));
  window.dispatchEvent(new CustomEvent('kfpl_approval_event', { detail: payload }));

  // 3. Propagate to sibling tabs
  if (propagate) {
    try {
      const bc = new BroadcastChannel('yieldiq_realtime_channel');
      bc.postMessage({ type: 'DATA_UPDATED', payload });
    } catch {}
  }
}
