import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Customer app ki tarah hi proxy — magar port 5174, taake dono apps ek
// waqt mein chal saken.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
      // ws: true ke bagair socket.io ka upgrade request proxy se nahi guzarta
      // aur client hamesha polling par atka rehta hai
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
})
