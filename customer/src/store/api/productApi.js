import { baseApi } from "./baseApi";

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Backend ka queryService jo params leta hai wohi yahan se jate hain:
     * page, limit, sort, fields, search, aur filters jaise
     * category, price[gte], price[lte], averageRating[gte].
     */
    getProducts: builder.query({
      query: (params = {}) => ({ url: "/products", params }),
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ _id }) => ({ type: "Product", id: _id })), { type: "Product", id: "LIST" }]
          : [{ type: "Product", id: "LIST" }],
    }),

    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
  }),
});

export const { useGetProductsQuery, useGetProductByIdQuery } = productApi;
