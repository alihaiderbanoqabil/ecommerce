# Postman API Documentation — bano-qabil-backend

This folder holds the complete, importable Postman documentation for the backend API.

| File | Purpose |
| --- | --- |
| `bano-qabil-backend-api.postman_collection.json` | **Import this one.** The collection — 46 requests across 10 folders, with full markdown docs, example responses and test scripts. Named *Bano Qabil Backend API*. |
| `bano-qabil-backend.postman_collection.json` | Identical, but named *bano-qabil-backend*. Only use it if no collection by that name already exists in your workspace. |
| `bano-qabil-local.postman_environment.json` | Environment holding `base_url`, `token` and the id variables the scripts populate |

> **Import fails with "Failed to import collection"?**
> Postman's secret scanner blocks the save when a collection contains a JWT-shaped string —
> even a fake one in a description or a saved example. The real error only appears in
> `~/Library/Application Support/Postman/logs/renderer-requester.log`:
> `Save blocked: Save blocked due to detected secrets`.
>
> That is why sample tokens in this collection are written as `<your-jwt-token-here>`
> rather than realistic `eyJ...` values. **Never paste a real JWT into a description or
> example** — the collection will stop importing for everyone you share it with.

---

## 1. Import into Postman

1. Open Postman → **Import** (top-left).
2. Drag both JSON files in, or use **Files → Choose files** and select them together.
3. Click **Import**.

You now have a collection named **bano-qabil-backend** and an environment named **bano-qabil-local**.

> Already have a `bano-qabil-backend` collection? Postman imports a second one rather than merging.
> Delete the old empty collection, or rename it, to avoid confusion.

## 2. Select the environment

Top-right environment dropdown → pick **bano-qabil-local**.
Nothing works without this — `{{base_url}}` and `{{token}}` resolve from it.

## 3. Run the API locally

```bash
cd backend && npm install && npm run dev
```

Requires a `.env` in `backend/` with at least:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/bano-qabil
JWT_SECRET=your-secret-here
FRONTEND_URL=http://localhost:3000
# Optional — only needed for verification emails
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

If your `PORT` is not `5000`, update `base_url` in the environment.

## 4. Get a session

1. **Auth → Register (Admin)** — one time per fresh database.
2. **Auth → Login** — the JWT comes back as an **httpOnly cookie**, not in the response body. Postman stores it in its cookie jar and replays it on every later request.
3. **Auth → Logout** — clears the cookie.

The login script also copies the cookie value into the `token` environment variable, so the collection-level `Authorization: Bearer {{token}}` header keeps working for anything that prefers the header path. Either one authenticates.

> Cookie not being sent? Check the **Cookies** link under the Send button — the jar must hold `token` for `localhost`. Turning off *Settings → General → Automatically follow redirects* has no effect on this; clearing the jar does.

## 5. Suggested run order

```
Auth → Register (Admin)
Auth → Login                      (sets the session cookie)
Categories → Create Category      (sets category_id)
Products  → Create Product        (sets product_id, uses category_id)
Orders    → Create Order          (sets order_id, uses product_id)
Comments  → Create Comment        (sets comment_id, uses product_id)
Comments  → Reply To A Comment    (uses comment_id)
```

Ids chain automatically through environment variables, so the folders can also be run top-to-bottom with the **Collection Runner**.

---

## Sharing this documentation with your team

### Option A — Share the files (works offline, no Postman account needed)

Both JSON files are committed in this folder. A teammate clones the repo and imports them exactly as in step 1.

Best for classroom / batch use: no paid plan, no workspace invites, nothing expires.

### Option B — Publish public API docs (a shareable web link)

1. In Postman, hover the **bano-qabil-backend** collection → **⋯** → **View documentation**.
2. Click **Publish** (or the **Publish docs** button at the top of the collection overview).
3. Choose the environment to display alongside — pick **bano-qabil-local** so readers see the variable names.
4. Publish. You get a public URL like `https://documenter.getpostman.com/view/<id>/<slug>`.

The page renders every description, table and example in this collection, and includes a **Run in Postman** button that imports the whole thing in one click.

> Published docs are **public to anyone with the link**. Make sure no real secret ever sits in the environment before publishing — see the warning below.

### Option C — Share inside a Postman workspace (best for collaboration)

1. Create a **Team workspace** (you already have one — it shows in the top bar).
2. Move or copy the collection into it: collection **⋯** → **Move** / **Share**.
3. **Invite** teammates by email, or set the workspace to *Team* visibility.

