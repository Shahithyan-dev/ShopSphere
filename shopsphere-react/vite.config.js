import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the existing Express backend during development.
      // In production, the React build output is served BY that same Express
      // server (see server.js), so this proxy is dev-only convenience.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
