const Category = require("../models/category.model");
const AppError = require("../utils/AppError");
const { destroyImages } = require("../utils/cloudinaryUrl");
const { queryService } = require("../utils/queryService");

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
        // multer-storage-cloudinary `file.path` mein poora https URL deta hai —
        // wohi save karte hain, kyunke frontend usay seedha <img src> mein
        // laga deta hai (chahe wo kisi bhi domain par chal raha ho).
        payload.image = req.file.path;
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
        payload.image = req.file.path;
    }

    // 2. Update karo
    const category = await Category.findByIdAndUpdate(req.params.id, payload, { new: true });

    // 3. DB set hone ke BAAD purani image hatao — pehle hatane par ek nakaam
    //    update category ko bina image ke chhor deta tha
    if (req.file) {
        await destroyImages(existingCategory.image);
    }

    return res.json({ message: "Category updated successfully", category });
};

const deleteCategory = async (req, res) => {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
        throw new AppError("Category not found", 404);
    }

    await destroyImages(category.image);

    return res.json({ message: "Category deleted successfully" });
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
