const express = require("express");
const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
} = require("../controllers/category.controller");
const { authenticate, authorizeRoles, uploadSingle, upload } = require("../middlewares");

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", authenticate, authorizeRoles("admin"), uploadSingle("image"), createCategory);
// router.post("/", authenticate, authorizeRoles("admin"), upload.single("image"), createCategory);
router.patch("/:id", authenticate, authorizeRoles("admin"), uploadSingle("image"), updateCategory);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteCategory);

module.exports = router;


