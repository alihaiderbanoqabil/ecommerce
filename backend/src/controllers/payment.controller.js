const Order = require("../models/order.model");
const AppError = require("../utils/AppError");
const { getStripe, isStripeConfigured } = require("../config/stripe");
const { notifyPaymentUpdate, notifyOrderStatus } = require("../services/notification.service");

const CURRENCY = "pkr";

/**
 * Order ko "paid" mark karta hai aur notifications bhejta hai.
 *
 * Webhook aur sync-endpoint dono yahi call karte hain — do jagah alag alag
 * logic likhne se ek raasta doosre se hat jata hai (jaise ek jagah status
 * badalna bhool jana).
 *
 * Idempotent: pehle se paid order par kuch nahi karta, is liye webhook aur
 * sync dono chalen to bhi dobara notification nahi jati.
 */
const markOrderPaid = async (order) => {
    if (!order || order.paymentStatus === "paid") return false;

    const previousStatus = order.status;

    order.paymentStatus = "paid";
    // Paisay aa gaye to order ab processing mein ja sakta hai
    if (order.status === "pending") order.status = "processing";
    await order.save();

    await notifyPaymentUpdate({ order });
    if (order.status !== previousStatus) {
        await notifyOrderStatus({ order, previousStatus });
    }

    return true;
};

const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * POST /api/payments/checkout-session   { orderId }
 *
 * Stripe ka hosted Checkout page banata hai aur uska URL wapis deta hai.
 * Card details kabhi hamare server ya frontend se guzarti hi nahi — user
 * Stripe ke page par jata hai. Isi wajah se PCI ka jhanjhat nahi hota.
 *
 * Line items order document se banti hain (jo khud server-side prices se bani
 * thi), is liye client amount ke sath kuch chhaer-chhaar nahi kar sakta.
 */
const createCheckoutSession = async (req, res) => {
    if (!isStripeConfigured()) {
        // 503: server ki configuration ki kami hai, client ki galti nahi
        throw new AppError("Card payments are not configured on this server", 503);
    }

    const { orderId } = req.body;
    if (!orderId) {
        throw new AppError("orderId is required", 400);
    }

    const order = await Order.findById(orderId).populate("items.product", "name images");
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
        throw new AppError("Forbidden", 403);
    }

    if (order.paymentStatus === "paid") {
        throw new AppError("This order is already paid", 400);
    }
    if (order.status === "cancelled") {
        throw new AppError("This order was cancelled", 400);
    }

    let session;
    try {
        session = await getStripe().checkout.sessions.create({
            mode: "payment",
            // Stripe amounts ko sab se chhoti unit mein leta hai (paisa/cents)
            line_items: order.items.map((item) => ({
                quantity: item.quantity,
                price_data: {
                    currency: CURRENCY,
                    unit_amount: Math.round(item.price * 100),
                    product_data: {
                        name: item.product?.name || "Product",
                        ...(item.product?.images?.[0]?.startsWith("http")
                            ? { images: [item.product.images[0]] }
                            : {}),
                    },
                },
            })),
            // Webhook ko order dhoondhne ke liye — client se aane wale data par
            // bharosa nahi karte
            metadata: { orderId: order._id.toString() },
            client_reference_id: order._id.toString(),
            success_url: `${frontendUrl()}/orders/${order._id}?payment=success`,
            cancel_url: `${frontendUrl()}/orders/${order._id}?payment=cancelled`,
        });
    } catch (error) {
        // Stripe ke apne messages (jaise "Invalid API Key provided: sk_test_...")
        // customer ke kaam ki nahi aur configuration ki tafseel leak karti hain.
        // Asli wajah log mein, client ko sirf itna ke dobara koshish kare.
        console.error("Stripe checkout session failed:", error.message);
        throw new AppError("Could not start the payment. Please try again in a moment.", 502);
    }

    return res.json({ message: "Checkout session created", url: session.url, sessionId: session.id });
};

