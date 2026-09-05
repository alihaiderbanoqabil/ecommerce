# Socket.IO integration

Realtime notifications for both frontends: customers see product/order/payment
updates live, admins see new orders and payments live. Every notification is
also written to MongoDB, so Socket.IO is a "push it now if anyone's listening"
layer on top of a durable notification list — not the only way notifications
are delivered.

Key files:

| File | Role |
| --- | --- |
| [`backend/src/socket/index.js`](../backend/src/socket/index.js) | Server setup, auth, rooms, low-level emit helpers |
| [`backend/src/services/notification.service.js`](../backend/src/services/notification.service.js) | Decides *what* to send and *who to*; writes the DB record, then emits |
| [`backend/src/models/notification.model.js`](../backend/src/models/notification.model.js) | Notification schema, per-user read state |
| [`backend/src/routes/notification.routes.js`](../backend/src/routes/notification.routes.js) | REST endpoints for the persisted list (`GET /api/notifications`, mark-as-read) |
| `customer/src/socket.js`, `admin/src/socket.js` | One shared client socket per app |
| `customer/src/components/RealtimeListener.jsx`, `admin/src/components/RealtimeListener.jsx` | No UI — turns socket events into toasts + cache updates |

## Authentication: the same cookie, no separate token

The client connects with `withCredentials: true` and no auth payload. The server
reads the same httpOnly auth cookie the REST API uses, straight out of the
raw `Cookie` header during the Socket.IO handshake:

```js
// backend/src/socket/index.js
const cookieName = cookieNameFor(socket.handshake.query?.portal); // admin -> admin_token, warna token
const token = readCookie(socket.handshake.headers.cookie, cookieName);
const user = token ? jwt.verify(token, process.env.JWT_SECRET) : null; // invalid/missing = guest, not an error
```

Each portal has its **own** cookie name (`token` for the customer app,
`admin_token` for the admin portal) because cookies are scoped by host, not by
port — one name meant the last portal to log in silently took over the other's
session. The admin socket therefore identifies itself with `query: { portal:
"admin" }`; see [`backend/src/utils/authCookie.js`](../backend/src/utils/authCookie.js)
for the whole rule, and `npm run check:sessions -w backend` for the regression check.
(A custom header wouldn't work here: browsers don't allow custom headers on the
WebSocket upgrade, but handshake query params reach both transports.)

This only works when the browser actually sends that cookie with the WebSocket
handshake, which requires:
- The socket client's origin to be one of the backend's allowed CORS origins (`CORS_ORIGINS` — see [`backend/src/config/corsOrigins.js`](../backend/src/config/corsOrigins.js))
- The cookie's `SameSite`/`Secure` flags to allow cross-site sending in production (`sameSite: "none", secure: true` when `NODE_ENV=production`, set in [`authCookie.js`](../backend/src/utils/authCookie.js)) — which in turn requires the page to be served over HTTPS (Render static sites and web services both are, by default)

A missing or expired token doesn't reject the connection — it just connects as a
guest. Guests still join the broadcast room (see below), so they get live "new
product" toasts, just no persisted notification list (there's no user to attach
one to).

## Rooms

```js
const ROOMS = {
  everyone: "everyone",       // every connected socket, including guests
  admins: "admins",           // every socket whose JWT has role: "admin"
  user: (userId) => `user:${userId}`, // one specific customer
};
```

Room membership is decided **once, at handshake time**, from the JWT — there's no
"subscribe to this order" message from the client. If a user logs in or out, the
client must open a fresh connection so the server re-reads the cookie:

```js
// both RealtimeListener.jsx files do this on mount/user change
if (socket.connected) socket.disconnect();
socket.connect();
```

## Events

| Event | Room | Emitted from | Persisted? |
| --- | --- | --- | --- |
| `connected` | (direct to the connecting socket) | `socket/index.js` on connect | no — just tells the client `{ authenticated, role }` |
| `product:new` | `everyone` | `notifyNewProduct()` | yes, `audience: "all"` |
| `order:status` | `user:<id>` | `notifyOrderStatus()` | yes, targeted |
| `order:payment` | `user:<id>` **and** `admins` (two separate DB records, one broadcast to each) | `notifyPaymentUpdate()` | yes, both |
| `order:new` | `admins` | `notifyNewOrder()` | yes, `audience: "admins"` |

