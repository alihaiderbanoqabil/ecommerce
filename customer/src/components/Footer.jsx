import { ShoppingBag } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <ShoppingBag className="h-5 w-5 text-brand-600" />
            ShopKart
          </div>
          <p className="text-sm text-slate-500">
            Bano Qabil 5.0 — MERN e-commerce project
          </p>
        </div>
      </div>
    </footer>
  );
}
