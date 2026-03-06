import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',       // allow external connections
    port: 5173,            // your chosen port
    allowedHosts: [
      'saas.networkspecialist.in'
    ],
    watch: {
      ignored: ['**/.env', '**/vite.config.js']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          excel: ['xlsx'],
          utils: ['axios', 'jwt-decode', 'uuid', 'file-saver'],
          icons: ['react-icons', 'lucide-react'],
        },
      },
    },
    // Optional: raise warning threshold
    chunkSizeWarningLimit: 1000, // in kB
  },
})
