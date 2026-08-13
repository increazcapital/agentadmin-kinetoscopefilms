/* ============================================================
   Config: apiHelper.js
   Description: Reusable authenticated API request helper.
                Automatically attaches JWT token from localStorage
                and handles common error responses.
   ============================================================ */

import { getApiUrl } from './apiUrl';

/**
 * Make an authenticated API request.
 * @param {string} path - API path (e.g., '/api/agent/profile')
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiRequest(path, methodOrOptions = {}, bodyData = null) {
  const authData = localStorage.getItem('kfpl_agent_auth');
  let token = '';
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      token = parsed.token || '';
    } catch (e) {
      console.error('Failed to parse auth data:', e);
    }
  }

  const url = getApiUrl(path);

  let method = 'GET';
  let bodyPayload = null;
  let customHeaders = {};

  if (typeof methodOrOptions === 'string') {
    method = methodOrOptions.toUpperCase();
    bodyPayload = bodyData;
  } else if (typeof methodOrOptions === 'object' && methodOrOptions !== null) {
    method = (methodOrOptions.method || 'GET').toUpperCase();
    bodyPayload = methodOrOptions.body || null;
    customHeaders = methodOrOptions.headers || {};
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...customHeaders,
  };

  // Automatically stringify object body payloads and set JSON content type
  if (bodyPayload && !(bodyPayload instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (typeof bodyPayload === 'object') {
      bodyPayload = JSON.stringify(bodyPayload);
    }
  }

  const fetchOpts = {
    method,
    headers,
  };
  if (bodyPayload) {
    fetchOpts.body = bodyPayload;
  }

  const response = await fetch(url, fetchOpts);

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    console.error('Failed to parse response JSON:', parseErr, 'Raw text:', text);
    const errorMessage = text || `Request failed with status ${response.status}`;
    const err = new Error(errorMessage);
    err.status = response.status;
    err.data = text;
    throw err;
  }

  if (!response.ok) {
    const isAccountBlockedOrUnauth = response.status === 401 ||
      (response.status === 403 && data && (data.code === 'ACCOUNT_BLOCKED' || (data.message && data.message.toLowerCase().includes('account has been deactivated'))));

    if (isAccountBlockedOrUnauth && !window.location.pathname.includes('/login')) {
      const reason = data.message || 'Your account has been deactivated or blocked.';
      try {
        localStorage.removeItem('kfpl_agent_auth');
      } catch (_) {}
      window.location.href = `/login?blocked=true&reason=${encodeURIComponent(reason)}`;
      return;
    }
    const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Generate a cache key scoped to the logged-in agent's ID to prevent
 * cross-user data leakage.
 * @param {string} baseKey - The base key name (e.g., 'kfpl_agent_profile_cache')
 * @returns {string} The scoped cache key
 */
export function getAgentCacheKey(baseKey) {
  try {
    const authData = localStorage.getItem('kfpl_agent_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      const agent = parsed.agent || parsed.user || {};
      const agentId = agent._id || agent.id || 'default';
      return `${baseKey}_${agentId}`;
    }
  } catch (e) {
    console.error('Failed to resolve agent cache key:', e);
  }
  return `${baseKey}_default`;
}

/**
 * Safely set item in localStorage.
 * If QuotaExceededError occurs, automatically clears old non-essential caches
 * and strips heavy Base64 profilePic before retrying.
 */
export function safeSetLocalStorage(key, value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    localStorage.setItem(key, str);
  } catch (e) {
    console.warn(`QuotaExceededError on setting ${key}, clearing old non-essential caches...`, e);
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('_cache') || k.includes('_detail_') || k.includes('_list') || k.includes('_session_') || k.includes('_history'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      let finalStr = str;
      if (typeof value === 'object' && value !== null) {
        const copy = JSON.parse(JSON.stringify(value));
        const sanitizeObj = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          for (const prop in obj) {
            if (prop === 'profilePic' && typeof obj[prop] === 'string' && obj[prop].length > 2000) {
              delete obj[prop];
            } else if (typeof obj[prop] === 'object') {
              sanitizeObj(obj[prop]);
            }
          }
        };
        sanitizeObj(copy);
        finalStr = JSON.stringify(copy);
      }

      localStorage.setItem(key, finalStr);
    } catch (err2) {
      console.error(`Fatal localStorage write error for ${key}:`, err2);
    }
  }
}
