import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { PackagePlus, Truck } from "lucide-react";
import { socket } from "../socket";
import { baseApi } from "../store/api/baseApi";
import { notificationApi } from "../store/api/notificationApi";
import { useAuthUser } from "../hooks/useAuthUser";
import { formatCurrency } from "../utils/format";

/**
 * Socket.IO listener — koi UI nahi. Events ko toast + notification list +
 * RTK Query cache invalidation mein badalta hai.
 *
 * Notification ka record server par banta hai (services/notification.service.js),
 * socket sirf live copy bhejta hai. Yahan us live copy ko seedha cache mein
 * daal dete hain (`updateQueryData`) — refetch ki zarorat nahi parti, aur
 * user ke wapis aane par bhi list server se poori mil jati hai.
 */
export default function RealtimeListener() {
  const dispatch = useDispatch();
  const { user } = useAuthUser();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    // Session badla to naya handshake — rooms handshake ke waqt cookie se
    // tay hote hain, is liye purana connection galat rooms mein hota hai
    if (socket.connected) socket.disconnect();
    socket.connect();

    // Live notification ko list ke sab se upar daal deta hai
    const prependToList = (payload) => {
      if (!isLoggedIn || !payload._id) return;

      dispatch(
        notificationApi.util.updateQueryData("getNotifications", undefined, (draft) => {
          // Dobara na aa jaye (reconnect par server wohi event phir bhej sakta hai)
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

    const onProductNew = (payload) => {
      prependToList(payload);

      toast.custom(
        (t) => (
          <Link
            to={payload.link || `/products/${payload.productId}`}
            onClick={() => toast.dismiss(t.id)}
            className="flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg transition hover:border-brand-300"
          >
            <span className="rounded-lg bg-brand-50 p-2">
              <PackagePlus className="h-5 w-5 text-brand-600" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">New product added</span>
              <span className="block truncate text-xs text-slate-500">
                {payload.name} — {formatCurrency(payload.price)}
              </span>
            </span>
          </Link>
        ),
        { duration: 6000 }
      );

      dispatch(baseApi.util.invalidateTags([{ type: "Product", id: "LIST" }]));
    };

    const onOrderStatus = (payload) => {
      prependToList(payload);

      toast.custom(
        (t) => (
          <Link
            to={payload.link || `/orders/${payload.orderId}`}
            onClick={() => toast.dismiss(t.id)}
            className="flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg transition hover:border-brand-300"
          >
            <span className="rounded-lg bg-emerald-50 p-2">
              <Truck className="h-5 w-5 text-emerald-600" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">{payload.title}</span>
              <span className="block text-xs text-slate-500">Tap to see the details</span>
            </span>
          </Link>
        ),
        { duration: 6000 }
      );

      dispatch(
        baseApi.util.invalidateTags([
          { type: "Order", id: payload.orderId },
          { type: "Order", id: "LIST" },
        ])
      );
    };

    const onOrderPayment = (payload) => {
      prependToList(payload);

      toast[payload.paymentStatus === "paid" ? "success" : "error"](payload.title);

      dispatch(
        baseApi.util.invalidateTags([
          { type: "Order", id: payload.orderId },
          { type: "Order", id: "LIST" },
        ])
      );
    };

    socket.on("product:new", onProductNew);
    socket.on("order:status", onOrderStatus);
    socket.on("order:payment", onOrderPayment);

    return () => {
      socket.off("product:new", onProductNew);
      socket.off("order:status", onOrderStatus);
      socket.off("order:payment", onOrderPayment);
    };
  }, [dispatch, isLoggedIn, user?._id]);

  return null;
}
