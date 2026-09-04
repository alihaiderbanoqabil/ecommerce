import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Package, Menu, X, Search, ShoppingBag } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useLogoutMutation } from "../store/api/authApi";
import { baseApi } from "../store/api/baseApi";
import { clearCart, selectCartCount } from "../store/slices/cartSlice";
import useAuthUser from "../hooks/useAuthUser";
import NotificationBell from "./NotificationBell";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? "text-brand-600" : "text-slate-600 hover:text-slate-900"}`;

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const { user } = useAuthUser();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(term.trim() ? `/products?search=${encodeURIComponent(term.trim())}` : "/products");
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Logout route kabhi fail nahi karta, magar network gir jaye to bata dein
      toast.error("Could not log out, please try again");
      return;
    }

    setMenuOpen(false);
    // Route pehle badalte hain aur cache baad mein — React dono ko ek hi render
    // mein batch karta hai, is liye protected page par baitha user seedha home
    // par aata hai, RequireAuth ke login-redirect se guzre bagair.
    navigate("/", { replace: true });
    // Sirf getMe invalidate karna kaafi nahi hota: failed refetch par purana
    // user cache mein reh jata hai. Poori API state reset karne se hi navbar
    // fauran guest ban jata hai aur pichle user ki orders bhi cache se nikal
    // jati hain.
    dispatch(baseApi.util.resetApiState());
    // Cart localStorage mein hai — agli baar koi aur is browser par login kare
    // to usay pichle user ka cart na mile
    dispatch(clearCart());
    toast.success("Logged out");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShoppingBag className="h-6 w-6 text-brand-600" />
          ShopKart
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
          {user ? (
            <NavLink to="/orders" className={navLinkClass}>
              My Orders
            </NavLink>
          ) : null}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden max-w-xs flex-1 lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-100"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-4">
          <NotificationBell />

          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            aria-label="Cart"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <div className="hidden items-center gap-1 md:flex">
              <Link
                to="/profile"
                className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <User size={18} />
                <span className="max-w-24 truncate">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </form>

          <div className="flex flex-col gap-1">
            <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Home
            </Link>
            <Link to="/products" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Products
            </Link>

            {user ? (
              <>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <Package size={16} /> My Orders
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <User size={16} /> {user.name}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <LogOut size={16} /> Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
