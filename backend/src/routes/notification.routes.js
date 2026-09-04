const express = require("express");
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
} = require("../controllers/notification.controller");
const { authenticate } = require("../middlewares");

const router = express.Router();

// Notifications hamesha kisi user ki hoti hain — guest ke liye kuch nahi.
// (Guest ko live socket toast phir bhi milta hai, bas record nahi banta.)
router.use(authenticate);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;
