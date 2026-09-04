const express = require("express");
const {
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
} = require("../controllers/order.controller");
const { authenticate } = require("../middlewares");

const router = express.Router();

router.get("/", authenticate, getOrders);
router.get("/:id", authenticate, getOrderById);
router.post("/", authenticate, createOrder);
router.patch("/:id", authenticate, updateOrder);
router.delete("/:id", authenticate, deleteOrder);

module.exports = router;
