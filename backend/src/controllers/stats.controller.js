const User = require("../models/user.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Comment = require("../models/comment.model");

// Cancelled orders ko revenue/sales mein count nahi karte
const EARNING_MATCH = { status: { $ne: "cancelled" } };
const LOW_STOCK_THRESHOLD = 5;
const RECENT_DAYS = 7;

/**
 * GET /api/stats/overview  (admin only)
 *
 * Admin dashboard ka saara data ek request mein. Har figure aggregation se
 * banta hai — koi collection poori memory mein nahi aati.
 */
const getOverview = async (req, res) => {
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

    const [
        totalUsers,
        totalProducts,
        totalOrders,
        totalComments,
        revenueRows,
        ordersByStatus,
        salesByDay,
        topProducts,
        lowStockProducts,
        recentOrders,
    ] = await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Comment.countDocuments({ isActive: true }),

        // Kitna kamaya — paid aur pending alag, taake dashboard dono dikha sake
        Order.aggregate([
            { $match: EARNING_MATCH },
            {
                $group: {
                    _id: "$paymentStatus",
                    amount: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                },
            },
        ]),

        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

        // Pichlay 7 din ka din-ba-din sale (chart ke liye)
        Order.aggregate([
            { $match: { ...EARNING_MATCH, createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),

        // Sab se zyada bikne wale 5 products — order items ko kholte hain
        Order.aggregate([
            { $match: EARNING_MATCH },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    unitsSold: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                },
            },
            { $sort: { unitsSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product",
                },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    unitsSold: 1,
                    revenue: 1,
                    name: { $ifNull: ["$product.name", "(deleted product)"] },
                    price: "$product.price",
                    images: "$product.images",
                },
            },
        ]),

        Product.find({ isActive: true, stock: { $lte: LOW_STOCK_THRESHOLD } })
            .select("name stock price")
            .sort({ stock: 1 })
            .limit(5)
            .lean(),

        Order.find()
            .populate("user", "name email")
            .select("totalAmount status paymentStatus createdAt user")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
    ]);

    const paid = revenueRows.find((row) => row._id === "paid");
    const pendingPayment = revenueRows.find((row) => row._id === "pending");

    // Aggregate sirf mojood statuses deta hai — missing ko 0 se bhar dete hain
    // taake frontend ko undefined handle na karna paray.
    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    ordersByStatus.forEach((row) => {
        statusCounts[row._id] = row.count;
    });

    return res.json({
        message: "Stats fetched successfully.",
        totals: {
            users: totalUsers,
            products: totalProducts,
            orders: totalOrders,
            comments: totalComments,
            revenue: Math.round((paid?.amount || 0) * 100) / 100,
            pendingRevenue: Math.round((pendingPayment?.amount || 0) * 100) / 100,
            paidOrders: paid?.count || 0,
        },
        ordersByStatus: statusCounts,
        salesByDay: salesByDay.map((row) => ({
            date: row._id,
            revenue: Math.round(row.revenue * 100) / 100,
            orders: row.orders,
        })),
        topProducts,
        lowStockProducts,
        recentOrders,
    });
};

module.exports = { getOverview };
