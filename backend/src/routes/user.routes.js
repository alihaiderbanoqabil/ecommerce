const express = require("express");
const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} = require("../controllers/user.controller");
const { authenticate, authorizeRoles } = require("../middlewares");
const { register } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/", authenticate, authorizeRoles("admin"), register);
router.get("/", authenticate, authorizeRoles("admin"), getUsers);
router.get("/:id", authenticate, getUserById);
router.patch("/:id", authenticate, updateUser);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteUser);

module.exports = router;