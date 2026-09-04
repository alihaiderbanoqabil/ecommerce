import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Trash2, Minus, Plus, ShoppingCart, ImageOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import {
  removeFromCart,
  updateQuantity,
  clearCart,
  selectCartItems,
  selectCartTotal,
} from "../store/slices/cartSlice";
import { formatCurrency } from "../utils/format";
import useAuthUser from "../hooks/useAuthUser";

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { user } = useAuthUser();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Browse the store and add a few things you like."
        actionLabel="Start shopping"
        actionTo="/products"
      />
    );
  }

  const handleCheckout = () => {
    // Guest ko login par bhejte hain, magar wapis checkout par laane ke liye
    // `from` state saath bhejte hain
    if (!user) {
      toast("Please log in to place your order");
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }
    navigate("/checkout");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Your cart</h1>
        <button
          type="button"
          onClick={() => {
            dispatch(clearCart());
            toast.success("Cart cleared");
          }}
          className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
        >
          Clear cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <li
              key={item._id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <Link to={`/products/${item._id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageOff className="h-6 w-6 text-slate-300" />
                  </div>
                )}
              </Link>

              <div className="min-w-40 flex-1">
                <Link
                  to={`/products/${item._id}`}
                  className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-brand-600"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-slate-500">{formatCurrency(item.price)} each</p>
                {item.quantity >= item.stock ? (
                  <p className="mt-1 text-xs text-amber-600">Only {item.stock} in stock</p>
                ) : null}
              </div>

              <div className="flex items-center rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => dispatch(updateQuantity({ _id: item._id, quantity: item.quantity - 1 }))}
                  disabled={item.quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => dispatch(updateQuantity({ _id: item._id, quantity: item.quantity + 1 }))}
                  disabled={item.quantity >= item.stock}
                  className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              <p className="w-24 text-right text-sm font-bold text-slate-900">
                {formatCurrency(item.price * item.quantity)}
              </p>

              <button
                type="button"
                onClick={() => {
                  dispatch(removeFromCart(item._id));
                  toast.success("Removed from cart");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>

        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Order summary</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Items</dt>
              <dd className="font-medium text-slate-800">{items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-800">{formatCurrency(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Shipping</dt>
              <dd className="font-medium text-emerald-600">Free</dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
            <span className="text-sm font-semibold text-slate-800">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Proceed to checkout <ArrowRight size={16} />
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            Final prices are confirmed by the server at checkout
          </p>
        </div>
      </div>
    </div>
  );
}
