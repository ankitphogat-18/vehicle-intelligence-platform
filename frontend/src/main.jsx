import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Dynamic Backend URL resolution:
// 1. ?api=URL query parameter or stored custom_api_url (instant hackathon tunnel switching without rebuilding)
// 2. VITE_API_URL or VITE_BACKEND_URL from environment
// 3. Fallback to production Render backend
let dynamicApiUrl = null;
if (typeof window !== 'undefined') {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramApi = urlParams.get('api');
    if (paramApi) {
      localStorage.setItem('custom_api_url', paramApi);
      dynamicApiUrl = paramApi;
    } else {
      dynamicApiUrl = localStorage.getItem('custom_api_url');
    }
  } catch (e) {
    // ignore storage errors
  }
}

const BACKEND_URL = (
  dynamicApiUrl ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'https://vehicle-intelligence-platform-xun1.onrender.com'
).replace(/\/$/, '');

if (
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string') {
      if (resource.startsWith('/api') || resource.startsWith('/uploads')) {
        resource = `${BACKEND_URL}${resource}`;
      } else if (
        resource.startsWith(window.location.origin + '/api') ||
        resource.startsWith(window.location.origin + '/uploads')
      ) {
        resource = resource.replace(window.location.origin, BACKEND_URL);
      }
    }

    // Bypass localtunnel reminder screen automatically if tunnel is used
    if (BACKEND_URL.includes('loca.lt')) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      headers.set('bypass-tunnel-reminder', 'true');
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
