/**
 * Auth cookie ka naam, options, aur set/clear/read — sab ek hi jagah.
 *
 * Masla jo is file ki wajah bana: cookies PORT ko nahi dekhtin, sirf host ko.
 * Is liye localhost:5173 (customer) aur localhost:5174 (admin) browser ke liye
 * ek hi cookie jar hai — aur production mein bhi dono portals wohi ek backend
 * domain ki cookie bhejte hain. Dono ka naam "token" ho to jo portal baad mein
 * login kare wo doosre ka session chup chaap overwrite kar deta hai: admin login
 * karne ke baad customer app admin ke credentials se logged in nazar aata tha,
 * aur admin ki notifications refresh par ghayab ho jati thin (bell customer ke
 * token se fetch kar rahi hoti thi).
 *
 * Hal: har portal ki apni cookie. Portal khud batata hai ke wo kaun hai —
 *   HTTP    -> `X-Portal: admin` header   (admin/src/store/api/baseApi.js)
 *   Socket  -> handshake query `?portal=admin` (admin/src/socket.js)
 *
 * Jo ye nahi bhejta (customer app, Postman, mobile) usay purani "token" cookie
 * hi milti hai — is liye customer ke chalte hue sessions nahi tootte.
 */

const CUSTOMER_COOKIE = "token";
const ADMIN_COOKIE = "admin_token";

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days — same as the JWT expiry

const cookieNameFor = (portal) => (portal === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE);

// clearCookie ko bilkul yehi options (maxAge ke bagair) chahiye hoti hain —
// warna browser cookie ko match nahi karta aur logout par wo delete hi nahi hoti.
const cookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,                           // JavaScript isay parh nahi sakta (XSS protection)
        secure: isProduction,                     // HTTPS only in production
        sameSite: isProduction ? "none" : "lax",  // "none" ke sath secure: true zaroori hai
        path: "/",
    };
};

// JWT ko httpOnly cookie mein bhejta hai, us portal ke naam se jisne request ki.
const setTokenCookie = (req, res, token) => {
    res.cookie(cookieNameFor(req.headers["x-portal"]), token, {
        ...cookieOptions(),
        maxAge: TOKEN_MAX_AGE,
    });
};

const clearTokenCookie = (req, res) => {
    res.clearCookie(cookieNameFor(req.headers["x-portal"]), cookieOptions());
};

/**
 * Sirf USI portal ki cookie parhta hai jis ne request bheji.
 *
 * Jaan boojh kar doosri cookie par fallback nahi karte — warna wohi session
 * bleed wapis aa jata hai jo is file ne theek kiya hai.
 */
const readTokenCookie = (req) => req.cookies?.[cookieNameFor(req.headers["x-portal"])] || null;

module.exports = {
    cookieNameFor,
    setTokenCookie,
    clearTokenCookie,
    readTokenCookie,
};
