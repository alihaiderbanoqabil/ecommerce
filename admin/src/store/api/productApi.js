import { baseApi } from "./baseApi";

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Backend ka queryService jo params leta hai wohi yahan se jate hain:
     * page, limit, sort, fields, search, aur filters jaise category,
     * price[gte], price[lte].
     */
    getProducts: builder.query({
      query: (params = {}) => ({ url: "/products", params }),
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ _id }) => ({ type: "Product", id: _id })), { type: "Product", id: "LIST" }]
          : [{ type: "Product", id: "LIST" }],
    }),

    // FormData jaan boojh kar as-is bhejte hain — fetchBaseQuery Content-Type
    // set nahi karta, warna multipart boundary galat chala jata hai.
    createProduct: builder.mutation({
      query: (formData) => ({ url: "/products", method: "POST", body: formData }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Stats"],
    }),

    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({ url: `/products/${id}`, method: "PATCH", body: formData }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Stats",
      ],
    }),

    // Product ke sath uske comments bhi jate hain, is liye Comment bhi refetch
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Comment", "Stats"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
