/**
 * DESIGN DECISION: Vite configuration for Tauri 2.0 desktop app
 * WHY: Tauri uses Vite as build tool, requires specific configuration for IPC and hot reload
 *
 * REASONING CHAIN:
 * 1. Vite provides fast development server with hot module replacement (HMR)
 * 2. React plugin enables JSX transformation and Fast Refresh
 * 3. Tauri CLI handles production builds and bundling
 * 4. clearScreen: false prevents Vite from clearing terminal (better for Tauri logs)
 * 5. Server port 1420 is Tauri convention (avoids conflicts)
 *
 * PATTERN: Pattern-TAURI-001 (Lightweight Desktop App)
 * RELATED: package.json (scripts), tauri.conf.json (devPath config)
 * FUTURE: Add build optimizations (minification, tree-shaking, code splitting)
 *
 * PERFORMANCE:
 * - HMR enables instant updates during development
 * - Production builds optimized by Vite (minification, compression)
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Prevent Vite from clearing terminal (better for Tauri logs)
  clearScreen: false,

  // Tauri development server configuration
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to watch Rust files for changes (trigger rebuild)
      ignored: ['**/src-tauri/**'],
    },
  },

  // Build configuration for multiple HTML entry points
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        indicator: resolve(__dirname, 'indicator.html'),
      },
    },
  },
});
