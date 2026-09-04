const express = require("express");
const {
    createCheckoutSession,
    createPaymentIntent,
    syncPaymentStatus,
    getPaymentConfig,
} = require("../controllers/payment.controller");
const { authenticate } = require("../middlewares");

const router = express.Router();

// Webhook is router mein NAHI hai — usay raw body chahiye, is liye wo
// server.js mein express.json() se pehle mount hota hai.
router.get("/config", getPaymentConfig);
// In-app card form (Stripe Elements) — customer site par hi rehta hai
router.post("/payment-intent", authenticate, createPaymentIntent);
// Hosted Stripe page wala raasta — fallback ke tor par rakha hua hai
router.post("/checkout-session", authenticate, createCheckoutSession);
// Payment ke foran baad: Stripe se seedha pooch kar order update karta hai,
// taake local par `stripe listen` chalaye bagair bhi flow poora ho jaye
router.post("/sync/:orderId", authenticate, syncPaymentStatus);

module.exports = router;
