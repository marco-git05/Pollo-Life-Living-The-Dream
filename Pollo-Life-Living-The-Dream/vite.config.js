import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api calls to the Express backend (server/, port 4000) so there are no CORS issues.
    proxy: { '/api': 'http://localhost:4000' },
  },
})


