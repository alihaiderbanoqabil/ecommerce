import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev server /api aur /uploads ko backend par proxy karta hai.
// Fayda: browser ke liye sab kuch same-origin hai, is liye httpOnly auth
// cookie bina CORS/SameSite jhanjhat ke chal jati hai.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
      // ws: true ke bagair socket.io ka upgrade request proxy se nahi guzarta
      // aur client hamesha polling par atka rehta hai
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
})
