import { Link, Outlet } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

// Login / register / password pages — center mein ek card, koi nav clutter nahi
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-slate-900">
        <ShoppingBag className="h-7 w-7 text-brand-600" />
        ShopKart
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Outlet />
      </div>

      <Link to="/" className="mt-8 text-sm text-slate-500 transition hover:text-slate-700">
        ← Back to store
      </Link>
    </div>
  );
}
