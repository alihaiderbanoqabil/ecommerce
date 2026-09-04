export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value) || 0);

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Backend images ko "/uploads/xxx.png" ki tarah relative rakhta hai (domain
 * save karna galat hota — environment badalte hi links toot jate). Seed data
 * mein poore https URLs bhi hain, is liye dono handle karte hain.
 */
export const imageUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : path;
};

export const ORDER_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export const PAYMENT_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-slate-200 text-slate-700",
};
