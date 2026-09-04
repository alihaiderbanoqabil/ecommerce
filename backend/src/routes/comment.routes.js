const express = require("express");
const {
    getComments,
    getCommentById,
    createComment,
    updateComment,
    deleteComment,
} = require("../controllers/comment.controller");
const { authenticate, optionalAuthenticate } = require("../middlewares");

const router = express.Router();

// Padhna sab ke liye khula hai. optionalAuthenticate sirf itna karta hai ke
// agar admin ka token aaya ho to hidden (isActive: false) comments bhi dikha de.
router.get("/", optionalAuthenticate, getComments);
router.get("/:id", optionalAuthenticate, getCommentById);

// Likhne ke liye login zaroori. Owner-or-admin check controller ke andar hai,
// kyunke pehle comment fetch karna parta hai ke owner kaun hai.
router.post("/", authenticate, createComment);
router.patch("/:id", authenticate, updateComment);
router.delete("/:id", authenticate, deleteComment);

module.exports = router;
