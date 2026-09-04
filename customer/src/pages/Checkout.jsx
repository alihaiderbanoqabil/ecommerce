import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { CreditCard, Banknote, Wallet, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import Field from "../components/Field";
import EmptyState from "../components/EmptyState";
import { rules } from "../utils/validators";
import { clearCart, selectCartItems, selectCartTotal } from "../store/slices/cartSlice";
import { formatCurrency } from "../utils/format";
import { useAuthUser } from "../hooks/useAuthUser";
import { useCreateOrderMutation } from "../store/api/orderApi";
import { useGetPaymentConfigQuery } from "../store/api/paymentApi";
import { getApiError } from "../store/api/baseApi";

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on delivery", icon: Banknote, hint: "Pay when it arrives" },
  { value: "card", label: "Card", icon: CreditCard, hint: "Secure Stripe checkout" },
  { value: "paypal", label: "PayPal", icon: Wallet, hint: "Not enabled yet" },
];

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { user } = useAuthUser();
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  // Server batata hai ke Stripe ki keys lagi hain ya nahi
  const { data: paymentConfig } = useGetPaymentConfigQuery();
  const cardEnabled = paymentConfig?.cardPaymentsEnabled;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    // Profile mein address mojood ho to form pehle se bhara mil jata hai
    defaultValues: {
      street: user?.address?.street || "",
      city: user?.address?.city || "",
      state: user?.address?.state || "",
      zip: user?.address?.zip || "",
      country: user?.address?.country || "Pakistan",
      paymentMethod: "cod",
    },
  });

  const paymentMethod = watch("paymentMethod");

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Nothing to check out"
        description="Add something to your cart first."
        actionLabel="Browse products"
        actionTo="/products"
      />
    );
  }

  const onSubmit = async (values) => {
    try {
      // Price bhejna bekar hai — server DB se nikalta hai. Sirf kya aur kitna.
      const payload = {
        items: items.map((item) => ({ product: item._id, quantity: item.quantity })),
        shippingAddress: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
        },
        paymentMethod: values.paymentMethod,
      };

      const result = await createOrder(payload).unwrap();
      dispatch(clearCart());

      // Card wali order: pehle order banti hai (paymentStatus: pending), phir
      // order page par card form khulta hai. Order pehle banane ka faida — user
      // payment beech mein chhor de to bhi order uski history mein rehti hai
      // aur baad mein "Pay now" se pura kiya ja sakta hai.
      if (values.paymentMethod === "card" && cardEnabled) {
        toast.success("Order created — complete the payment to confirm it");
        navigate(`/orders/${result.order._id}?pay=1`, { replace: true });
        return;
      }

      toast.success("Order placed successfully!");
      navigate(`/orders/${result.order._id}`, { replace: true });
    } catch (error) {
      // Stock khatam / product inactive jaise saare cases server batata hai
      toast.error(getApiError(error, "Could not place your order"));
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3" noValidate>
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">Shipping address</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Street address"
                className="sm:col-span-2"
                placeholder="House 12, Street 4, Gulshan"
                error={errors.street}
                {...register("street", rules.required("Street address"))}
              />
              <Field
                label="City"
                placeholder="Karachi"
                error={errors.city}
                {...register("city", rules.required("City"))}
              />
              <Field
                label="State / Province"
                placeholder="Sindh"
                error={errors.state}
                {...register("state", rules.required("State"))}
              />
              <Field
                label="ZIP / Postal code"
                placeholder="75500"
                error={errors.zip}
                {...register("zip", {
                  required: "ZIP code is required",
                  pattern: { value: /^[0-9A-Za-z\s-]{3,10}$/, message: "Enter a valid ZIP code" },
                })}
              />
              <Field
                label="Country"
                placeholder="Pakistan"
                error={errors.country}
                {...register("country", rules.required("Country"))}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">Payment method</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon, hint }) => {
                // paypal wired nahi hai; card sirf tab jab server par Stripe ki keys hon
                const disabled = value === "paypal" || (value === "card" && !cardEnabled);

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setValue("paymentMethod", value)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
                      paymentMethod === value
                        ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    } ${disabled ? "cursor-not-allowed opacity-50 hover:border-slate-300" : ""}`}
                  >
                    <Icon className={`h-5 w-5 ${paymentMethod === value ? "text-brand-600" : "text-slate-400"}`} />
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                    <span className="text-xs text-slate-500">
                      {value === "card" && !cardEnabled ? "Not configured on this server" : hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {paymentMethod === "card" ? (
              <p className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
                The card form opens on the next step. Card details go straight to Stripe — this site
                never sees them — and the order is only marked paid once Stripe confirms it.
              </p>
            ) : null}
          </section>
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Order summary</h2>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item._id} className="flex justify-between gap-3 text-sm">
                <span className="line-clamp-2 text-slate-600">
                  {item.quantity} × {item.name}
                </span>
                <span className="shrink-0 font-medium text-slate-800">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
            <span className="text-sm font-semibold text-slate-800">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading
              ? "Placing order..."
              : paymentMethod === "card" && cardEnabled
                ? "Continue to payment"
                : "Place order"}
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            The server re-checks stock and prices before confirming
          </p>
        </div>
      </form>
    </div>
  );
}
