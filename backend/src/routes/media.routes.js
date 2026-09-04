const express = require("express");
const router = express.Router();
const cloudinaryUpload = require("../middlewares/cloudinaryUpload");
const {
    uploadMedia,
    uploadMultipleMedia,
    deleteMedia,
    updateMedia,
} = require("../controllers/media.controller");
const { authenticate, authorizeRoles } = require("../middlewares");

router.post("/upload", authenticate, authorizeRoles("admin"), cloudinaryUpload.single("file"), uploadMedia);

router.post("/upload-multiple", authenticate, authorizeRoles("admin"), cloudinaryUpload.array("files", 5), uploadMultipleMedia);

router.put("/upload/:id", authenticate, authorizeRoles("admin"), cloudinaryUpload.single("file"), updateMedia);

router.delete("/upload/:id", authenticate, authorizeRoles("admin"), deleteMedia);

module.exports = router;
