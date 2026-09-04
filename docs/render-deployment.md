# Deploying to Render

This project is three independent apps that get deployed as three separate Render
services:

| App | Render service type | Root directory |
| --- | --- | --- |
| `backend` | Web Service (Node) | `backend` |
| `customer` | Static Site | `customer` |
| `admin` | Static Site | `admin` |

Render doesn't host MongoDB, so the database lives on **MongoDB Atlas** (free tier
is enough). Uploaded images (Cloudinary) and payments (Stripe) are third-party
services either way, so nothing changes there except which keys you use.

The three apps don't share a domain in production, so the backend and the two
frontends talk to each other **cross-origin**: the frontends call the backend by
its full `https://...onrender.com` URL, the backend allows those origins via CORS,
and the auth cookie is issued with `SameSite=None; Secure` so it still gets sent
across origins. That wiring already exists in the code — see the callouts below
for exactly which env vars drive it.

## Prerequisites

- This repo pushed to GitHub (Render deploys from a Git repo)
- A [Render](https://render.com) account
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account
- A [Stripe](https://dashboard.stripe.com/register) account (test mode is fine to start — see [stripe-integration.md](stripe-integration.md))
- Optional: a [Cloudinary](https://cloudinary.com) account (see the "Uploaded images" note in Step 2)

## Step 1 — MongoDB Atlas

1. Create a free (M0) cluster.
2. **Database Access** → add a database user with a strong password (not your Atlas login password).
3. **Network Access** → add `0.0.0.0/0`. Render's outbound IPs aren't static on standard plans, so this is the practical option for a small project — it's still gated by the username/password.
4. **Connect** → "Drivers" → copy the connection string, e.g.:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ecommerce?retryWrites=true&w=majority
   ```
   Keep the database name (`ecommerce` above) — that's your `MONGO_URI`.

## Step 2 — Backend (Render Web Service)

1. Render dashboard → **New** → **Web Service** → connect this repo.
2. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free is fine for testing (see the cold-start note below)
3. **Environment variables** (Render dashboard → Environment). These mirror [`backend/.env.example`](../backend/.env.example):

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PORT` | leave unset — Render injects its own `PORT` and the app already reads `process.env.PORT` |
   | `MONGO_URI` | the Atlas connection string from Step 1 |
   | `JWT_SECRET` | a long random string — generate with `openssl rand -hex 32` |
   | `FRONTEND_URL` | the customer app's URL (Step 3) — used for verification/reset emails and Stripe redirect URLs |
   | `CORS_ORIGINS` | comma-separated customer + admin URLs (Steps 3–4), e.g. `https://shop-xxxx.onrender.com,https://admin-xxxx.onrender.com` |
   | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP creds, optional — without them, verification/reset links are just logged to the Render service's logs |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | needed for `/api/media` and, if you migrate to it, product/category images — see note below |
   | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | from Stripe — see [stripe-integration.md](stripe-integration.md), do this after the backend has a URL (Step 5) |

   You won't have `FRONTEND_URL`/`CORS_ORIGINS` values until Steps 3–4 exist. Deploy once with them pointed at placeholders (or left blank) and come back in Step 5 — Render redeploys automatically whenever you save new env vars.

4. Create the service. Once it's live, note its URL, e.g. `https://ecommerce-backend-xxxx.onrender.com` — every other step needs it.

### ⚠️ Uploaded images: local disk is not persistent on Render

Product and category image uploads (`POST /api/products`, `POST /api/categories`)
use `multer` with **local disk storage** (`backend/uploads/`, served at `/uploads`) —
see [`backend/src/middlewares/index.js`](../backend/src/middlewares/index.js).
Render's standard web services have an **ephemeral filesystem**: anything written
to disk is wiped on every deploy, restart, or free-tier spin-down. Uploaded product
images will silently disappear.

The `/api/media` route already uploads straight to Cloudinary
(`multer-storage-cloudinary`, see [`backend/src/middlewares/cloudinaryUpload.js`](../backend/src/middlewares/cloudinaryUpload.js))
— it's just not the code path that product/category creation uses. Two ways to
handle this before going live with real product images:

- **Recommended: point product/category uploads at Cloudinary too.** In
  [`backend/src/routes/product.routes.js`](../backend/src/routes/product.routes.js) and
  [`backend/src/routes/category.routes.js`](../backend/src/routes/category.routes.js), swap
  `uploadMultiple("images", 5)` / `uploadSingle("image")` for
  `cloudinaryUpload.array("images", 5)` / `cloudinaryUpload.single("image")`. Then in
  [`product.controller.js`](../backend/src/controllers/product.controller.js) and
  [`category.controller.js`](../backend/src/controllers/category.controller.js), read the
  Cloudinary URL directly (`file.path`) instead of building `/uploads/${file.filename}` —
  the frontend's `imageUrl()` helper already passes absolute `http(s)` URLs through
  unchanged, so no frontend change is needed. Set the three `CLOUDINARY_*` env vars.
- **Or: add a Render persistent disk** mounted at `backend/uploads` (Render dashboard →
  service → Disks). This keeps the current code path working, but it's a paid add-on,
  and it only works with a single instance (a persistent disk can't be shared across
  multiple running copies of the service).

Ask if you'd like the Cloudinary swap done — it's a handful of lines in the two files above.

## Step 3 — Customer app (Render Static Site)

1. **New** → **Static Site** → same repo.
2. Settings:
   - **Root Directory**: `customer`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. **Environment variable**:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | the backend URL from Step 2, e.g. `https://ecommerce-backend-xxxx.onrender.com` (no trailing slash, no `/api`) |

   Vite bakes env vars into the build at build time, not at runtime — if you change
   `VITE_API_URL` later, trigger a manual redeploy so the new value takes effect.
4. Add a rewrite rule so client-side routing works on refresh/deep links: **Redirects/Rewrites** → source `/*`, destination `/index.html`, action `Rewrite`.
5. Deploy, note the resulting URL (e.g. `https://shop-xxxx.onrender.com`).

## Step 4 — Admin app (Render Static Site)

Same as Step 3, with:
- **Root Directory**: `admin`
- Same `VITE_API_URL` value (same backend)
- Same SPA rewrite rule (`/*` → `/index.html`)

Note its URL too (e.g. `https://admin-xxxx.onrender.com`).

## Step 5 — Wire CORS back to the backend

Go back to the backend service's Environment settings and set:

- `FRONTEND_URL` = the customer URL from Step 3
- `CORS_ORIGINS` = `<customer URL>,<admin URL>` (comma-separated, no spaces needed)

Save — Render redeploys the backend automatically. Without this, the browser will
block every request from the frontends with a CORS error, since
[`backend/src/config/corsOrigins.js`](../backend/src/config/corsOrigins.js) only
allows `localhost` by default.

## Step 6 — Stripe webhook

Card payments need the backend's live URL, which only exists after Step 2. Follow
[stripe-integration.md § Production setup](stripe-integration.md#production-setup) to
create the webhook endpoint in the Stripe dashboard and set `STRIPE_WEBHOOK_SECRET`.

## Step 7 — Seed data (optional)

To load demo data into the Atlas database, run the seed script **locally** against
the production `MONGO_URI` (Render's free plan doesn't give you an interactive shell):

```bash
cd backend
MONGO_URI="<your Atlas connection string>" node src/seed/seed.js
```

This creates an admin user (`admin@example.com` / `Admin@123`) — change that password
before sharing the deployed URL with anyone.

## Step 8 — Verify

- [ ] Customer app loads, register → login works (auth cookie persists across reload)
- [ ] Admin app loads, log in with the seeded admin, `role !== admin` accounts get bounced
- [ ] Create a product with images in the admin app; images render on the customer app
- [ ] Place an order, pay with a [Stripe test card](https://docs.stripe.com/testing#cards) (`4242 4242 4242 4242`), order flips to `paid`
- [ ] Open the customer app and admin app side by side; confirm the admin gets a live "new order" notification, and the customer sees "payment received" without refreshing (see [socketio-integration.md](socketio-integration.md))
- [ ] Redeploy the backend once (Render → Manual Deploy) and re-check that existing product images still load — this is the real test of the uploads decision in Step 2

## Production considerations

- **Free tier cold starts**: a free Web Service spins down after ~15 minutes idle;
  the next request takes 30–60s to wake it up, and any open Socket.IO connections
  from before the spin-down are gone (clients reconnect automatically once the
  service is back). Fine for a demo, not for a real storefront — upgrade the
  instance type to avoid it.
- **Scaling beyond one instance**: if the backend is ever scaled to multiple
  instances, Socket.IO needs sticky sessions or a shared adapter (Redis) so a
  client's events reach whichever instance it's connected to — see
  [socketio-integration.md § Scaling beyond one instance](socketio-integration.md#scaling-beyond-one-instance).
  A single instance (the default here) doesn't need this.
- **Health check path**: the backend has no dedicated `/health` route; Render's
  default check just needs *some* HTTP response, which `GET /` already gives
  (a 404 JSON body) — no change needed.
- **Secrets**: never commit real values for `JWT_SECRET`, `MONGO_URI`,
  `STRIPE_SECRET_KEY`, or `STRIPE_WEBHOOK_SECRET`. They belong in Render's
  Environment tab only, mirroring `.env.example`, `customer/.env.example`, and
  `admin/.env.example`.
