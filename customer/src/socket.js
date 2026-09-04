import { io } from "socket.io-client";

/**
 * Ek hi socket poore app ke liye.
 *
 * Local dev mein VITE_API_URL khali hota hai, is liye URL nahi dete — client
 * usi origin se judta hai jahan se page aaya, aur vite dev server usay backend
 * par proxy kar deta hai (`/socket.io`, `ws: true`). Production mein backend
 * alag domain par hota hai, is liye VITE_API_URL wahan ka URL hona chahiye
 * (baseApi.js wali hi env var) — dekhen .env.example.
 *
 * `autoConnect: false` — connect App ke andar hota hai, taake React ke bahar
 * import karte waqt hi connection na khul jaye.
 */
export const socket = io(import.meta.env.VITE_API_URL || undefined, {
  withCredentials: true,
  autoConnect: false,
  // Auth cookie badal jaye (login/logout) to naye handshake ki zarorat hoti hai
  reconnectionDelay: 1000,
});
