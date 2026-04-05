import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves at /repo-name/ — set base accordingly
// VITE_BASE_PATH can override (use "/" for custom domain)
const basePath = process.env.VITE_BASE_PATH || '/housefinance/'

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
