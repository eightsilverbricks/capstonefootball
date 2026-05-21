import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // In local dev, /predictions.json is proxied to the live FastAPI backend.
    // In production (Vercel), Vite serves the real file from public/.
    proxy: {
      '/predictions.json': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: () => '/predictions',
      },
    },
  },
})
