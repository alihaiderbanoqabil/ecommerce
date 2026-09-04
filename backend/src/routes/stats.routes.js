const express = require("express");
const { getOverview } = require("../controllers/stats.controller");
const { authenticate, authorizeRoles } = require("../middlewares");

const router = express.Router();

// Dashboard ka data — sirf admin
router.get("/overview", authenticate, authorizeRoles("admin"), getOverview);

module.exports = router;
