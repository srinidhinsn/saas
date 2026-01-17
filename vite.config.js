import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/dist/',
  plugins: [react()],
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
