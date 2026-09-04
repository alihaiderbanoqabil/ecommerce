import { baseApi } from "./baseApi";

export const commentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Threads + rating summary ek hi request mein
    getProductComments: builder.query({
      query: ({ productId, ...params }) => ({ url: `/products/${productId}/comments`, params }),
      providesTags: (result, error, { productId }) => [{ type: "Comment", id: productId }],
    }),

    createComment: builder.mutation({
      query: (body) => ({ url: "/comments", method: "POST", body }),
      // Product ka averageRating comment se badalta hai, is liye product bhi refetch
      invalidatesTags: (result, error, { product }) => [
        { type: "Comment", id: product },
        { type: "Product", id: product },
      ],
    }),

    updateComment: builder.mutation({
      query: ({ id, product, ...body }) => ({ url: `/comments/${id}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { product }) => [
        { type: "Comment", id: product },
        { type: "Product", id: product },
      ],
    }),

    deleteComment: builder.mutation({
      query: ({ id }) => ({ url: `/comments/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, { product }) => [
        { type: "Comment", id: product },
        { type: "Product", id: product },
      ],
    }),
  }),
});

export const {
  useGetProductCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = commentApi;
