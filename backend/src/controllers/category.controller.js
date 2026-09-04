const fs = require("fs/promises");
const path = require("path");
const Category = require("../models/category.model");
const AppError = require("../utils/AppError");
const { queryService } = require("../utils/queryService");

// Helper: delete a file if it exists, given the stored "/uploads/xxx.png" style path
const deleteImageFile = async (imagePath) => {
    if (!imagePath) return;
    try {
        // imagePath is like "/uploads/filename.png" -> resolve to actual disk path.
        // From src/controllers, uploads/ lives two levels up (backend/uploads).
        const filePath = path.join(__dirname, "../..", imagePath);
        await fs.unlink(filePath);
    } catch (err) {
        // Cleanup best-effort hai: file missing ho to bhi request fail nahi honi chahiye
        if (err.code !== "ENOENT") {
            console.error("Failed to delete old image:", err.message);
        }
        // ENOENT = file already missing, safe to ignore
    }
};

// Recursive function to build nested category tree
const buildCategoryTree = (categories, parentId = null) => {
    return categories
        .filter((cat) => {
            // Compare parentCategory._id (if populated) or parentCategory itself, against parentId
            const catParentId = cat.parentCategory ? cat.parentCategory._id.toString() : null;
            return catParentId === parentId;
        })
        .map((cat) => ({
            ...cat,
            subCategories: buildCategoryTree(categories, cat._id.toString()),
        }));
};

/**
 * Categories do shakal mein mil sakti hain:
 *
 *  1. TREE (default) — poori nested list, jo navigation menu banane ke liye
 *     chahiye hoti hai. Yahan pagination ka koi matlab nahi: aadhi tree bhejne
 *     se parent-child ka rishta toot jata hai, is liye queryService use nahi karte.
 *
 *  2. FLAT — queryService wali normal list: search, filter, sort, pagination,
 *     field limiting. Admin panel ke table ke liye. Ye tab chalta hai jab
 *     ?flat=true ho, ya koi aisa param aaye jo sirf flat mode mein hi kaam
 *     karta hai (search / page / limit).
 */
const wantsFlatList = (query) =>
    query.flat === "true" || Boolean(query.search || query.page || query.limit);

const getCategories = async (req, res) => {
    if (wantsFlatList(req.query)) {
        const { flat, ...query } = req.query; // `flat` sirf switch hai, filter nahi

        const result = await queryService(Category, query, {
            searchFields: ["name", "description"],
            populate: [{ path: "parentCategory", select: "name slug" }],
        });

        return res.json({ message: "Categories fetched successfully.", mode: "flat", ...result });
    }

    const categories = await Category.find()
        // .populate("parentCategory")
        // .populate("parentCategory", "name slug image")
        .lean(); // .lean() gives plain JS objects, easier/faster to manipulate
    // return res.json({ message: "Categories fetched successfully.", data: categories });

    const categoryTree = buildCategoryTree(categories);

    return res.json({ message: "Categories fetched successfully.", mode: "tree", data: categoryTree });
};

const getCategoryById = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        throw new AppError("Category not found", 404);
    }

    return res.json(category);
};

const createCategory = async (req, res) => {
    const payload = { ...req.body };
    if (req.file) {
        // payload.image = `http://localhost:5000/uploads/${req.file.filename}`; // don't store localhost urls or domain names like this while save file path in DB "http://localhost:5000"
        payload.image = `/uploads/${req.file.filename}`;
    }

    // Duplicate name/slug unique index se takra jata hai — errorHandler isay
    // raw E11000 driver message ki jagah "name already exists" bata deta hai.
    const category = await Category.create(payload);
    return res.status(201).json({ message: "Category created successfully", category });
};

const updateCategory = async (req, res) => {
    // 1. Pehle existing category fetch karo, taake old image path pata chale
    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
        throw new AppError("Category not found", 404);
    }

    const payload = { ...req.body };

    if (req.file) {
        payload.image = `/uploads/${req.file.filename}`;

        // 2. Naya image aaya hai to purana delete karo
        await deleteImageFile(existingCategory.image);
    }

    // 3. Update karo
    const category = await Category.findByIdAndUpdate(req.params.id, payload, { new: true });

    return res.json({ message: "Category updated successfully", category });
};

const deleteCategory = async (req, res) => {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
        throw new AppError("Category not found", 404);
    }

    return res.json({ message: "Category deleted successfully" });
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
