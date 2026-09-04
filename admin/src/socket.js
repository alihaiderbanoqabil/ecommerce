import { io } from "socket.io-client";

/**
 * Ek hi socket poore admin portal ke liye. Local dev mein VITE_API_URL khali
 * hota hai, is liye URL nahi dete — vite dev server `/socket.io` ko backend
 * par proxy karta hai (`ws: true`), is liye auth cookie same-origin ki tarah
 * chali jati hai. Production mein backend alag domain par hota hai, is liye
 * VITE_API_URL wahan ka URL hona chahiye (baseApi.js wali hi env var) —
 * dekhen .env.example.
 */
export const socket = io(import.meta.env.VITE_API_URL || undefined, {
  withCredentials: true,
  autoConnect: false,
});
