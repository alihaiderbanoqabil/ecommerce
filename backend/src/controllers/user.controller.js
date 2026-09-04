const User = require("../models/user.model");
const AppError = require("../utils/AppError");
const { queryService } = require("../utils/queryService");

// Schema mein ye fields `select: false` hain, magar queryService `?fields=`
// ko seedha .select() mein deta hai — is liye `?fields=+password` unhe wapis
// on kar sakta tha. Yahan aisi koshish ko filter kar dete hain.
const SENSITIVE_FIELDS = ["password", "emailVerificationToken"];

const stripSensitiveFields = (query) => {
    const safe = { ...query };

    // ?fields=name,+password -> ?fields=name
    if (typeof safe.fields === "string") {
        safe.fields = safe.fields
            .split(",")
            .filter((field) => !SENSITIVE_FIELDS.includes(field.trim().replace(/^[+-]/, "")))
            .join(",");
    }

    // ?emailVerificationToken[ne]=null jaisi filtering se accounts probe na ho saken
    SENSITIVE_FIELDS.forEach((field) => delete safe[field]);

    return safe;
};

const getUsers = async (req, res) => {
    // Sirf admin yahan tak pohanchta hai (route par authorizeRoles("admin") laga hai),
    // is liye baseFilter ki zarorat nahi — poori list allowed hai.
    const result = await queryService(User, stripSensitiveFields(req.query), {
        searchFields: ["name", "email"],   // ?search=ali -> name ya email mein
        // password / emailVerificationToken schema mein select: false hain,
        // is liye response mein khud hi nahi aate.
    });

    return res.json({ message: "Users get successfully", ...result });
};

const getUserById = async (req, res) => {
    // console.log(req.params, "req.params");

    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
        throw new AppError("Forbidden", 403);
    }

    // const user = await User.findById(req.params.id).select("name email");
    // const user = await User.findById(req.params.id).select("-password");
    const user = await User.findById(req.params.id);
    // const user = await User.findOne({ _id: req.params.id });
    // const user = await User.findOne({ email: req.params.email });
    if (!user) {
        throw new AppError("User not found", 404);
    }

    return res.json(user);
};

const updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (req.user.role !== "admin" && req.user.id !== user._id.toString()) {
        throw new AppError("Forbidden", 403);
    }

    const updates = { ...req.body };
    if (req.user.role !== "admin") {
        delete updates.role;
    }

    if (updates.password) {
        user.password = updates.password;
        delete updates.password;
    }

    Object.assign(user, updates);
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    return res.json({ message: "User updated successfully", user: updatedUser });
};

const deleteUser = async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    return res.json({ message: "User deleted successfully" });
};

module.exports = {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
};