/**
 * POST /api/payments/payment-intent   { orderId }
 *
 * In-app card form (Stripe Elements) ke liye. Checkout Session hosted page par
 * le jata hai; PaymentIntent site chhorne nahi deta — card ki details phir bhi
 * Stripe ke iframe se seedha Stripe ko jati hain, hamare server par nahi.
 *
 * Amount hamesha stored order se banti hai, client se nahi — warna koi bhi
 * apni marzi ki raqam bhej kar order "khareed" leta.
 */
const createPaymentIntent = async (req, res) => {
    if (!isStripeConfigured()) {
        throw new AppError("Card payments are not configured on this server", 503);
    }

    const { orderId } = req.body;
    if (!orderId) {
        throw new AppError("orderId is required", 400);
    }

    // paymentIntentId schema mein select: false hai — yahan usay explicitly
    // mangwana parta hai, warna purana intent dobara nahi mil sakta
    const order = await Order.findById(orderId).select("+paymentIntentId");
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
        throw new AppError("Forbidden", 403);
    }

    if (order.paymentStatus === "paid") {
        throw new AppError("This order is already paid", 400);
    }
    if (order.status === "cancelled") {
        throw new AppError("This order was cancelled", 400);
    }

    const amount = Math.round(order.totalAmount * 100); // Stripe paisa/cents leta hai

    try {
        // Ek order ka ek hi PaymentIntent — user page refresh kare ya wapis
        // aaye to purana hi update karte hain, naya nahi banate. Warna Stripe
        // dashboard adhoore intents se bhar jata hai.
        if (order.paymentIntentId) {
            const existing = await getStripe().paymentIntents.retrieve(order.paymentIntentId);

            // Payment ho chuka hai magar webhook abhi nahi pohancha (order par
            // paymentStatus abhi "pending" hai). Yahan naya intent banana
            // customer ko doosri baar charge kar sakta hai — is liye rok dete
            // hain aur usay batate hain ke paisay ja chuke hain.
            if (["succeeded", "processing"].includes(existing.status)) {
                throw new AppError(
                    "This order's payment is already going through. Refresh in a moment to see it confirmed.",
                    409
                );
            }

            if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(existing.status)) {
                const updated =
                    existing.amount === amount
                        ? existing
                        : await getStripe().paymentIntents.update(existing.id, { amount });

                return res.json({
                    message: "Payment intent ready",
                    clientSecret: updated.client_secret,
                    amount: updated.amount,
                    currency: updated.currency,
                });
            }
        }

        const intent = await getStripe().paymentIntents.create({
            amount,
            currency: CURRENCY,
            // Card ke sath sath wo tareeqe bhi jo Stripe account par on hain
            automatic_payment_methods: { enabled: true },
            // Webhook ko order dhoondhne ke liye
            metadata: { orderId: order._id.toString() },
        });

        order.paymentIntentId = intent.id;
        await order.save();

        return res.json({
            message: "Payment intent created",
            clientSecret: intent.client_secret,
            amount: intent.amount,
            currency: intent.currency,
        });
    } catch (error) {
        // Hamare apne AppError (jaise upar wala 409) ko generic 502 mein
        // badalna galat hoga — wo pehle se sahi message aur status rakhta hai
        if (error instanceof AppError) throw error;

        console.error("Stripe payment intent failed:", error.message);
        throw new AppError("Could not start the payment. Please try again in a moment.", 502);
    }
};

/**
 * POST /api/payments/webhook
 *
 * Stripe khud ye call karta hai. Yehi wo jagah hai jahan payment ko "paid"
 * mark karte hain — success_url par bharosa nahi kiya ja sakta, kyunke user
 * wo URL khud bhi khol sakta hai (ya payment ke baad tab band kar sakta hai).
 *
 * Signature verify karne ke liye RAW body chahiye, is liye ye route
 * express.json() se PEHLE mount hota hai (server.js dekho).
 */
