import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, PackagePlus, Truck, CreditCard, CheckCheck, Check } from "lucide-react";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../store/api/notificationApi";
import { useAuthUser } from "../hooks/useAuthUser";

const ICONS = {
  "product:new": PackagePlus,
  "order:status": Truck,
  "order:payment": CreditCard,
};

const timeAgo = (iso) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationBell() {
  const { user } = useAuthUser();
  const isLoggedIn = Boolean(user);

  // Guest ki koi notification list nahi hoti (server par record user ke sath
  // bandha hai) — is liye query hi skip kar dete hain.
  const { data } = useGetNotificationsQuery(undefined, { skip: !isLoggedIn });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Logged out user ke liye bell dikhane ka faida nahi
  if (!isLoggedIn) return null;

  const items = data?.data || [];
  const unread = data?.unread || 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
      >
        <Bell size={20} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Notifications
              {unread ? <span className="ml-1 text-xs font-normal text-slate-500">({unread} new)</span> : null}
            </h3>
            {unread ? (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700"
              >
                <CheckCheck size={13} /> Mark all as read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Check className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nothing yet</p>
              <p className="mt-1 text-xs text-slate-400">
                New products and order updates show up here
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => {
                const Icon = ICONS[item.type] || Bell;

                return (
                  <li key={item._id} className={item.read ? "" : "bg-brand-50/40"}>
                    <div className="flex items-start gap-2 px-4 py-3">
                      <Link
                        to={item.link || "#"}
                        onClick={() => {
                          // Kholte hi padhi hui — click hi "maine dekh li" hai
                          if (!item.read) markRead(item._id);
                          setOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-start gap-3"
                      >
                        <span className="mt-0.5 rounded-lg bg-brand-50 p-1.5">
                          <Icon className="h-4 w-4 text-brand-600" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm ${item.read ? "text-slate-600" : "font-semibold text-slate-800"}`}
                          >
                            {item.title}
                          </span>
                          {item.body ? (
                            <span className="block truncate text-xs text-slate-500">{item.body}</span>
                          ) : null}
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {timeAgo(item.createdAt)}
                          </span>
                        </span>
                      </Link>

                      {/* Bina kholay padha hua mark karne ke liye */}
                      {!item.read ? (
                        <button
                          type="button"
                          onClick={() => markRead(item._id)}
                          aria-label="Mark as read"
                          title="Mark as read"
                          className="mt-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Check size={14} />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
