import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// @ts-ignore
import eslint from 'vite-plugin-eslint';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['node_modules/**', 'dist/**'],
      failOnWarning: false,
      failOnError: false,
      emitWarning: false,
      emitError: false
    })
  ],
  server: {
    host: true, // listen on all interfaces (helps WSL/VMs)
    port: 5175,
    strictPort: true, // Don't try other ports
    hmr: {
      protocol: 'ws',
      // Use the same port as the dev server for simplicity and reliability
      clientPort: 5175,
      overlay: true // Show errors in browser overlay
    },
    watch: {
      // Use polling for file watching in WSL/OneDrive and lower interval for responsiveness
      usePolling: true,
      interval: 200,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      },
      followSymlinks: false,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    }
  },
  optimizeDeps: {
    // Exclude packages that can be finicky with Vite's dep optimizer (especially on WSL/OneDrive)
    exclude: [
      'lucide-react',
      'react-datepicker',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/react',
      'dayjs'
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  // Add build optimizations
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
