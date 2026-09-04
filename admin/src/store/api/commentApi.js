import { baseApi } from "./baseApi";

export const commentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Admin cookie ke sath backend hidden comments bhi deta hai, aur
    // ?isActive=false sirf admin ke liye chalta hai.
    getComments: builder.query({
      query: (params = {}) => ({ url: "/comments", params }),
      providesTags: [{ type: "Comment", id: "LIST" }],
    }),

    // isActive = hide/restore. Product ka averageRating comment se badalta hai,
    // is liye Product list bhi refetch karate hain.
    updateComment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/comments/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Comment", id: "LIST" }, { type: "Product", id: "LIST" }, "Stats"],
    }),

    deleteComment: builder.mutation({
      query: (id) => ({ url: `/comments/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Comment", id: "LIST" }, { type: "Product", id: "LIST" }, "Stats"],
    }),
  }),
});

export const { useGetCommentsQuery, useUpdateCommentMutation, useDeleteCommentMutation } = commentApi;
