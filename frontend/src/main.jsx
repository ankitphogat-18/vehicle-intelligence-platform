import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Automatically route API and uploads to the live Render backend when not running on localhost
const RENDER_BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://vehicle-intelligence-platform-xun1.onrender.com';

if (
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string') {
      if (resource.startsWith('/api') || resource.startsWith('/uploads')) {
        resource = `${RENDER_BACKEND_URL}${resource}`;
      } else if (
        resource.startsWith(window.location.origin + '/api') ||
        resource.startsWith(window.location.origin + '/uploads')
      ) {
        resource = resource.replace(window.location.origin, RENDER_BACKEND_URL);
      }
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
