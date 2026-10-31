import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Dynamic Backend URL resolution:
const DEFAULT_RENDER_BACKEND = 'https://vehicle-intelligence-platform-xun1.onrender.com';

export function getActiveBackendUrl() {
  if (typeof window === 'undefined') return DEFAULT_RENDER_BACKEND;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramApi = urlParams.get('api');
    if (paramApi) {
      if (paramApi === 'reset' || paramApi === 'render' || paramApi === 'default') {
        localStorage.removeItem('custom_api_url');
        return import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_RENDER_BACKEND;
      }
      localStorage.setItem('custom_api_url', paramApi);
      return paramApi;
    }
    const saved = localStorage.getItem('custom_api_url');
    if (saved) return saved;
  } catch (e) {}

  return import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_RENDER_BACKEND;
}

export function setActiveBackendUrl(url, { reload = true } = {}) {
  if (typeof window === 'undefined') return;
  if (!url || url === 'reset' || url === 'render') {
    localStorage.removeItem('custom_api_url');
  } else {
    localStorage.setItem('custom_api_url', url.trim().replace(/\/$/, ''));
  }
  // Notify components listening for backend URL changes (no reload needed for in-page updates)
  try {
    window.dispatchEvent(new CustomEvent('backend-url-changed', { detail: { url: getActiveBackendUrl() } }));
  } catch (e) {}
  if (reload) window.location.reload();
}

window.getActiveBackendUrl = getActiveBackendUrl;
window.setActiveBackendUrl = setActiveBackendUrl;

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    const currentBackend = getActiveBackendUrl().replace(/\/$/, '');
    window.__CURRENT_BACKEND_URL__ = currentBackend;

    // Only rewrite relative /api and /uploads paths when NOT on localhost
    // (on localhost the dev proxy or direct backend handles them)
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocalhost && typeof resource === 'string') {
      if (resource.startsWith('/api') || resource.startsWith('/uploads')) {
        resource = `${currentBackend}${resource}`;
      } else if (
        resource.startsWith(window.location.origin + '/api') ||
        resource.startsWith(window.location.origin + '/uploads')
      ) {
        resource = resource.replace(window.location.origin, currentBackend);
      }
    }

    // Bypass localtunnel reminder screen automatically if tunnel is used
    if (typeof resource === 'string' && resource.includes('loca.lt')) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      headers.set('bypass-tunnel-reminder', 'true');
      init.headers = headers;

      // Also append query param for good measure
      if (!resource.includes('bypass-tunnel-reminder')) {
        const separator = resource.includes('?') ? '&' : '?';
        resource = `${resource}${separator}bypass-tunnel-reminder=1`;
      }
    }

    // Bypass ngrok browser warning if ngrok tunnel is used
    if (typeof resource === 'string' && resource.includes('ngrok')) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      headers.set('ngrok-skip-browser-warning', 'true');
      init.headers = headers;
    }

    return originalFetch.call(this, resource, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
