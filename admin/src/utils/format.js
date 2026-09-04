export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value) || 0);

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// Mongo ObjectId 24 characters ka hota hai — table mein poora dikhana bekar hai,
// aakhri 6 characters se admin ek order ko pehchan leta hai.
// Order id ka wo hissa jo user ko dikhaya jata hai. 8 characters — customer
// portal, notifications aur ye table sab ek jaisi id dikhayen, kyunke ab yehi
// id search box mein daali jati hai (support call par bhi yehi padhi jayegi).
export const shortId = (id) => (id ? `#${String(id).slice(-8).toUpperCase()}` : "—");

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
export const PAYMENT_METHODS = ["card", "cod", "paypal"];

export const ORDER_STATUS_COLORS = {
  pending: "gold",
  processing: "blue",
  shipped: "geekblue",
  delivered: "green",
  cancelled: "red",
};

export const PAYMENT_STATUS_COLORS = {
  pending: "gold",
  paid: "green",
  failed: "red",
  refunded: "default",
};

export const LOW_STOCK_THRESHOLD = 5;

// Select ke options banane ka chhota helper — har page mein map dohrana na paray
export const toOptions = (values) => values.map((value) => ({ value, label: value }));
