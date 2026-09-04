import { baseApi } from "./baseApi";

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyOrders: builder.query({
      // Backend khud filter karta hai: customer ko sirf apni orders milti hain
      query: (params = {}) => ({ url: "/orders", params }),
      providesTags: [{ type: "Order", id: "LIST" }],
    }),

    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),

    createOrder: builder.mutation({
      // Sirf product + quantity bhejte hain. Price aur total server DB se
      // nikalta hai, is liye client se bhejne ka koi faida nahi.
      query: (body) => ({ url: "/orders", method: "POST", body }),
      invalidatesTags: [{ type: "Order", id: "LIST" }, { type: "Product", id: "LIST" }],
    }),

    cancelOrder: builder.mutation({
      query: (id) => ({ url: `/orders/${id}`, method: "PATCH", body: { status: "cancelled" } }),
      invalidatesTags: (result, error, id) => [{ type: "Order", id }, { type: "Order", id: "LIST" }],
    }),
  }),
});

export const {
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
} = orderApi;
