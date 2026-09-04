import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Cookie httpOnly hai — "logged in hain ya nahi" ka jawab sirf server de sakta hai
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),

    login: builder.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),

    logout: builder.mutation({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      // Poora cache uraana zaroori hai — agla user doosre permissions ke sath aa sakta hai
      invalidatesTags: ["Auth", "Product", "Category", "Order", "User", "Comment", "Stats"],
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation, useLogoutMutation } = authApi;
