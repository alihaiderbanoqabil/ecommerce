import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import { useGetProductsQuery } from "../store/api/productApi";
import { useGetCategoryTreeQuery } from "../store/api/categoryApi";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "-averageRating", label: "Top rated" },
  { value: "name", label: "Name: A to Z" },
];

const PAGE_SIZE = 12;

const VIEW_STORAGE_KEY = "shopkart_products_view";

const VIEW_OPTIONS = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: List },
];

/**
 * Grid/list ka faisla filters ki tarah URL mein nahi rakha. Filters batate
 * hain "kaun se products dikhen" — wo share/bookmark hone chahiyen. View sirf
 * "kaise dikhen" hai, yani banday ki apni pasand: link share karne par saamne
 * wale ka layout nahi badalna chahiye, magar refresh aur agli visit par apni
 * pasand yaad rehni chahiye. Cart ki tarah localStorage isi kaam ka hai.
 */
const loadView = () => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    // Private mode / storage band ho to grid default rehta hai
    return "grid";
  }
};

// Tree ko flat kar dete hain taake ek hi <select> mein parents + children aa jayen
const flattenCategories = (nodes = [], depth = 0) =>
  nodes.flatMap((node) => [
    { _id: node._id, name: `${"— ".repeat(depth)}${node.name}` },
    ...flattenCategories(node.subCategories, depth + 1),
  ]);

export default function Products() {
  // URL hi single source of truth hai — filters share/bookmark ho sakte hain,
  // aur back button bhi theek chalta hai
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") || "");
  const [view, setView] = useState(loadView);

  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "-createdAt";
  const search = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const minRating = searchParams.get("minRating") || "";

  // Navbar se naya search aaye to local input bhi update ho jaye
  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  const { data, isLoading, isFetching, error, refetch } = useGetProductsQuery({
    page,
    limit: PAGE_SIZE,
    sort,
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    // Backend bracket-notation operators samajhta hai: price[gte], price[lte]
    ...(minPrice ? { "price[gte]": minPrice } : {}),
    ...(maxPrice ? { "price[lte]": maxPrice } : {}),
    ...(minRating ? { "averageRating[gte]": minRating } : {}),
  });

  const { data: categoryData } = useGetCategoryTreeQuery();
  const categoryOptions = flattenCategories(categoryData?.data);

  // Filter badle to page 1 par wapis — warna page 5 par khali list dikhti hai
  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const changeView = (next) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const activeFilterCount = [category, minPrice, maxPrice, minRating].filter(Boolean).length;
  const products = data?.data || [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {search ? `Results for "${search}"` : "All products"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {/* {data?.pagination ? `${data.pagination.total} products found` : "Loading..."} */}
           {data?.pagination?.total || 0} products found
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount ? (
              <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeFilterCount}</span>
            ) : null}
          </button>

          <select
            value={sort}
            onChange={(event) => setParam("sort", event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white p-0.5">
            {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeView(value)}
                aria-label={label}
                aria-pressed={view === value}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                  view === value ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className={`${showFilters ? "block" : "hidden"} w-full shrink-0 lg:block lg:w-64`}>
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
              {activeFilterCount ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams();
                    if (search) next.set("search", search);
                    if (sort) next.set("sort", sort);
                    setSearchParams(next);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  <X size={12} /> Clear all
                </button>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Search</label>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setParam("search", searchDraft.trim());
                }}
              >
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Product name..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </form>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Category</label>
              <select
                value={category}
                onChange={(event) => setParam("category", event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Price range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(event) => setParam("minPrice", event.target.value)}
                  placeholder="Min"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) => setParam("maxPrice", event.target.value)}
                  placeholder="Max"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Minimum rating</label>
              <div className="flex flex-wrap gap-1.5">
                {["", "3", "4", "4.5"].map((value) => (
                  <button
                    key={value || "any"}
                    type="button"
                    onClick={() => setParam("minRating", value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      minRating === value
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {value ? `${value}★ & up` : "Any"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Spinner label="Loading products..." />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products match your filters"
              description="Try clearing a filter or searching for something else."
            />
          ) : (
            <>
              <div
                className={`${
                  view === "list"
                    ? "flex flex-col gap-4"
                    : "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4"
                } ${isFetching ? "opacity-60 transition" : ""}`}
              >
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} view={view} />
                ))}
              </div>

              <Pagination pagination={data.pagination} onChange={(next) => setParam("page", String(next))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
