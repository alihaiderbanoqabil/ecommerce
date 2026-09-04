const Notification = require("../models/notification.model");
const { emitToEveryone, emitToUser, emitToAdmins } = require("../socket");

/**
 * Notification service — "kya hua" ko "kis ko batana hai" mein badalta hai.
 *
 * Har notification do jagah jati hai:
 *   1. DB mein (record) — taake refresh ke baad bhi mile, aur wo bhi mil jaye
 *      jo user ke offline hone ke doran aayi thi
 *   2. Socket par (live) — jo abhi juday hue hain unhe foran dikh jaye
 *
 * Socket wala hissa best-effort hai; asal record DB mein banta hai. Is liye
 * emit se pehle save karte hain.
 */

const shortOrderId = (orderId) => `#${String(orderId).slice(-8).toUpperCase()}`;

// Notification ka `body` ek tayyar string hoti hai (frontend usay wese hi
// dikhata hai), is liye raqam yahin format kar dete hain — wahi shakal jo
// baqi app mein hai.
const formatAmount = (value) =>
    new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const STATUS_TEXT = {
    processing: "is being prepared",
    shipped: "has shipped",
    delivered: "was delivered",
    cancelled: "was cancelled",
    pending: "is pending",
};

/**
 * Naya product — sab ke liye (broadcast, user: null).
 */
const notifyNewProduct = async (product) => {
    const notification = await Notification.create({
        user: null, // broadcast
        audience: "all", // customers — product admin ne khud banaya hai
        type: "product:new",
        title: "New product added",
        body: product.name,
        link: `/products/${product._id}`,
    });

    emitToEveryone("product:new", {
        _id: notification._id,
        type: "product:new",
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
        // Frontend ke toast ke liye thora extra — record mein ye nahi jata
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || null,
    });

    return notification;
};

/**
 * Order ka status badla — sirf us order ke malik ke liye.
 */
const notifyOrderStatus = async ({ order, previousStatus }) => {
    const notification = await Notification.create({
        user: order.user,
        type: "order:status",
        title: `Order ${shortOrderId(order._id)} ${STATUS_TEXT[order.status] || `is now ${order.status}`}`,
        body: `Order total ${formatAmount(order.totalAmount)}`,
        link: `/orders/${order._id}`,
    });

    emitToUser(order.user, "order:status", {
        _id: notification._id,
        type: "order:status",
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        previousStatus,
        totalAmount: order.totalAmount,
    });

    return notification;
};

/**
 * Payment ka natija — customer ko record + live, admins ko sirf live
 * (admin ke liye notifications persist nahi karte; unka dashboard khud
 * refresh ho jata hai).
 */
const notifyPaymentUpdate = async ({ order }) => {
    const paid = order.paymentStatus === "paid";
    const short = shortOrderId(order._id);
    const amount = formatAmount(order.totalAmount);

    // Do alag records: customer ka apna, aur admins ka broadcast. Titles aur
    // links dono ke liye alag hain (customer /orders/:id par jata hai, admin
    // apne table ke drawer par), is liye ek record se kaam nahi chalta.
    const [customerNotification, adminNotification] = await Promise.all([
        Notification.create({
            user: order.user,
            type: "order:payment",
            title: paid ? `Payment received for ${short}` : `Payment ${order.paymentStatus} for ${short}`,
            body: `Order total ${amount}`,
            link: `/orders/${order._id}`,
        }),
        Notification.create({
            user: null,
            audience: "admins",
            type: "order:payment",
            title: paid ? `Payment received ${short}` : `Payment ${order.paymentStatus} ${short}`,
            body: amount,
            link: `/orders?order=${order._id}`,
        }),
    ]);

    const shared = {
        type: "order:payment",
        read: false,
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        status: order.status,
        totalAmount: order.totalAmount,
    };

    emitToUser(order.user, "order:payment", {
        ...shared,
        _id: customerNotification._id,
        title: customerNotification.title,
        body: customerNotification.body,
        link: customerNotification.link,
        createdAt: customerNotification.createdAt,
    });

    emitToAdmins("order:payment", {
        ...shared,
        _id: adminNotification._id,
        title: adminNotification.title,
        body: adminNotification.body,
        link: adminNotification.link,
        createdAt: adminNotification.createdAt,
    });

    return customerNotification;
};

/**
 * Nayi order — sab admins ke liye (broadcast + record).
 *
 * Record isi liye zaroori hai: admin raat ko portal band kar ke jata hai, aur
 * subah usay wo orders bhi dikhni chahiyen jo us ke na hone mein aayin. Socket
 * sirf un tak pohanchata hai jo us waqt juday hue thay.
 */
const notifyNewOrder = async (order) => {
    const itemCount = order.items?.length || 0;

    const notification = await Notification.create({
        user: null,
        audience: "admins",
        type: "order:new",
        title: `New order ${shortOrderId(order._id)}`,
        body: `${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatAmount(order.totalAmount)}`,
        // Admin portal is link par order ka drawer khol deta hai
        link: `/orders?order=${order._id}`,
    });

    emitToAdmins("order:new", {
        _id: notification._id,
        type: "order:new",
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
        orderId: order._id,
        totalAmount: order.totalAmount,
        itemCount,
    });

    return notification;
};

module.exports = {
    notifyNewProduct,
    notifyOrderStatus,
    notifyPaymentUpdate,
    notifyNewOrder,
};
