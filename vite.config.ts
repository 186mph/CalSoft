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
    port: 5175,
    strictPort: true, // Don't try other ports
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5176, // Separate port for HMR
      overlay: true // Show errors in browser overlay
    },
    watch: {
      usePolling: true, // Use polling for file watching in WSL
      interval: 1000, // Poll every 1 second
      followSymlinks: false
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});

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
