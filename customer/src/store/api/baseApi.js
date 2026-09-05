import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Ek hi RTK Query API slice, jis mein baqi files apne endpoints
 * `injectEndpoints` se add karti hain. Faida: ek shared cache, ek shared
 * tag system — is liye `invalidatesTags` kisi bhi file ke query ko refetch
 * kara sakta hai.
 *
 * credentials: "include" zaroori hai — auth token httpOnly cookie mein aata
 * hai, aur uske bagair browser wo cookie request ke sath bhejta hi nahi.
 *
 * Admin portal ki tarah `X-Portal` header yahan nahi bhejte: server ka default
 * yehi customer wali "token" cookie hai. Sirf admin apne aap ko pehchanwata hai
 * (backend/src/utils/authCookie.js) — is se ek hi browser mein dono sessions
 * alag rehti hain aur customer ke chalte sessions bhi nahi tootay.
 *
 * baseUrl: local dev mein VITE_API_URL khali hota hai, is liye "/api" hi
 * reh jata hai aur vite dev server isay backend par proxy karta hai (sab kuch
 * same-origin). Production build mein customer aur backend alag domains par
 * hote hain (Render par alag services), to VITE_API_URL ko deployed backend
 * ke URL par set karna parta hai — dekhen .env.example.
 */
const apiBaseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: apiBaseUrl, credentials: "include" }),
  tagTypes: ["Auth", "Product", "Category", "Order", "Comment", "Notification"],

  /**
   * keepUnusedDataFor = cache entry kitni der zinda rahegi JAB uska aakhri
   * subscriber (component) unmount ho jaye.
   *
   * Default sirf 60 second hai — aur wohi shopping ka sab se aam pattern torta
   * hai: Home se product khol kar parhna, comments dekhna, phir back button.
   * Ek minute se zyada lag gaya to Home ke featured/newest products aur
   * category tree teeno dobara download hote hain, halanke inn mein kuch badla
   * hi nahi hota. 300 second (5 min) us poore browsing loop ko cache se chala
   * deta hai. (Admin portal par yehi cheez naap kar dekhi gayi: 6 navigations
   * par 7 requests se 3 requests.)
   *
   * Correctness par asar nahi parta. Mutation ka `invalidatesTags` chalte hi
   * RTK Query entry ko ya to refetch karta hai (agar koi component usay dekh
   * raha hai) ya cache se nikaal deta hai (agar koi nahi dekh raha) — dono
   * soorat mein agli dafa taaza data milta hai. Is liye order place karne ke
   * baad Orders list, aur comment post karne ke baad product ki rating, pehle
   * ki tarah hi update hoti hain.
   */
  keepUnusedDataFor: 300,

  /**
   * Net wapis aane par subscribed queries refetch ho jati hain (mobile par
   * signal ka aana-jana aam hai). Focus par jaan boojh kar nahi lagaya — har
   * tab switch par poori product list dobara mangwana bandwidth ka zaya hai,
   * aur catalog itni tezi se badalta bhi nahi.
   *
   * Chalne ke liye setupListeners() zaroori hai — wo store/index.js mein hai.
   */
  refetchOnReconnect: true,

  endpoints: () => ({}),
});

/**
 * Har error ko ek qabil-e-parhne wale jumle mein badalta hai.
 *
 * Backend apni saari errors { message } shape mein bhejta hai, magar kuch
 * jawab is shape se bahar hote hain aur unhe alag se sambhalna parta hai —
 * warna user ko raw JS error nazar aata hai:
 *
 *   PARSING_ERROR  server ne JSON ke ilawa kuch bheja (jaise koi proxy ya
 *                  middleware ka plain-text 429/502). Bina is check ke toast
 *                  par "SyntaxError: Unexpected token 'T'..." likha aata hai.
 *   FETCH_ERROR    request server tak pohanchi hi nahi (backend band hai,
 *                  net gaya hua hai).
 *   TIMEOUT_ERROR  server ne waqt par jawab nahi diya.
 */
export const getApiError = (error, fallback = "Something went wrong") => {
  if (!error) return fallback;

  // Normal soorat: backend ka { message }
  if (error.data?.message) return error.data.message;

  if (error.status === "PARSING_ERROR") {
    // 429 ka apna message dete hain — ye sab se aam non-JSON jawab hai
    if (error.originalStatus === 429) {
      return "Too many requests — please wait a few minutes and try again.";
    }

    // Chhota sa plain-text jawab ho to wohi dikha dete hain; lamba (HTML error
    // page) ho to fallback, warna toast mein poora page aa jata hai
    const text = typeof error.data === "string" ? error.data.trim() : "";
    return text && text.length <= 120 ? text : fallback;
  }

  if (error.status === "FETCH_ERROR") return "Cannot reach the server. Check your connection.";
  if (error.status === "TIMEOUT_ERROR") return "The server took too long to respond. Please try again.";

  // Kuch endpoints plain string bhejte hain
  if (typeof error.data === "string" && error.data.trim() && error.data.length <= 120) {
    return error.data.trim();
  }

  return fallback;
};
