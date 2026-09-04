# Customer storefront

Tailwind + React 19 + RTK Query. Top navigation wala shopping side.

## Chalane ka tareeqa

```bash
# 1. Backend pehle (dusre terminal mein)
cd ../backend && npm run dev        # http://localhost:5000

# 2. Ye app
npm install
npm run dev                         # http://localhost:5173
```

Vite dev server `/api` aur `/uploads` ko backend par proxy karta hai — is liye
browser ke liye sab kuch same-origin hai aur httpOnly auth cookie bina
CORS/SameSite jhanjhat ke chalti hai. Isi wajah se RTK Query mein baseUrl sirf
`/api` hai, poora `http://localhost:5000` nahi.

Pehli baar chala rahe hain to backend mein seed data daal lein:

```bash
cd ../backend && npm run seed
```

## Structure

| Path | Kaam |
| --- | --- |
| `src/routes/index.jsx` | **saare routes ek file mein** — App.jsx sirf `useRoutes()` karta hai |
| `src/store/api/baseApi.js` | ek RTK Query slice; baqi files `injectEndpoints` se add hoti hain |
| `src/store/slices/cartSlice.js` | cart localStorage mein (backend mein cart model nahi hai) |
| `src/components/RequireAuth.jsx` | protected routes — `/auth/me` se session check |
| `src/layouts/` | `CustomerLayout` (top nav) aur `AuthLayout` (login/register card) |

## Flows

- **Browse** — home (categories + top rated + new arrivals), products list with
  search / category / price range / rating filter / sort / pagination (sab URL
  mein rehta hai, is liye link share ho sakta hai), product detail with gallery
- **Reviews** — rating summary, review likhna/edit karna, reply karna, apna
  comment delete karna. Ek product par ek hi rating (backend rule)
- **Cart** — quantity stepper stock ki limit ke sath, localStorage mein persist
- **Checkout** — address + payment method, validations ke sath. Price server se
  aata hai (client jo bheje ignore hota hai), stock wahin check hota hai
- **Orders** — apni orders (status filter), detail page with progress steps,
  shipped hone se pehle cancel (stock wapis chala jata hai)
- **Auth** — register → email verification → login, forgot/reset password,
  profile edit + password change

## Realtime (Socket.IO)

`src/socket.js` ek hi socket banata hai; `src/components/RealtimeListener.jsx`
App mein mount hai aur events ko teen cheezon mein badalta hai: toast, bell ki
list, aur RTK Query cache invalidation — yani UI khud refresh ho jata hai.

| Event | Kisko | Kya hota hai |
| --- | --- | --- |
| `product:new` | sab ko (guest bhi) | clickable toast + bell, product list stale |
| `order:status` | sirf us order ke malik ko | toast + bell, us order ka cache stale |
| `order:payment` | order ke malik ko | payment paid/failed ka toast, order stale |

URL nahi diya jata — socket usi origin se judta hai aur vite `/socket.io` ko
backend par proxy karta hai (`ws: true`), is liye auth cookie khud chali jati hai.

### Notifications rehti hain (persist)

Socket sirf un tak pohanchata hai jo abhi juday hue hain. Is liye har
notification pehle server par save hoti hai (`Notification` model), phir emit
hoti hai. Nateeja:

- page refresh karne par notifications gayab nahi hotin
- jo notification aap ke offline hone ke doran aayi thi, wapis aane par mil jati hai
- "mark as read" (ek) aur "mark all as read" dono server par mehfooz rehte hain

Bell `useGetNotificationsQuery` se list leta hai; socket event aane par
`updateQueryData` se list ke upar naya item lag jata hai (refetch ke bagair).
Mark-as-read optimistic hai — badge foran girta hai, request fail ho to
`patch.undo()` wapis le aata hai.

Guest ko live toast to milta hai magar list nahi (notification kisi user ke
sath bandhi hoti hai), is liye guest ke liye bell chhupi rehti hai.

## Payments (Stripe)

Card ka form site par hi khulta hai — **Stripe Elements**. Card ki details
Stripe ke iframe se seedha Stripe ko jati hain, hamare JS ya server ke paas
kabhi nahi aatin.

Flow: card chuno → order banti hai (`paymentStatus: pending`) → order page par
card form (`?pay=1`) → `POST /api/payments/payment-intent` se `clientSecret` →
`stripe.confirmPayment()`.

**Paid** hone ka faisla webhook karta hai, browser nahi — is liye payment ke
foran baad page "confirming your payment" dikhata hai, aur webhook aate hi
socket se khud paid ho jata hai. Order detail par "Pay now with card" button
har unpaid order ke liye mojood rehta hai, to beech mein chhora hua payment
baad mein pura kiya ja sakta hai.

Publishable key frontend ke `.env` mein nahi — `/api/payments/config` se aati
hai. Stripe ki keys server par na hon to Card option khud disabled ho jata hai.

Tafseel: [`docs/stripe-integration.md`](../docs/stripe-integration.md) aur
[`docs/socketio-integration.md`](../docs/socketio-integration.md).

## Notes

- Register jaan boojh kar `role: "customer"` bhejta hai, is liye account
  unverified banta hai aur verification email jata hai. Email verify hone tak
  login 403 deta hai. Local par SMTP set na ho to backend console mein link
  print ho jata hai.
- Token localStorage mein kahin nahi — httpOnly cookie hi session hai.

## Ek zaroori local-dev baat: cookie ports ke darmiyan share hoti hai

Browser cookies **host** se bandhi hoti hain, port se nahi. Iska matlab:
`localhost:5173` (customer) aur `localhost:5174` (admin) **ek hi** `token`
cookie use karte hain — ek app mein login karne se doosri app ki session
overwrite ho jati hai.

Dono ko ek waqt mein alag sessions ke sath chalana ho to ek app ko
`127.0.0.1` par kholein (`http://127.0.0.1:5174`) — browser uske liye alag
cookie jar rakhta hai. Production mein masla nahi aata, kyunke wahan domains
alag hote hain (`shop.example.com` vs `admin.example.com`).
