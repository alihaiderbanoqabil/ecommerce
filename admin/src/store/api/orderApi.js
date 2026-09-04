import { baseApi } from "./baseApi";

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: (params = {}) => ({ url: "/orders", params }),
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ _id }) => ({ type: "Order", id: _id })), { type: "Order", id: "LIST" }]
          : [{ type: "Order", id: "LIST" }],
    }),

    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),

    // status "cancelled" par server stock wapis barha deta hai, is liye
    // Product list bhi invalidate karni parti hai.
    updateOrder: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/orders/${id}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "LIST" },
        { type: "Product", id: "LIST" },
        "Stats",
      ],
    }),

    deleteOrder: builder.mutation({
      query: (id) => ({ url: `/orders/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Order", id: "LIST" }, "Stats"],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderMutation,
  useDeleteOrderMutation,
} = orderApi;