const handleWebhook = async (req, res) => {
    if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
        throw new AppError("Stripe webhook is not configured on this server", 503);
    }

    let event;
    try {
        event = getStripe().webhooks.constructEvent(
            req.body, // Buffer — express.raw() se
            req.headers["stripe-signature"],
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        // Galat signature = ya to koi naqli request hai ya secret mismatch
        throw new AppError(`Webhook signature verification failed: ${error.message}`, 400);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        const order = orderId ? await Order.findById(orderId) : null;

        // Order na mile to bhi 200 dete hain — warna Stripe hamesha retry
        // karta rehta hai kisi aisi cheez ke liye jo wapis nahi aani
        await markOrderPaid(order);
    }

    // Elements wala raasta: PaymentIntent seedha succeed hota hai (koi
    // checkout session nahi hoti)
    if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object;
        const orderId = intent.metadata?.orderId;
        const order = orderId ? await Order.findById(orderId) : null;

        await markOrderPaid(order);
    }

    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
        const session = event.data.object;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        const order = orderId ? await Order.findById(orderId) : null;

        if (order && order.paymentStatus === "pending") {
            order.paymentStatus = "failed";
            await order.save();
            await notifyPaymentUpdate({ order });
        }
    }

    // Stripe ko 200 chahiye, warna wo event dobara bhejta rehta hai
    return res.json({ received: true });
};

/**
 * POST /api/payments/sync/:orderId
 *
 * Order ke PaymentIntent ka haal SEEDHA Stripe se poochta hai aur order ko
 * uske mutabiq update karta hai.
 *
 * Ye webhook ka MUTABADIL nahi, uska sathi hai:
 *   - Local development mein webhook ke liye `stripe listen` chahiye hota hai;
 *     ye endpoint uske bagair bhi payment complete kar deta hai.
 *   - Production mein bhi kaam ka hai: webhook kabhi der se aata hai ya kho
 *     jata hai, aur customer "paid" dekhne ka intezar karta reh jata hai.
 *
 * Mehfooz kyun hai: hum client ke kehne par order ko paid nahi karte — Stripe
 * se server-to-server pooch kar karte hain. Client ka bheja hua sirf orderId
 * hai, aur uska maalik hona bhi check hota hai.
 */
const syncPaymentStatus = async (req, res) => {
    if (!isStripeConfigured()) {
        throw new AppError("Card payments are not configured on this server", 503);
    }

    const order = await Order.findById(req.params.orderId).select("+paymentIntentId");
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
        throw new AppError("Forbidden", 403);
    }

    // Pehle se paid (shayad webhook pehle pohanch gaya) — kuch karne ki zarorat nahi
    if (order.paymentStatus === "paid") {
        return res.json({ message: "Payment already confirmed", order, updated: false });
    }

    if (!order.paymentIntentId) {
        throw new AppError("No payment has been started for this order", 400);
    }

    let intent;
    try {
        intent = await getStripe().paymentIntents.retrieve(order.paymentIntentId);
    } catch (error) {
        console.error("Stripe payment intent lookup failed:", error.message);
        throw new AppError("Could not check the payment status. Please try again.", 502);
    }

    // Raqam bhi milani chahiye — warna intent ki amount kisi tarah badal jaye
    // to hum kam paisay par order paid kar baithte
    const expected = Math.round(order.totalAmount * 100);

    if (intent.status === "succeeded" && intent.amount_received === expected) {
        await markOrderPaid(order);
        return res.json({ message: "Payment confirmed", order, updated: true });
    }

    if (intent.status === "processing") {
        return res.json({ message: "Payment is still processing", order, updated: false });
    }

    return res.json({
        message: "Payment has not completed yet",
        order,
        updated: false,
        paymentIntentStatus: intent.status,
    });
};

/**
 * GET /api/payments/config
 *
 * Frontend ko batata hai ke card option dikhani hai ya nahi, aur Stripe
 * Elements ke liye publishable key deta hai.
 *
 * Publishable key ko frontend ke .env mein rakhne ke bajaye yahan se bhejte
 * hain: ek hi jagah (backend ka .env) se dono keys aati hain, aur key badalne
 * par frontend ko dobara build karne ki zarorat nahi parti. Publishable key
 * public hoti hi hai — ye chupane wali cheez nahi.
 */
const getPaymentConfig = async (req, res) => {
    return res.json({
        cardPaymentsEnabled: isStripeConfigured(),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        currency: CURRENCY,
    });
};

module.exports = {
    createCheckoutSession,
    createPaymentIntent,
    syncPaymentStatus,
    handleWebhook,
    getPaymentConfig,
};