Everyone sees the same collection, and edits sync live. The free plan allows a limited number of collaborators.

### Option D — Share link to the collection

Collection **⋯** → **Share** → **Via link**. Generates a link that lets someone fork or view the collection without joining the workspace.

---

## Before you share — secret hygiene

The environment is committed with **placeholder** values only:

- `token` is empty and typed as `secret`
- `admin_password` is the throwaway `Admin@1234`

Rules to keep it that way:

1. Never commit or publish an environment containing a real JWT, a real password, or a production `MONGO_URI`.
2. When exporting an environment from Postman to re-share, choose **"Export with unresolved secret variable values"** so `secret`-typed values are blanked out.
3. `base_url` points at `localhost` — for a staging or production URL, create a **separate** environment (`bano-qabil-staging`) rather than editing this one.

---

## Notes on API behaviour worth knowing before testing

These are documented in detail on the individual requests, but they trip people up first:

- **Email verification gate.** Registering with an explicit `role: "customer"` leaves `isEmailVerified: false`, and login then returns `403`. Omit `role` entirely (or use `role: "admin"`) to get an account you can log in with immediately.
- **Rate limit.** 100 requests per 15 minutes per IP, applied globally. A full Collection Runner pass uses ~36 of them.
- **Login returns no token.** It is an httpOnly cookie now, and the user object comes back under `data` (register still uses `user`). A frontend must send `credentials: "include"` / `withCredentials: true`, and its origin must be in the CORS allow-list in `server.js` (`localhost:3000` and `localhost:5173` by default).
- **Logout is not authenticated on purpose** — an expired token must still be able to clear its own cookie, so the route always answers `200`.
- **Logout does not revoke the JWT.** It removes the cookie; a copied token stays valid until it expires.
- **Uploads are multipart.** Do not set `Content-Type` by hand on the category/product create and update requests — Postman needs to generate the multipart boundary itself.
- **Product images are replaced, not appended,** on `PATCH /api/products/:id`.
- **`GET /api/products` only returns `isActive: true` products.** Fetching by id ignores that filter.
- **`GET /api/users` is paginated now** — 10 per page by default, so an old client reading `data` as the complete list will only see the first page.
- **`GET /api/categories` returns a nested tree by default** and switches to a flat paginated list when you send `flat=true`, `search`, `page` or `limit`. The `mode` field in the response says which one you got.
- **Comments need a product that is `isActive: true`.** Commenting on a hidden product returns `400`.
- **One rating per user per product.** A second rated comment returns `400 You have already rated this product` — `PATCH` the first one instead. Text-only comments have no such limit.
- **Product rating fields are derived.** `averageRating` / `numReviews` are written by the Comment model, never by the product routes — sending them in a product body has no lasting effect.
- **Deletes cascade.** Deleting a comment removes its replies; deleting a product removes all of its comments.
- **Order pricing is server-side.** `price`/`totalAmount` sent by the client are ignored — the server reads prices from the product catalogue, computes the total, and decrements stock. Cancelling an order restores it.
- **Customers can only cancel**, not set any other order status, and not after the order has shipped.
- **`POST /api/auth/forgot-password` always answers the same** whether the email exists or not (no user enumeration). With no SMTP configured the reset link is printed to the backend console.
- **Password reset links are one-time** — the token is stored on the user and cleared on use.
- **Card payments need Stripe keys.** With `STRIPE_SECRET_KEY` unset, `/api/payments/config` reports `cardPaymentsEnabled: false`, the other payment routes answer `503`, and the storefront disables its Card option. Everything else (COD orders, browsing) works regardless.
- **Only the Stripe webhook marks an order paid** — not the `success_url`, which a customer could open by hand.
- **`?pagination=false` returns everything** on any list route, in the same response shape (`pagination.paginated: false`). Use it for dropdowns and exports, not for the main product grid.
- **`GET /api/orders?search=` searches orders.** For admins it matches the customer's name, email **or** an order id; for customers it matches an order id only, always scoped to their own orders. Short ids (`#77EA296E`) and full ids both work.
- **Notifications are stored, not just emitted** — `GET /api/notifications` is what survives a refresh; the socket is only the live copy.
- **Socket.IO shares the port and the auth cookie.** `product:new` goes to everyone, `order:status` only to the order's owner, `order:new` only to admins.
