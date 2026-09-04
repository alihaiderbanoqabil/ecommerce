import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Lock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCreatePaymentIntentMutation,
  useGetPaymentConfigQuery,
  useSyncPaymentMutation,
} from "../store/api/paymentApi";
import { getApiError } from "../store/api/baseApi";
import { formatCurrency } from "../utils/format";

/**
 * loadStripe har render par call nahi karna chahiye (wo script load karta hai),
 * is liye key ke hisab se ek hi promise cache kar lete hain.
 */
const stripePromiseCache = new Map();
const getStripePromise = (publishableKey) => {
  if (!stripePromiseCache.has(publishableKey)) {
    stripePromiseCache.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromiseCache.get(publishableKey);
};

/**
 * Asal form — Elements ke andar hona zaroori hai, warna useStripe/useElements
 * null dete hain.
 */
function PaymentForm({ orderId, amount, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [syncPayment] = useSyncPaymentMutation();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return; // Stripe.js abhi load ho raha hai

    setSubmitting(true);
    setErrorMessage("");

    // redirect: "if_required" — 3D Secure jaise cases mein Stripe khud bank ke
    // page par bhejta hai aur return_url par wapis laata hai; simple card par
    // koi redirect nahi hota aur hum yahin natija dikha dete hain.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${orderId}?payment=success` },
      redirect: "if_required",
    });

    setSubmitting(false);

    if (error) {
      // card_error / validation_error user ki galti hai (galat number, expiry) —
      // baqi sab technical, un ki tafseel user ko dikhane ka faida nahi
      const message =
        error.type === "card_error" || error.type === "validation_error"
          ? error.message
          : "Payment could not be completed. Please try again.";

      setErrorMessage(message);
      toast.error(message);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      toast.success("Payment successful");

      // Server se kehte hain ke Stripe se pooch kar order update kar le.
      // Webhook bhi yehi karta hai — magar wo der se aa sakta hai (ya local
      // par chal hi nahi raha hota), aur customer ko "paid" foran dikhna
      // chahiye. Dono taraf ka code idempotent hai, is liye dono chalen to
      // bhi order sirf ek baar paid hoti hai.
      await syncPayment(orderId).unwrap().catch(() => {
        // Sync fail ho jaye to bhi ghabrane ki baat nahi — webhook aa kar
        // order update kar dega, aur page socket par khud refresh ho jayega
      });

      onPaid ? onPaid() : navigate(`/orders/${orderId}?payment=success`, { replace: true });
      return;
    }

    if (paymentIntent?.status === "processing") {
      toast("Payment is processing — we will update the order as soon as it settles");
      navigate(`/orders/${orderId}?payment=success`, { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {errorMessage ? (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <Lock size={16} />
        {submitting ? "Processing..." : `Pay ${formatCurrency(amount)}`}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck size={14} />
        Card details go straight to Stripe — this site never sees them
      </p>
    </form>
  );
}

/**
 * Wrapper: order ke liye PaymentIntent banata hai, phir Stripe Elements ko
 * clientSecret ke sath mount karta hai.
 */
export default function CardPaymentForm({ orderId, amount, onPaid }) {
  const { data: config } = useGetPaymentConfigQuery();
  const [createPaymentIntent] = useCreatePaymentIntentMutation();
  const [clientSecret, setClientSecret] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!orderId || !config?.cardPaymentsEnabled) return;

    let cancelled = false;

    createPaymentIntent({ orderId })
      .unwrap()
      .then((result) => {
        if (!cancelled) setClientSecret(result.clientSecret);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getApiError(error, "Could not start the payment"));
      });

    // Order badal jaye ya component hat jaye to purana response set na ho
    return () => {
      cancelled = true;
    };
  }, [orderId, config?.cardPaymentsEnabled, createPaymentIntent]);

  if (!config?.cardPaymentsEnabled) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
        Card payments are not configured on this server.
      </p>
    );
  }

  if (loadError) {
    return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p>;
  }

  if (!config.publishableKey) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
        Stripe publishable key is missing on the server.
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <Elements
      // key: clientSecret badalne par Elements ko dobara mount karna parta hai
      key={clientSecret}
      stripe={getStripePromise(config.publishableKey)}
      options={{
        clientSecret,
        appearance: { theme: "stripe", variables: { colorPrimary: "#4f46e5", borderRadius: "8px" } },
      }}
    >
      <PaymentForm orderId={orderId} amount={amount} onPaid={onPaid} />
    </Elements>
  );
}
