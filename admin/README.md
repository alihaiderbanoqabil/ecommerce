# Admin portal

Ant Design + React 19 + RTK Query. Left sidebar wala management side.

## Chalane ka tareeqa

```bash
# 1. Backend pehle (dusre terminal mein)
cd ../backend && npm run dev        # http://localhost:5000

# 2. Ye app
npm install
npm run dev                         # http://localhost:5174
```

Login ke liye admin account chahiye. Seed script ek bana deta hai:

```bash
cd ../backend && npm run seed
# admin@example.com / Admin@123
```

Customer app ki tarah yahan bhi `/api` aur `/uploads` proxy hote hain, aur auth
httpOnly cookie se chalti hai.

## Structure

| Path | Kaam |
| --- | --- |
| `src/routes/index.jsx` | **saare routes ek file mein** — App.jsx sirf `useRoutes()` karta hai |
| `src/store/api/baseApi.js` | ek RTK Query slice; baqi files `injectEndpoints` se add hoti hain |
| `src/components/RequireAdmin.jsx` | login + `role === "admin"` dono check karta hai |
| `src/layouts/AdminLayout.jsx` | collapsible left sidebar + header |

## Screens

- **Dashboard** — revenue/orders/products/users cards, orders by status, 7-din
  ka sales chart, top products, low stock, recent orders
- **Products** — server-side table (search, category filter, price range, sort,
  pagination), create/edit drawer with multi-image upload, delete
- **Categories** — flat table + create/edit modal (parent category, image)
- **Orders** — status aur payment status inline update, detail drawer
- **Users** — role change, delete (apna account nahi)
- **Comments** — hide/restore moderation aur delete

## Realtime (Socket.IO)

Header mein notification bell hai. `src/components/RealtimeListener.jsx`
`order:new` aur `order:payment` sunta hai, antd notification dikhata hai, aur
`Stats` + `Order` tags invalidate karta hai — is liye **dashboard ke numbers
aur orders table bina reload khud update ho jate hain**.

Server handshake par cookie dekh kar admin ko `admins` room mein daalta hai,
to sirf admins ko ye events milte hain.

### Notifications rehti hain (persist)

Socket sirf un tak pohanchata hai jo us waqt juday hue hain, is liye har
notification pehle server par save hoti hai (`Notification` model,
`audience: "admins"`), phir emit hoti hai. Nateeja:

- portal band kar ke jane ke baad wapis aayen to darmiyan mein aayi orders
  bell mein mojood hoti hain
- page refresh par notifications gayab nahi hotin
- "mark as read" (ek) aur "mark all as read" server par mehfooz rehte hain,
  aur **har admin ka read state alag hota hai** — ek admin ke parhne se
  doosre ka badge saaf nahi hota

Bell `useGetNotificationsQuery` se list leta hai; live event aane par
`updateQueryData` se list ke upar naya item lag jata hai (refetch ke bagair).

Admin ko customer wali notifications (naya product) nahi dikhtin — wo product
usne khud banaya hota hai. Server role dekh kar filter karta hai.

## Note

Ye portal sirf admin ke liye hai. Customer role se login karne par app foran
logout kara deta hai — shopping side alag app (`../customer`) hai.

## Ek zaroori local-dev baat: cookie ports ke darmiyan share hoti hai

Browser cookies **host** se bandhi hoti hain, port se nahi. Iska matlab:
`localhost:5173` (customer) aur `localhost:5174` (admin) **ek hi** `token`
cookie use karte hain — ek app mein login karne se doosri app ki session
overwrite ho jati hai.

Dono ko ek waqt mein alag sessions ke sath chalana ho to ek app ko
`127.0.0.1` par kholein (`http://127.0.0.1:5174`) — browser uske liye alag
cookie jar rakhta hai. Production mein masla nahi aata, kyunke wahan domains
alag hote hain (`shop.example.com` vs `admin.example.com`).
