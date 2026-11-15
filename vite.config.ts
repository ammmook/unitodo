import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // dev: ส่ง /api ไปที่ Node server (npm run api)
    proxy: { '/api': 'http://localhost:8787' },
  },
})