Every `emit*` helper in `notification.service.js` follows the same order: **save
to MongoDB first, then emit.** If the emit is a no-op (no server running, e.g. in
a test or the seed script — `getIO()` returns `null`), the DB record still exists
and shows up next time the client fetches `GET /api/notifications`.

## Why notifications persist across refresh and reconnect

Socket.IO only reaches sockets that are connected *right now*. If an admin closes
the tab for an hour, any orders placed during that hour would be invisible if
notifications were socket-only. The `Notification` model exists to solve exactly
that:

- `user: <id>` → notification belongs to one customer
- `user: null, audience: "all"` → broadcast to customers (e.g. new product)
- `user: null, audience: "admins"` → broadcast to admins

Broadcasts are **one document**, not one per recipient — `readBy: [userId]` tracks
who's dismissed it, so 10,000 customers don't mean 10,000 rows for one new product.
`Notification.filterFor(userId, role)` (a schema static) is the query every client
uses to fetch "my targeted notifications + my role's broadcasts", and
`Notification.toClient(doc, userId)` converts `readBy` into a per-user `read`
boolean before sending the list to the frontend.

On the frontend, the socket handler doesn't refetch the list — it pushes the
live payload directly into the RTK Query cache:

```js
dispatch(
  notificationApi.util.updateQueryData("getNotifications", undefined, (draft) => {
    if (draft.data.some((item) => item._id === payload._id)) return; // dedupe on reconnect
    draft.data.unshift(payload);
    draft.unread += 1;
  })
);
```

The `some(...)` dedupe check matters: if the socket reconnects (network blip,
Render free-tier spin-down) the server doesn't track "already sent" state, so the
same event could in theory arrive twice.

## CORS for the socket server

Socket.IO has its own CORS config, separate from Express's — both read from the
same list now (`backend/src/config/corsOrigins.js`) so there's one `CORS_ORIGINS`
env var to set, not two:

```js
// backend/src/socket/index.js
io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});
```

If you add a new frontend origin (a staging URL, a custom domain), update
`CORS_ORIGINS` once — both HTTP and WebSocket traffic pick it up.

## Local dev vs. production origin

Locally, the client connects with no URL (`io(undefined, opts)`), so it hits
whatever origin served the page, and Vite's dev-server proxy forwards
`/socket.io` (with `ws: true`) to `http://localhost:5000`. In production, the
frontend and backend are on different Render domains with no proxy in between,
so the client needs the backend's actual URL — that's what the `VITE_API_URL`
env var is for (set in Step 3/4 of [render-deployment.md](render-deployment.md)):

```js
// customer/src/socket.js and admin/src/socket.js
export const socket = io(import.meta.env.VITE_API_URL || undefined, { ... });
```

## Scaling beyond one instance

Everything above assumes **one backend instance** holding all socket connections
and room membership in memory (`getIO()` returns a single in-process `Server`).
That's what the default Render Web Service gives you, and it's enough for this
app's traffic.

If you ever scale the backend to multiple instances (Render's "Scaling" tab), two
things break without extra work:
- A client connected to instance A won't receive an event emitted from instance B (e.g. an order placed and handled by a different instance than the admin's socket landed on).
- Socket.IO's default transport upgrade (long-polling → WebSocket) needs repeated requests to land on the **same** instance, which requires sticky sessions.

The fix is the [`@socket.io/redis-adapter`](https://socket.io/docs/v4/redis-adapter/):
each instance publishes emits to Redis, and every instance's clients receive them
regardless of which instance they're connected to. This isn't implemented here —
add it only if/when you actually scale past one instance.

## Debugging checklist

- **Bell never updates live, but refreshing shows the new item**: check the
  browser's Network/WS tab — if there's no WebSocket connection, it's almost
  always CORS (`CORS_ORIGINS` missing the frontend's exact origin) or the cookie
  not being sent (`sameSite`/`secure` mismatch — see [Authentication](#authentication-the-same-cookie-no-separate-token)).
- **Everything works locally, breaks after deploying**: confirm `VITE_API_URL`
  was set *before* the frontend was built — Vite inlines it at build time, so
  adding it after deploy needs a rebuild, not just an env var save.
- **Admin doesn't get `order:new`**: the socket only joins the `admins` room if
  the JWT's `role` is `"admin"` at handshake time — if the account's role
  changed after the socket connected, reconnect (see [Rooms](#rooms)).
