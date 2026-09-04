import { baseApi } from "./baseApi";

/**
 * Notifications ab server par store hoti hain — is liye page refresh ke baad
 * bhi rehti hain, aur wo bhi mil jati hain jo user ke offline hone ke doran
 * aayin. Socket sirf "abhi juday hue" clients ko live batata hai.
 */
export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),

    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      // Optimistic: badge ka number foran girna chahiye, server ka intezar
      // kiye bagair. Fail ho jaye to undo() purani list wapis le aata hai.
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
