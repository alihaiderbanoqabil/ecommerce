import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Session bootstrap. Cookie httpOnly hai — JS usay parh nahi sakta — is
    // liye "logged in hain ya nahi" ka jawab sirf server de sakta hai.
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),

    login: builder.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      // Login ke baad getMe dobara chalti hai, to poora app naye user par switch ho jata hai
      invalidatesTags: ["Auth", "Order"],
    }),

    register: builder.mutation({
      // role: "customer" jaan boojh kar bhejte hain — backend tab hi
      // verification email bhejta hai aur account ko unverified rakhta hai.
      query: (body) => ({ url: "/auth/register", method: "POST", body: { ...body, role: "customer" } }),
    }),

    logout: builder.mutation({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      // Yahan `invalidatesTags` jaan boojh kar nahi hai. Invalidate karne se
      // getMe dobara chalti hai aur 401 khaati hai — magar RTK Query failed
      // refetch par purana user cache mein chhor deta hai, is liye UI logged-in
      // hi rehta hai. Navbar mutation ke baad poori API state reset karta hai,
      // jo iss se zyada saaf hai (pichle user ki orders bhi saath jati hain).
    }),

    verifyEmail: builder.query({
      query: (token) => `/auth/verify-email?token=${encodeURIComponent(token)}`,
    }),

    forgotPassword: builder.mutation({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),

    resetPassword: builder.mutation({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),

    // Profile update — users route par jata hai, isi liye id chahiye
    updateProfile: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyEmailQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useUpdateProfileMutation,
} = authApi;
