# Stripe payment integration

Card payments use **Stripe Elements** (embedded, in-app card form). A hosted
**Checkout Session** endpoint also exists as a fallback but isn't wired into the
customer UI's main flow — see [Checkout Session (fallback path)](#checkout-session-fallback-path).

Key files:

| File | Role |
| --- | --- |
| [`backend/src/config/stripe.js`](../backend/src/config/stripe.js) | Lazily builds the Stripe SDK client; app runs fine (COD orders, browsing) if no key is set |
| [`backend/src/controllers/payment.controller.js`](../backend/src/controllers/payment.controller.js) | All five payment endpoints |
| [`backend/src/routes/payment.routes.js`](../backend/src/routes/payment.routes.js) | Route wiring |
| [`backend/src/server.js`](../backend/src/server.js) | Mounts the webhook route with a raw body parser, before `express.json()` |
| [`customer/src/components/CardPaymentForm.jsx`](../customer/src/components/CardPaymentForm.jsx) | Stripe Elements UI |
| [`customer/src/store/api/paymentApi.js`](../customer/src/store/api/paymentApi.js) | RTK Query endpoints |

## Why the card form never touches your server

Stripe Elements renders the actual card inputs inside a Stripe-hosted iframe.
Card numbers go straight from the browser to Stripe — never through this app's
frontend JS or backend. That keeps the project out of PCI-DSS scope for handling
raw card data. The backend only ever sees a Stripe **PaymentIntent id** and an
**amount** it calculated itself from the order.

## The flow

```
Customer                 Backend                          Stripe
   |                         |                                |
   | place order (COD/card)  |                                |
   |------------------------>| Order created, paymentStatus:  |
   |                         |   pending                      |
   |                         |                                |
   | open card form          |                                |
   |------------------------>| POST /payments/payment-intent  |
   |                         |------------------------------->| create/reuse PaymentIntent
   |                         |<-------------------------------| clientSecret
   |<------------------------|                                |
   | stripe.confirmPayment() |                                |
   |----------------------------------------------------------->| card charged
   |                         |                                |
   |                         |<-------------------------------| webhook: payment_intent.succeeded
   |                         | order.paymentStatus = paid     |
   |                         | notify (DB + socket)           |
   |                         |                                |
   | POST /payments/sync/:id |                                |
   |------------------------>|------------------------------->| retrieve PaymentIntent (belt & suspenders)
   |                         |<-------------------------------|
   |<------------------------| order (already paid, or now)   |
```

The **webhook** is the source of truth for "is this paid" — never the browser
redirect or the `confirmPayment()` result alone, since a user could close the tab
mid-flow or the network call could fail after the charge succeeded. The **sync**
endpoint exists so the customer doesn't have to wait for the webhook to land
(webhooks can lag, and locally they require running `stripe listen`). Both paths
call the same `markOrderPaid()` helper, which is idempotent — whichever arrives
first wins, the second is a no-op.

## Endpoints

All under `/api/payments`, all require the caller to own the order (or be admin)
except `/config`.

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /config` | none | Tells the frontend whether card payments are enabled and gives it the publishable key — see [Where the publishable key comes from](#where-the-publishable-key-comes-from) |
| `POST /payment-intent` `{ orderId }` | required | Creates (or reuses) a PaymentIntent for the order, returns `clientSecret` for Stripe Elements |
| `POST /checkout-session` `{ orderId }` | required | Creates a hosted Checkout Session, returns its `url` |
| `POST /webhook` | Stripe signature | Stripe calls this; marks orders paid/failed |
| `POST /sync/:orderId` | required | Asks Stripe directly for the PaymentIntent status and updates the order to match |

### Amount and currency always come from the server

`createPaymentIntent` computes `amount = Math.round(order.totalAmount * 100)` from
the **stored** order, never from anything the client sends. Currency is a single
hardcoded constant (`CURRENCY = "pkr"` in `payment.controller.js`) — change it there
if you need multi-currency. Stripe amounts are always in the smallest unit (cents,
or in PKR's case there are no subunits, so it's just the whole number × 100 per
Stripe's convention for zero-decimal-adjacent currencies — check
[Stripe's currency docs](https://docs.stripe.com/currencies) if you switch currency).

### One PaymentIntent per order

`order.paymentIntentId` (schema field, `select: false` so it's never sent to the
client) stores the intent id after the first `payment-intent` call. On a later call
for the same order, the existing intent is reused/updated rather than creating a
new one — this stops the Stripe dashboard from filling up with abandoned intents
every time a customer refreshes the checkout page. If the existing intent already
succeeded/is processing, the endpoint returns a `409` instead of risking a double
charge.

### Where the publishable key comes from

The frontend does **not** have a `VITE_STRIPE_PUBLISHABLE_KEY` env var. It fetches
the key from `GET /api/payments/config` instead. This means:
- Rotating the key only requires updating the backend env var, no frontend rebuild
- If Stripe isn't configured on the backend, `cardPaymentsEnabled: false` comes back and the customer UI disables the card option instead of erroring

## Webhook setup

### Local development

```bash
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

This prints a `whsec_...` value — put it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`.
Without running `stripe listen`, the webhook never fires locally, which is exactly
why `POST /payments/sync/:orderId` exists as a local-dev-friendly alternative — the
customer UI calls it automatically right after `confirmPayment()` succeeds.

### Production setup

1. Deploy the backend first (see [render-deployment.md](render-deployment.md)) — you need its live URL.
2. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
3. Endpoint URL: `https://<your-backend>.onrender.com/api/payments/webhook`
4. Events to send — the controller only reacts to these, no need to select more:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** shown after creating the endpoint into the backend's
   `STRIPE_WEBHOOK_SECRET` env var on Render.
6. Switch `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` from `sk_test_.../pk_test_...`
   to the live equivalents once you're ready to accept real payments — until then,
   test-mode keys work end-to-end with [Stripe's test cards](https://docs.stripe.com/testing#cards).

### Why the webhook route is special in `server.js`

```js
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);
```

This is mounted **before** `express.json()`, `xss()`, and the rate limiter. Stripe
signs the exact raw request bytes; if `express.json()` parses the body into an
object first (or `xss()` mutates it), `stripe.webhooks.constructEvent()` can no
longer verify the signature and every webhook call fails with a 400.

## Checkout Session (fallback path)

`createCheckoutSession` / `POST /checkout-session` builds a Stripe-hosted payment
page (`session.url`) and is a complete, working alternative to the Elements flow —
useful if you'd rather not embed a card form at all. It isn't currently called from
any customer UI page (`useCreateCheckoutSessionMutation` is exported from
`paymentApi.js` but unused), so wiring a "pay on Stripe's page" button just means
calling that mutation and redirecting to the returned URL. It shares the same
webhook handler and the same idempotent `markOrderPaid()`, so no backend changes
are needed to start using it.

## Extending this

- **Refunds**: no refund endpoint exists yet. You'd add a controller action calling
  `stripe.refunds.create({ payment_intent: order.paymentIntentId })`, guarded to
  admin only, and set `order.paymentStatus = "refunded"` (the enum already allows it).
- **Other payment methods**: `createPaymentIntent` already passes
  `automatic_payment_methods: { enabled: true }`, so any payment method you turn on
  in the Stripe Dashboard (e.g. Google Pay, wallets available in your account's
  country) shows up in the `PaymentElement` automatically — no code change needed.
