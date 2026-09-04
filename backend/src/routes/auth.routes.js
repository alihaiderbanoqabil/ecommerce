const express = require("express");
const {
    register,
    login,
    logout,
    getMe,
    verifyEmail,
    forgotPassword,
    resetPassword,
} = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
// authenticate jaan boojh kar nahi lagaya — expired token wali cookie bhi
// clear honi chahiye, aur dobara logout karna bhi error na de.
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;