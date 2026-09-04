import { Link } from "react-router-dom";
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Layers } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import { useGetProductsQuery } from "../store/api/productApi";
import { useGetCategoryTreeQuery } from "../store/api/categoryApi";

const perks = [
  { icon: Truck, title: "Fast delivery", text: "Orders dispatched within 24 hours" },
  { icon: ShieldCheck, title: "Secure checkout", text: "Your session never leaves the cookie" },
  { icon: RotateCcw, title: "Easy returns", text: "Cancel any order before it ships" },
];

export default function Home() {
  // Do alag queries — RTK Query dono ko cache karti hai, is liye wapis aane
  // par network hit nahi hoti
  const featured = useGetProductsQuery({ sort: "-averageRating", limit: 8 });
  const newest = useGetProductsQuery({ sort: "-createdAt", limit: 4 });
  const categories = useGetCategoryTreeQuery();

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 px-6 py-14 text-white sm:px-12 sm:py-20">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            Bano Qabil 5.0
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            Everything you need, in one shop
          </h1>
          <p className="mt-4 text-base text-white/80 sm:text-lg">
            Browse hundreds of products across electronics, clothing, home and more. Real ratings from
            real customers.
          </p>
          <Link
            to="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-slate-100"
          >
            Start shopping <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="rounded-xl bg-brand-50 p-2.5">
              <Icon className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Shop by category</h2>
            <p className="mt-1 text-sm text-slate-500">Pick a department to narrow things down</p>
          </div>
        </div>

        {categories.isLoading ? (
          <Spinner label="Loading categories..." />
        ) : categories.error ? (
          <ErrorState error={categories.error} onRetry={categories.refetch} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(categories.data?.data || []).map((category) => (
              <Link
                key={category._id}
                to={`/products?category=${category._id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="aspect-video overflow-hidden bg-slate-100">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Layers className="h-7 w-7 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-slate-800">{category.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {category.subCategories?.length || 0} sub-categories
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Top rated</h2>
            <p className="mt-1 text-sm text-slate-500">What customers are rating highest</p>
          </div>
          <Link to="/products?sort=-averageRating" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>

        {featured.isLoading ? (
          <Spinner />
        ) : featured.error ? (
          <ErrorState error={featured.error} onRetry={featured.refetch} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(featured.data?.data || []).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">New arrivals</h2>
            <p className="mt-1 text-sm text-slate-500">Freshly added to the store</p>
          </div>
          <Link to="/products?sort=-createdAt" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>

        {newest.isLoading ? (
          <Spinner />
        ) : newest.error ? (
          <ErrorState error={newest.error} onRetry={newest.refetch} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(newest.data?.data || []).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
