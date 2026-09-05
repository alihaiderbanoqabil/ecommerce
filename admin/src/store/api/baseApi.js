import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Ek hi RTK Query API slice — baqi files `injectEndpoints` se apne endpoints
 * yahan add karti hain, taake cache aur tags share hon.
 *
 * credentials: "include" zaroori hai — admin ka token httpOnly cookie mein
 * aata hai, aur uske bagair browser wo cookie request ke sath bhejta hi nahi.
 *
 * baseUrl: local dev mein VITE_API_URL khali hota hai, is liye "/api" hi
 * reh jata hai aur vite dev server isay backend par proxy karta hai. Production
 * mein admin aur backend alag domains par hote hain, to VITE_API_URL ko
 * deployed backend ke URL par set karna parta hai — dekhen .env.example.
 */
const apiBaseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl,
    credentials: "include",
    /**
     * Har request par server ko batata hai ke ye admin portal hai, taake wo
     * `admin_token` cookie set/parhe — na ke customer wali `token`.
     *
     * Zaroori is liye hai ke cookies port nahi dekhtin: ek hi browser mein
     * localhost:5173 (customer) aur localhost:5174 (admin) ek hi cookie jar
     * share karte hain, aur production mein bhi dono ek hi backend domain ki
     * cookie bhejte hain. Is header ke bagair jo portal baad mein login karta
     * wo doosre ka session overwrite kar deta tha.
     * (backend/src/utils/authCookie.js)
     */
    prepareHeaders: (headers) => {
      headers.set("X-Portal", "admin");
      return headers;
    },
  }),
  tagTypes: ["Auth", "Product", "Category", "Order", "User", "Comment", "Stats", "Notification"],

  /**
   * keepUnusedDataFor = cache entry ko kitni der zinda rakhna hai JAB uska
   * aakhri subscriber (component) unmount ho jaye.
   *
   * Default sirf 60 second hai, aur admin panel mein wohi asal masla tha:
   * Products table khol kar 1 minute kaam karo, Dashboard par jao, wapis aao —
   * aur poori list dobara download hoti hai, halanke data bilkul wohi hai.
   * Measure kiya to 6 navigations par 7 requests gayin, jin mein se 4 bilkul
   * fazool thin. 300 second (5 min) ke sath wohi safar 3 requests ka reh jata
   * hai — yaani sirf pehli dafa ka fetch.
   *
   * Ye correctness todta NAHI hai. Jab koi mutation `invalidatesTags` chalati
   * hai to RTK Query dekhta hai:
   *   - entry ka koi subscriber hai   -> foran refetch
   *   - koi subscriber nahi hai       -> entry cache se hata di jati hai
   * Dono soorat mein agli dafa taaza data hi milta hai. Yaani cache ki umar
   * barhane se stale data nahi dikhta — sirf be-wajah network calls kam hoti
   * hain (aur backend ka 100-requests-per-15-min rate limiter bacha rehta hai).
   *
   * Zyada static data (categories) apna lamba waqt khud set karta hai —
   * dekhein categoryApi.js.
   */
  keepUnusedDataFor: 300,

  /**
   * Net wapis aane par saari subscribed queries refetch — laptop sleep se
   * uthta hai ya wifi drop hoti hai to screen par purana data reh jata tha.
   * Focus par NAHI lagaya (api-wide), warna har tab switch poora dashboard
   * dobara mangwa leta aur upar wali saari bachat khatam ho jati. Jahan
   * freshness waqai zaroori hai (orders list, dashboard stats) wahan hook par
   * `refetchOnFocus: true` alag se diya gaya hai.
   *
   * Dono options tab hi chalte hain jab setupListeners() call ho — wo
   * store/index.js mein pehle se hai.
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
