import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { App } from "antd";
import { socket } from "../socket";
import { baseApi } from "../store/api/baseApi";
import { notificationApi } from "../store/api/notificationApi";
import { useGetMeQuery } from "../store/api/authApi";

/**
 * Socket.IO listener — UI nahi rakhta. Events ko antd notification, bell ki
 * list, aur RTK Query cache invalidation mein badalta hai (dashboard aur
 * orders table khud refresh ho jate hain).
 *
 * Notification ka record server banata hai (services/notification.service.js),
 * socket sirf live copy bhejta hai — usay seedha cache mein daal dete hain, is
 * liye refetch ki zarorat nahi parti aur wapis aane par list server se poori
 * mil jati hai.
 *
 * Server handshake par cookie dekh kar hamein "admins" room mein daalta hai,
 * is liye yahan sirf sunna hai — koi subscribe message bhejne ki zarorat nahi.
 */
export default function RealtimeListener() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const { data: user } = useGetMeQuery();

  useEffect(() => {
    // Sirf logged-in admin ke liye — guest socket ko admins room nahi milta
    if (!user || user.role !== "admin") return;

    if (socket.connected) socket.disconnect();
    socket.connect();

    // Live notification ko bell ki list ke sab se upar daal deta hai
    const prependToList = (payload) => {
      if (!payload._id) return;

      dispatch(
        notificationApi.util.updateQueryData("getNotifications", undefined, (draft) => {
          // Reconnect par server wohi event dobara bhej sakta hai
          if (draft.data.some((item) => item._id === payload._id)) return;

          draft.data.unshift({
            _id: payload._id,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            link: payload.link,
            read: false,
            createdAt: payload.createdAt,
          });
          draft.unread += 1;
        })
      );
    };

    const onOrderNew = (payload) => {
      prependToList(payload);

      notification.info({
        message: payload.title,
        description: payload.body,
        placement: "bottomRight",
        onClick: () => navigate(payload.link || `/orders?order=${payload.orderId}`),
        style: { cursor: "pointer" },
      });

      // Dashboard ke numbers aur orders table dono stale ho gaye
      dispatch(baseApi.util.invalidateTags(["Stats", { type: "Order", id: "LIST" }]));
    };

    const onOrderPayment = (payload) => {
      prependToList(payload);

      notification[payload.paymentStatus === "paid" ? "success" : "warning"]({
        message: payload.title,
        description: payload.body,
        placement: "bottomRight",
      });

      dispatch(
        baseApi.util.invalidateTags([
          "Stats",
          { type: "Order", id: payload.orderId },
          { type: "Order", id: "LIST" },
        ])
      );
    };

    socket.on("order:new", onOrderNew);
    socket.on("order:payment", onOrderPayment);

    return () => {
      socket.off("order:new", onOrderNew);
      socket.off("order:payment", onOrderPayment);
    };
  }, [dispatch, navigate, notification, user]);

  return null;
}
