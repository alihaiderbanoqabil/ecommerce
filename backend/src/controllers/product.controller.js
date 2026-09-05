const Product = require("../models/product.model");
const Comment = require("../models/comment.model");
const AppError = require("../utils/AppError");
const { queryService } = require("../utils/queryService");
const { destroyImages } = require("../utils/cloudinaryUrl");
const { notifyNewProduct } = require("../services/notification.service");

const getProducts = async (req, res) => {
    const result = await queryService(Product, req.query,
        {
            // Customer/guest ko sirf active products dikhte hain. Admin table
            // isActive column dikhata hai aur products ko draft/hide karne deta
            // hai — is liye admin ko dono (active + inactive) milne chahiyen,
            // warna jo product hide kiya jaye wo admin ki apni list se hi
            // ghayab ho jata hai.
            baseFilter: req.user?.role === "admin" ? {} : { isActive: true },
            searchFields: ['name', 'description'],       // regex search targets
            populate: [{ path: 'category', select: 'name slug' }],
        }
    );

    return res.json({ message: "Products fetched successfully.", ...result });
};

const getProductById = async (req, res) => {
    // `comments` product ka virtual hai (product.model.js dekho) — comments
    // product document ke andar store nahi hote, reverse populate hote hain.
    // Yahan sirf 10 latest top-level comments preview ke liye laate hain;
    // poori list + replies GET /api/products/:productId/comments se milti hai.
    const product = await Product.findById(req.params.id)
        .populate("category", "name slug")
        .populate({
            path: "comments",
            match: { isActive: true, parentComment: null },
            options: { sort: { createdAt: -1 }, limit: 10 },
            populate: { path: "user", select: "name" },
        });

    if (!product) {
        throw new AppError("Product not found", 404);
    }

    return res.json(product);
};

const createProduct = async (req, res) => {
    const payload = { ...req.body };

    if (req.files && req.files.length) {
        // `file.path` = Cloudinary ka https URL (middlewares/cloudinaryUpload.js).
        // Pehle "/uploads/..." relative path save hota tha, jo Render par deploy
        // hote hi toot jata: wahan disk har restart par khali ho jati hai, aur
        // frontend alag domain par hota hai.
        payload.images = req.files.map((file) => file.path);
    }

    const product = await Product.create(payload);

    // Har juday hue client ko realtime batao — customer app toast + bell mein
    // dikhata hai. Sirf active products ka announcement, warna draft/hidden
    // product ki notification chali jati jo list mein hi nahi aata.
    if (product.isActive) await notifyNewProduct(product);

    return res.status(201).json({ message: "Product created successfully", product });
};

const updateProduct = async (req, res) => {
    const payload = { ...req.body };

    // Nayi images aayi hain to purani ka record ab chahiye — update ke baad wo
    // DB se ja chuki hongi, aur Cloudinary par hamesha ke liye pari reh jatin.
    // Sirf isi soorat mein extra query, warna normal edit ek hi query rehta hai.
    let oldImages = null;
    if (req.files && req.files.length) {
        payload.images = req.files.map((file) => file.path);
        oldImages = (await Product.findById(req.params.id).select("images").lean())?.images;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!product) {
        throw new AppError("Product not found", 404);
    }

    // Sab se aakhir mein — pehle DB set ho jaye, phir purani files hatayen.
    // Ulta karne par ek nakaam update ke baad images bhi ja chuki hoti hain.
    await destroyImages(oldImages);

    return res.json({ message: "Product updated successfully", product });
};

const deleteProduct = async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
        throw new AppError("Product not found", 404);
    }

    // Product gaya to uske comments bhi — warna DB mein aise comments reh
    // jatey hain jinka product hi maujood nahi (orphan documents).
    const { deletedCount } = await Comment.deleteMany({ product: product._id });

    // ...aur uski images bhi, warna Cloudinary par aisi files rehti hain
    // jinhein ab koi record point hi nahi karta
    await destroyImages(product.images);

    return res.json({ message: "Product deleted successfully", deletedComments: deletedCount });
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};
