import { baseApi } from "./baseApi";

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Server batata hai ke Stripe ki keys lagi hui hain ya nahi — uske hisab
    // se checkout par card option enable/disable karte hain
    getPaymentConfig: builder.query({
      query: () => "/payments/config",
    }),

    // In-app card form ke liye — clientSecret jis se Stripe Elements payment
    // confirm karta hai. Card ki details Stripe ke iframe se seedha Stripe ko
    // jati hain, hamare code ya server ke paas kabhi nahi aatin.
    createPaymentIntent: builder.mutation({
      query: (body) => ({ url: "/payments/payment-intent", method: "POST", body }),
    }),

    // Hosted Stripe page wala raasta — fallback (ya un users ke liye jinhen
    // apne bank ka page dekhna zyada mehfooz lagta hai)
    createCheckoutSession: builder.mutation({
      query: (body) => ({ url: "/payments/checkout-session", method: "POST", body }),
    }),

    // Payment ke foran baad: server Stripe se seedha pooch kar order ko paid
    // kar deta hai. Webhook phir bhi asal record banata hai — ye us ke aane
    // ka intezar khatam kar deta hai (aur local par, jahan `stripe listen`
    // nahi chal raha, isi se order paid hoti hai).
    syncPayment: builder.mutation({
      query: (orderId) => ({ url: `/payments/sync/${orderId}`, method: "POST" }),
      invalidatesTags: (result, error, orderId) => [
        { type: "Order", id: orderId },
        { type: "Order", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPaymentConfigQuery,
  useCreatePaymentIntentMutation,
  useCreateCheckoutSessionMutation,
  useSyncPaymentMutation,
} = paymentApi;
