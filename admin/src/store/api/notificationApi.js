import { baseApi } from "./baseApi";

/**
 * Admin notifications ab server par store hoti hain — is liye portal band kar
 * ke wapis aane par bhi wo orders/payments dikhti hain jo darmiyan mein aayin.
 * Socket sirf live copy bhejta hai; record backend banata hai.
 *
 * Server role dekh kar filter karta hai: admin ko `audience: "admins"` wali
 * broadcast milti hai (nayi order, payment), customer wali nahi.
 */
export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),

    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      // Optimistic: badge ka number foran girna chahiye. Fail ho to undo().
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationApi.util.updateQueryData("getNotifications", undefined, (draft) => {
            const item = draft.data.find((notification) => notification._id === id);
            if (item && !item.read) {
              item.read = true;
              draft.unread = Math.max(0, draft.unread - 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationApi.util.updateQueryData("getNotifications", undefined, (draft) => {
            draft.data.forEach((notification) => {
              notification.read = true;
            });
            draft.unread = 0;
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
