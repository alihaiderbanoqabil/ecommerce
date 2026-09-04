import { Link } from "react-router-dom";
import { ShoppingCart, ImageOff } from "lucide-react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import Rating from "./Rating";
import { addToCart } from "../store/slices/cartSlice";
import { formatCurrency } from "../utils/format";

// `view` sirf layout badalta hai — image/badge/rating/price wale tukre dono
// mein wohi hain, is liye markup do jagah likhne ki zarorat nahi pari.
export default function ProductCard({ product, view = "grid" }) {
  const dispatch = useDispatch();
  const outOfStock = product.stock <= 0;
  const isList = view === "list";

  const handleAdd = (event) => {
    // Card khud ek Link hai — button ka click navigation trigger na kare
    event.preventDefault();
    event.stopPropagation();

    dispatch(addToCart(product));
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link
      to={`/products/${product._id}`}
      className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-lg ${
        isList ? "flex" : "flex flex-col"
      }`}
    >
      <div
        className={`relative aspect-square shrink-0 overflow-hidden bg-slate-100 ${
          isList ? "w-28 sm:w-44" : ""
        }`}
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="h-10 w-10 text-slate-300" />
          </div>
        )}

        {outOfStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        ) : product.stock <= 5 ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-medium text-white">
            Only {product.stock} left
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {product.category?.name ? (
          <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {product.category.name}
          </span>
        ) : null}

        <h3
          className={`mt-1 line-clamp-2 font-semibold text-slate-800 ${isList ? "text-base" : "text-sm"}`}
        >
          {product.name}
        </h3>

        {/* Description sirf list mein — grid card mein itni jagah hi nahi hoti */}
        {isList && product.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{product.description}</p>
        ) : null}

        <div className="mt-2">
          <Rating value={product.averageRating} count={product.numReviews} size={14} />
        </div>

        <div className={`flex items-center justify-between gap-2 ${isList ? "mt-auto pt-3" : "mt-4"}`}>
          <span className="text-base font-bold text-slate-900">{formatCurrency(product.price)}</span>

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label="Add to cart"
            className={`flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isList ? "px-3 sm:px-4" : "w-9"
            }`}
          >
            <ShoppingCart size={16} />
            {/* Chhoti screen par sirf icon — warna price ke sath row tang ho jati hai */}
            {isList ? <span className="hidden text-sm font-medium sm:inline">Add to cart</span> : null}
          </button>
        </div>
      </div>
    </Link>
  );
}
