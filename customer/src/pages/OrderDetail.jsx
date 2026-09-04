import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, CreditCard, XCircle, ImageOff, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import { useCancelOrderMutation, useGetOrderByIdQuery } from "../store/api/orderApi";
import { useGetPaymentConfigQuery } from "../store/api/paymentApi";
import CardPaymentForm from "../components/CardPaymentForm";
import { getApiError } from "../store/api/baseApi";
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_STYLES,
} from "../utils/format";

const STEPS = ["pending", "processing", "shipped", "delivered"];

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data: order, isLoading, error, refetch } = useGetOrderByIdQuery(id);
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const { data: paymentConfig } = useGetPaymentConfigQuery();

  // ?payment=success 3D Secure ke redirect se aata hai; ?pay=1 checkout se
  // (yani card form foran khol do)
  const paymentResult = searchParams.get("payment");
  const [showCardForm, setShowCardForm] = useState(searchParams.get("pay") === "1");

  if (isLoading) return <Spinner label="Loading order..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!order) return null;

  // Shipped/delivered ke baad backend cancel allow nahi karta, is liye button bhi chhupa dete hain
  const canCancel = !["shipped", "delivered", "cancelled"].includes(order.status);
  const currentStep = STEPS.indexOf(order.status);
  const canPayNow =
    paymentConfig?.cardPaymentsEnabled &&
    order.paymentStatus !== "paid" &&
    order.status !== "cancelled";

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order? The items will go back into stock.")) return;

    try {
      await cancelOrder(order._id).unwrap();
      toast.success("Order cancelled");
    } catch (requestError) {
      toast.error(getApiError(requestError, "Could not cancel the order"));
    }
  };

  return (
    <div>
      <Link
        to="/orders"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ChevronLeft size={16} /> Back to my orders
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Order #{order._id.slice(-8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              ORDER_STATUS_STYLES[order.status] || "bg-slate-100 text-slate-600"
            }`}
          >
            {order.status}
          </span>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              PAYMENT_STATUS_STYLES[order.paymentStatus] || "bg-slate-100 text-slate-600"
            }`}
          >
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Stripe se wapis aane par. "success" ka matlab Stripe ka page theek se
          poora hua — paisay confirm hone ka faisla webhook karta hai, is liye
          jab tak paymentStatus paid na ho, hum "confirming" dikhate hain. */}
      {paymentResult === "success" ? (
        <div
          className={`mb-6 flex items-start gap-2 rounded-xl p-4 text-sm ${
            order.paymentStatus === "paid"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {order.paymentStatus === "paid" ? (
            <>
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>Payment received — thank you! Your order is being prepared.</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>
                Confirming your payment with Stripe... this page updates itself the moment it lands.
              </span>
            </>
          )}
        </div>
      ) : paymentResult === "cancelled" ? (
        <div className="mb-6 flex items-start gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span>
            Payment was cancelled. The order is still here — you can pay for it whenever you are ready.
          </span>
        </div>
      ) : null}

      {order.status === "cancelled" ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <XCircle size={18} /> This order was cancelled and the stock has been restored.
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div className={`h-1 flex-1 ${index === 0 ? "bg-transparent" : index <= currentStep ? "bg-brand-600" : "bg-slate-200"}`} />
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index <= currentStep ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className={`h-1 flex-1 ${index === STEPS.length - 1 ? "bg-transparent" : index < currentStep ? "bg-brand-600" : "bg-slate-200"}`} />
                </div>
                <span
                  className={`mt-2 text-xs font-medium capitalize ${
                    index <= currentStep ? "text-brand-700" : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-800">
              Items
            </h2>

            <ul className="divide-y divide-slate-100">
              {order.items.map((item, index) => (
                <li key={`${item.product?._id || item.product || index}`} className="flex items-center gap-4 p-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <ImageOff className="h-5 w-5 text-slate-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {item.product?._id ? (
                      <Link
                        to={`/products/${item.product._id}`}
                        className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-brand-600"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-slate-500">Product no longer available</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
              <span className="text-sm font-semibold text-slate-800">Total</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin size={15} className="text-brand-600" /> Shipping address
            </h2>
            <address className="mt-3 space-y-0.5 text-sm not-italic text-slate-600">
              <p>{order.shippingAddress?.street || "—"}</p>
              <p>
                {[order.shippingAddress?.city, order.shippingAddress?.state]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              <p>
                {[order.shippingAddress?.zip, order.shippingAddress?.country]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </address>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard size={15} className="text-brand-600" /> Payment
            </h2>
            <p className="mt-3 text-sm capitalize text-slate-600">
              {order.paymentMethod} · {order.paymentStatus}
            </p>
          </div>

          {canPayNow && !showCardForm ? (
            <button
              type="button"
              onClick={() => setShowCardForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <CreditCard size={16} />
              Pay now with card
            </button>
          ) : null}

          {canPayNow && showCardForm ? (
            <div className="rounded-2xl border border-brand-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CreditCard size={15} className="text-brand-600" /> Pay with card
              </h2>
              <div className="mt-4">
                {/* Payment ke baad order ko "paid" webhook karta hai — refetch
                    us waqt tak pending dikhayega, phir socket khud update kar
                    deta hai. Is liye yahan sirf banner ke liye refetch. */}
                <CardPaymentForm
                  orderId={order._id}
                  amount={order.totalAmount}
                  onPaid={() => {
                    setShowCardForm(false);
                    refetch();
                  }}
                />
              </div>
            </div>
          ) : null}

          {canCancel ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full rounded-lg border border-rose-300 bg-white py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {isCancelling ? "Cancelling..." : "Cancel this order"}
            </button>
          ) : order.status !== "cancelled" ? (
            <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
              Orders can no longer be cancelled once they are {order.status}.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
