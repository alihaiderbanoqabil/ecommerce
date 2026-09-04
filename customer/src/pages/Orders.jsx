import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight, Search, X } from "lucide-react";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { useGetMyOrdersQuery } from "../store/api/orderApi";
import { formatCurrency, formatDate, ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from "../utils/format";

const STATUS_FILTERS = ["", "pending", "processing", "shipped", "delivered", "cancelled"];

export default function Orders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  // draft = jo type ho raha hai, search = jo submit ho chuka. Products page
  // par bhi yehi tareeqa hai: har keystroke par request nahi jati.
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, error, refetch } = useGetMyOrdersQuery({
    page,
    limit: 10,
    sort: "-createdAt",
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  });

  const applySearch = (value) => {
    setSearch(value);
    setPage(1); // warna page 3 par khali list milti hai
  };

  if (isLoading) return <Spinner label="Loading your orders..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const orders = data?.data || [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My orders</h1>

      <form
        className="mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch(searchDraft.trim());
        }}
      >
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search by order ID, e.g. 486AB5B5"
            aria-label="Search your orders by order ID"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none focus:border-brand-500"
          />
          {searchDraft ? (
            <button
              type="button"
              onClick={() => {
                setSearchDraft("");
                applySearch("");
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          The ID shown on each order — with or without the <span className="font-mono">#</span>.
        </p>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium capitalize transition ${
              status === value
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {value || "All"}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            search
              ? "No order matches that ID"
              : status
                ? `No ${status} orders`
                : "No orders yet"
          }
          description={
            search
              ? "Check the ID and try again — it is the code shown on the order, like #486AB5B5."
              : "When you place an order it will show up here."
          }
          actionLabel={search ? undefined : "Start shopping"}
          actionTo={search ? undefined : "/products"}
        />
      ) : (
        <>
          <ul className={`space-y-3 ${isFetching ? "opacity-60 transition" : ""}`}>
            {orders.map((order) => (
              <li key={order._id}>
                <Link
                  to={`/orders/${order._id}`}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-mono text-xs text-slate-400">#{order._id.slice(-8).toUpperCase()}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        ORDER_STATUS_STYLES[order.status] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        PAYMENT_STATUS_STYLES[order.paymentStatus] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>

                  <p className="text-base font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>

          <Pagination pagination={data.pagination} onChange={setPage} />
        </>
      )}
    </div>
  );
}
