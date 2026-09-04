import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingCart, ImageOff, Minus, Plus, ChevronLeft, Check, Truck } from "lucide-react";
import toast from "react-hot-toast";
import Rating from "../components/Rating";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import CommentSection from "../components/CommentSection";
import { useGetProductByIdQuery } from "../store/api/productApi";
import { addToCart, selectCartItems } from "../store/slices/cartSlice";
import { formatCurrency } from "../utils/format";

export default function ProductDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading, error, refetch } = useGetProductByIdQuery(id);

  if (isLoading) return <Spinner label="Loading product..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!product) return null;

  const inCart = cartItems.find((item) => item._id === product._id);
  const outOfStock = product.stock <= 0;
  // Cart mein pehle se jitne hain, utne kam add ho sakte hain
  const maxAddable = Math.max(0, product.stock - (inCart?.quantity || 0));

  const handleAddToCart = () => {
    dispatch(addToCart({ ...product, quantity }));
    toast.success(`${quantity} × ${product.name} added to cart`);
    setQuantity(1);
  };

  return (
    <div>
      <Link
        to="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ChevronLeft size={16} /> Back to products
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {product.images?.[activeImage] ? (
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageOff className="h-16 w-16 text-slate-200" />
              </div>
            )}
          </div>

          {product.images?.length > 1 ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    index === activeImage ? "border-brand-600" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          {product.category?.name ? (
            <Link
              to={`/products?category=${product.category._id}`}
              className="text-xs font-semibold uppercase tracking-wide text-brand-600 hover:underline"
            >
              {product.category.name}
            </Link>
          ) : null}

          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-4">
            <Rating value={product.averageRating} count={product.numReviews} />
            {product.sku ? <span className="text-xs text-slate-400">SKU: {product.sku}</span> : null}
          </div>

          <p className="mt-5 text-3xl font-bold text-slate-900">{formatCurrency(product.price)}</p>

          {product.description ? (
            <p className="mt-5 text-sm leading-relaxed text-slate-600">{product.description}</p>
          ) : null}

          <div className="mt-6 space-y-2 text-sm">
            {outOfStock ? (
              <p className="font-medium text-rose-600">Out of stock</p>
            ) : (
              <p className="flex items-center gap-1.5 font-medium text-emerald-600">
                <Check size={16} /> In stock — {product.stock} available
              </p>
            )}
            <p className="flex items-center gap-1.5 text-slate-500">
              <Truck size={16} /> Ships within 24 hours
            </p>
          </div>

          {inCart ? (
            <p className="mt-5 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              {inCart.quantity} already in your{" "}
              <Link to="/cart" className="font-semibold underline">
                cart
              </Link>
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-300 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center text-sm font-semibold text-slate-800">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(maxAddable || 1, value + 1))}
                disabled={quantity >= maxAddable}
                className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock || maxAddable === 0}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none"
            >
              <ShoppingCart size={16} />
              {outOfStock ? "Out of stock" : maxAddable === 0 ? "Max in cart" : "Add to cart"}
            </button>

            <Link
              to="/cart"
              className="flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View cart
            </Link>
          </div>
        </div>
      </div>

      <CommentSection productId={product._id} />
    </div>
  );
}
