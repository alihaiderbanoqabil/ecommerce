import { io } from "socket.io-client";

/**
 * Ek hi socket poore admin portal ke liye. Local dev mein VITE_API_URL khali
 * hota hai, is liye URL nahi dete — vite dev server `/socket.io` ko backend
 * par proxy karta hai (`ws: true`), is liye auth cookie same-origin ki tarah
 * chali jati hai. Production mein backend alag domain par hota hai, is liye
 * VITE_API_URL wahan ka URL hona chahiye (baseApi.js wali hi env var) —
 * dekhen .env.example.
 *
 * `portal: "admin"` handshake ke sath jata hai — server isi se jaanta hai ke
 * `admin_token` cookie parhni hai, customer wali `token` nahi. Header yahan
 * kaam nahi aata: browser WebSocket upgrade par custom headers bhejne nahi
 * deta, magar query dono transports (polling aur ws) par pohanchti hai.
 */
export const socket = io(import.meta.env.VITE_API_URL || undefined, {
  withCredentials: true,
  autoConnect: false,
  query: { portal: "admin" },
});
