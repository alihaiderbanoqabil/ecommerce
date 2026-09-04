const express = require("express");
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
} = require("../controllers/product.controller");
const { getProductComments, createComment } = require("../controllers/comment.controller");
const { authenticate, authorizeRoles, uploadMultiple, optionalAuthenticate } = require("../middlewares");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", authenticate, authorizeRoles("admin"), uploadMultiple("images", 5), createProduct);
router.patch("/:id", authenticate, authorizeRoles("admin"), uploadMultiple("images", 5), updateProduct);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteProduct);

// Nested comment routes — ek product ke comments product ke URL ke neeche
// milte hain. /api/products/:id (1 segment) aur /api/products/:id/comments
// (2 segments) aapas mein takratey nahi, is liye order se farq nahi parta.
router.get("/:productId/comments", optionalAuthenticate, getProductComments);
router.post("/:productId/comments", authenticate, createComment);

module.exports = router;
