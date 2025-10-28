/**
 * Lumina Desktop - React Mount Point
 *
 * DESIGN DECISION: Standard React 18 mounting with StrictMode
 * WHY: Entry point for React application in Tauri desktop window
 *
 * REASONING CHAIN:
 * 1. Import React 18 createRoot API (not legacy ReactDOM.render)
 * 2. Enable StrictMode for development warnings (double-render detection)
 * 3. Mount App component to #root div in index.html
 * 4. Vite handles hot module replacement in development
 * 5. Tauri bundles this as desktop app window content
 *
 * PATTERN: Pattern-TAURI-001 (Lightweight Desktop App)
 * RELATED: App.tsx (main component), index.html (mount point)
 * FUTURE: Add error boundary, performance monitoring
 *
 * PERFORMANCE:
 * - Target: <500ms to first render
 * - React 18 concurrent rendering improves responsiveness
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
