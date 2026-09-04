const Notification = require("../models/notification.model");
const AppError = require("../utils/AppError");

/**
 * GET /api/notifications
 *
 * Apni + broadcast notifications, naye pehle. Sath mein unread count, taake
 * bell ka badge ek hi request se bhar jaye.
 */
const getNotifications = async (req, res) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = Notification.filterFor(req.user.id, req.user.role);

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit);

    const data = notifications.map((doc) => Notification.toClient(doc, req.user.id));

    return res.json({
        message: "Notifications fetched successfully.",
        data,
        unread: data.filter((item) => !item.read).length,
    });
};

/**
 * PATCH /api/notifications/:id/read
 *
 * $addToSet use karte hain — dobara parhne par array mein duplicate id nahi
 * jati, aur ye idempotent bhi rehta hai.
 */
const markAsRead = async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, ...Notification.filterFor(req.user.id, req.user.role) },
        { $addToSet: { readBy: req.user.id } },
        { new: true }
    );

    if (!notification) {
        throw new AppError("Notification not found", 404);
    }

    return res.json({
        message: "Notification marked as read",
        notification: Notification.toClient(notification, req.user.id),
    });
};

/**
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
    const { modifiedCount } = await Notification.updateMany(
        // Sirf wo jo abhi tak is user ne nahi parhi — warna har document
        // bewajah likha jata hai
        { ...Notification.filterFor(req.user.id, req.user.role), readBy: { $ne: req.user.id } },
        { $addToSet: { readBy: req.user.id } }
    );

    return res.json({ message: "All notifications marked as read", modifiedCount });
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
