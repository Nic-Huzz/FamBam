import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    },
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase in its own chunk
          'supabase': ['@supabase/supabase-js']
        }
      }
    },
    // Generate source maps for debugging (optional, can disable for smaller builds)
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500
  }
})
