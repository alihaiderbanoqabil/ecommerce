require("dotenv").config();

const express = require("express");
const http = require("http");
// https://www.npmjs.com/package/cors
const cors = require('cors'); 
// https://www.npmjs.com/package/helmet
const helmet = require('helmet');
// https://www.npmjs.com/package/express-rate-limit
const rateLimit = require('express-rate-limit');
// https://www.npmjs.com/package/express-xss-sanitizer
const { xss } = require('express-xss-sanitizer');
// https://www.npmjs.com/package/cookie-parser
// req.cookies bharta hai — httpOnly auth cookie parhne ke liye zaroori hai
const cookieParser = require('cookie-parser');

const connectDB = require("./config/db");
const allowedOrigins = require("./config/corsOrigins");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const orderRoutes = require("./routes/order.routes");
const commentRoutes = require("./routes/comment.routes");
const statsRoutes = require("./routes/stats.routes");
const paymentRoutes = require("./routes/payment.routes");
const notificationRoutes = require("./routes/notification.routes");
const { handleWebhook } = require("./controllers/payment.controller");
const { initSocket } = require("./socket");

// Express ke bahar hone wale stray promise rejections ke liye — sirf LOG karte
// hain, process band nahi karte. Wajah: kuch third-party SDKs (jaise Cloudinary)
// khud internally ek "orphaned" duplicate rejection bhejte hain jo already
// errorHandler se properly 400/500 ban kar client ko ja chuka hota hai — us par
// process.exit() karna ek normal user-error (jaise galat file format) ko pure
// server ka outage bana deta hai sab users ke liye. Genuine sync bugs
// uncaughtException se abhi bhi fatal hain.
process.on("unhandledRejection", (reason) => {
    console.warn("Unhandled Rejection (logged, process zinda hai):", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

connectDB();

const app = express();

app.set('query parser', 'extended'); // restores qs-style nested query parsing

// Render (aur Heroku/most PaaS) app ko ek reverse proxy ke peeche chalate hain
// jo X-Forwarded-For/Proto set karta hai. Isके bagair: (1) express-rate-limit
// v8 is header ko dekh kar throw karta hai (IP spoofing check), har request
// crash ho jati; (2) req.ip proxy ki IP ban jati, per-user rate limiting
// bekaar ho jati. `1` = sirf ek hop trust karo (Render ka apna proxy) — local
// dev mein koi proxy nahi hota is liye wahan be-asar hai.
app.set('trust proxy', 1);

// Adds headers: Access-Control-Allow-Origin: *
// app.use(cors())

// Helmet — sets various security-related HTTP headers
app.use(helmet());

// middleware which sanitizes user input data (in req.body, req.query, req.headers and req.params) to prevent Cross Site Scripting (XSS) attack.
app.use(xss());

// CORS — configure allowed origins as needed
// NOTE: auth cookie ke sath origin '*' kaam nahi karta — credentials: true ke
// sath browser exact origin maangta hai. Production mein CORS_ORIGINS env var
// se deployed customer/admin URLs set karen (config/corsOrigins.js dekhen).
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true, // cookies/auth headers cross-origin bhejne ke liye zaroori
}));

// ── Stripe webhook — sab se pehle, JSON parser se PEHLE ──────────────────
// Signature verify karne ke liye Stripe ko byte-for-byte wohi body chahiye jo
// usne bheji thi. express.json() usay parse kar ke object bana deta, aur xss()
// sanitize kar deta — dono se signature toot jata. Is liye ye route yahan hai,
// apne raw parser ke sath. Rate limiter se bhi bahar rakha hai, warna busy
// din mein Stripe ke retries 429 khane lagte.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);

// ── Rate limiting ────────────────────────────────────────────────────────
// Do alag limiters, kyunke dono ka maqsad alag hai:
//
//   1. Global limiter  -> abuse/scraping rokta hai. Ek normal SPA session ek
//      hi page par kai requests karti hai (list + detail + comments + socket
//      polling), is liye ye kushada hona chahiye — warna asli user ko 429
//      milta hai jo koi ghalti nahi kar raha.
//   2. Auth limiter    -> brute force rokta hai. Sirf NAKAAM koshishen ginta
//      hai (skipSuccessfulRequests), to bar bar login karne wale developer ya
//      user ko takleef nahi hoti, magar password guessing foran ruk jati hai.
//
// message ek OBJECT hai, string nahi: express-rate-limit string ko plain text
// bhejta hai, aur phir frontend `res.json()` par SyntaxError khata hai
// ("Unexpected token 'T'"). Object dene se 429 bhi wohi { message } shape
// rakhta hai jo baqi saari errors ki hai.
const TOO_MANY = { message: 'Too many requests from this IP, please try again in a few minutes.' };

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,                 // per IP, per window
    standardHeaders: true,    // return rate limit info in RateLimit-* headers
    legacyHeaders: false,     // disable X-RateLimit-* headers
    message: TOO_MANY,
    // Socket.IO ka long-polling ginne ka koi faida nahi — ye abuse ka raasta
    // nahi hai, magar limit foran khatam kar deta hai (ek realtime page khula
    // rakhne se hi 429 aa jata tha).
    skip: (req) => req.path.startsWith('/socket.io'),
});
app.use(limiter);

// Password guessing wale routes par sakht limit — sirf nakaam koshishen
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
    skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Middleware to parse JSON request bodies
app.use(express.json()); 
// Middleware to parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true })); 
// Cookies ko req.cookies mein parse karta hai (auth token cookie ke liye)
app.use(cookieParser());
// NOTE: pehle yahan `/uploads` static serve hota tha. Ab saari images Cloudinary
// par jati hain (middlewares/cloudinaryUpload.js) — server koi file host nahi
// karta, is liye Render par persistent disk ki zarorat bhi nahi.

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/media", require("./routes/media.routes"));

// Har route ke baad honi chahiye: upar jo bhi match na ho, wo yahan pakra jata hai.
app.use(notFound);
// Sab se aakhir mein honi chahiye: next() se aaya, sync throw hua, ya async
// reject hua (Express 5 khud forward karta hai) — har error yahan aata hai.
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Socket.IO ko express ke saath ek hi HTTP server par chalate hain — is liye
// app.listen() ki jagah apna http server banate hain aur usi ko dono dete hain.
// Fayda: ek hi port, ek hi origin, aur wohi auth cookie socket par bhi.
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;



// Quick reference — errorHandler live test se ye responses aate hain:

// expired verification token       400  {"message":"Verification token has expired"}
// expired auth token               401  {"message":"Token expired"}
// invalid auth token               401  {"message":"Invalid token"}
// malformed JSON body              400  {"message":"Invalid JSON body"}
// 404 unmatched route              404  {"message":"Route not found - GET /api/nope"}
// CastError bad ObjectId           400  {"message":"Invalid _id: not-valid"}
// customer → admin-only route      403  {"message":"Forbidden: insufficient role"}
// upload non-image                 400  {"message":"Only image files are allowed"}
// duplicate category name          400  {"message":"name already exists"}
// missing product fields           400  {"message":"Category is required, Price is required"}
// unexpected bug (dev)             500  {"message":"Cannot read properties of undefined..."}
// unexpected bug (production)      500  {"message":"Internal server error"}