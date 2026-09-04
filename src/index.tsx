import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Prevent uncaught Firebase API key suspension errors from crashing the application
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason || '');
    if (
      errorMsg.includes('suspended') ||
      errorMsg.includes('auth/permission-denied') ||
      event.reason?.code === 'auth/permission-denied'
    ) {
      event.preventDefault();
      console.warn("Prevented unhandled Firebase permission/suspension error:", errorMsg);
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || String(event.error || '');
    if (
      errorMsg.includes('suspended') ||
      errorMsg.includes('auth/permission-denied')
    ) {
      event.preventDefault();
      console.warn("Prevented uncaught Firebase error event:", errorMsg);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);