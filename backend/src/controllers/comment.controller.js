const Comment = require("../models/comment.model");
const Product = require("../models/product.model");
const AppError = require("../utils/AppError");
const { queryService } = require("../utils/queryService");

// queryService user ki query ko baseFilter ke UPAR merge karta hai, to client
// `?product=<koi aur id>` ya `?isActive=false` bhej kar hamara pinned filter
// override kar sakta hai. Is liye jo keys hum server-side pin karte hain unhe
// query se nikal dete hain.
const stripPinnedKeys = (query, keys) => {
    const safe = { ...query };
    keys.forEach((key) => delete safe[key]);
    return safe;
};

// Reply ko uske parent ke andar nest kar deta hai (1 level deep threads).
const attachReplies = (comments, replies) => {
    const byParent = new Map();

    for (const reply of replies) {
        const key = reply.parentComment.toString();
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(reply);
    }

    return comments.map((comment) => ({
        ...comment,
        replies: byParent.get(comment._id.toString()) || [],
    }));
};

/**
 * GET /api/comments
 * Flat list — search, filter, sort, paginate sab queryService se.
 * Public: sirf active comments. Admin `?isActive=false` bhi dekh sakta hai.
 */
const getComments = async (req, res) => {
    const isAdmin = req.user?.role === "admin";

    const result = await queryService(
        Comment,
        isAdmin ? req.query : stripPinnedKeys(req.query, ["isActive"]),
        {
            baseFilter: isAdmin ? {} : { isActive: true },
            searchFields: ["text"],
            populate: [
                { path: "user", select: "name" },
                { path: "product", select: "name price" },
            ],
        }
    );

    return res.json({ message: "Comments fetched successfully.", ...result });
};

/**
 * GET /api/products/:productId/comments
 * Ek product ke top-level comments (paginated) + un ke replies nested,
 * sath mein star breakdown summary.
 */
const getProductComments = async (req, res) => {
    const productId = req.params.productId;

    const product = await Product.findById(productId).select("name averageRating numReviews");
    if (!product) {
        throw new AppError("Product not found", 404);
    }

    // product / parentComment / isActive hum khud pin karte hain — client se nahi lete
    const query = stripPinnedKeys(req.query, ["product", "parentComment", "isActive"]);

    const result = await queryService(Comment, query, {
        baseFilter: { product: product._id, parentComment: null, isActive: true },
        searchFields: ["text"],
        populate: [{ path: "user", select: "name" }],
    });

    // Sirf isi page ke comments ki replies laate hain (poore product ki nahi)
    const replies = await Comment.find({
        parentComment: { $in: result.data.map((comment) => comment._id) },
        isActive: true,
    })
        .populate("user", "name")
        .sort({ createdAt: 1 })
        .lean();

    const summary = await Comment.getRatingSummary(product._id);

    return res.json({
        message: "Comments fetched successfully.",
        product: {
            _id: product._id,
            name: product.name,
            averageRating: product.averageRating,
            numReviews: product.numReviews,
        },
        summary,
        data: attachReplies(result.data.map((comment) => comment.toObject()), replies),
        pagination: result.pagination,
    });
};

/**
 * GET /api/comments/:id
 * Ek comment + uski replies.
 */
const getCommentById = async (req, res) => {
    const comment = await Comment.findById(req.params.id)
        .populate("user", "name")
        .populate("product", "name price")
        .lean();

    if (!comment || (!comment.isActive && req.user?.role !== "admin")) {
        throw new AppError("Comment not found", 404);
    }

    const replies = await Comment.find({ parentComment: comment._id, isActive: true })
        .populate("user", "name")
        .sort({ createdAt: 1 })
        .lean();

    return res.json({ ...comment, replies });
};

/**
 * POST /api/comments            (body: product, text, rating?, parentComment?)
 * POST /api/products/:productId/comments
 *
 * Login zaroori hai. `user` req.user se aata hai — client jo user bheje wo
 * ignore hota hai, warna koi bhi kisi aur ke naam par comment kar sakta.
 */
const createComment = async (req, res) => {
    const productId = req.params.productId || req.body.product;
    if (!productId) {
        throw new AppError("Product is required", 400);
    }

    const product = await Product.findById(productId).select("isActive");
    if (!product) {
        throw new AppError("Product not found", 404);
    }
    if (!product.isActive) {
        throw new AppError("Cannot comment on an inactive product", 400);
    }

    const payload = {
        product: product._id,
        user: req.user.id,
        text: req.body.text,
        rating: req.body.rating === undefined || req.body.rating === "" ? null : req.body.rating,
        parentComment: req.body.parentComment || null,
    };

    if (payload.parentComment) {
        const parent = await Comment.findById(payload.parentComment);

        if (!parent) {
            throw new AppError("Parent comment not found", 404);
        }
        if (parent.product.toString() !== product._id.toString()) {
            throw new AppError("Parent comment belongs to a different product", 400);
        }

        // Reply ka reply: usay reject nahi karte, usi thread mein daal dete
        // hain (Facebook wala tareeqa). Yani nesting hamesha ek hi level rehti
        // hai — UI ko unlimited depth sambhalni nahi parti — magar user ko
        // "yahan reply nahi kar sakte" jaisi rukawat bhi nahi milti.
        // Frontend text mein "@Name" laga deta hai, is liye kis ko jawab diya
        // ja raha hai wo phir bhi saaf rehta hai.
        if (parent.parentComment) {
            payload.parentComment = parent.parentComment;
        }

        payload.rating = null; // reply par rating nahi hoti
    } else if (payload.rating !== null) {
        // Text-only comments jitne marzi, magar rating ek user sirf ek baar de
        // sakta hai (badalna ho to PATCH karo) — warna average jhoot bol dega.
        const alreadyRated = await Comment.findOne({
            product: product._id,
            user: req.user.id,
            parentComment: null,
            rating: { $ne: null },
        });

        if (alreadyRated) {
            throw new AppError("You have already rated this product", 400);
        }
    }

    // save() ke post hook se product ka averageRating khud update ho jata hai
    const comment = await Comment.create(payload);
    await comment.populate("user", "name");

    return res.status(201).json({ message: "Comment created successfully", comment });
};

/**
 * PATCH /api/comments/:id
 * Owner apna text/rating badal sakta hai; `isActive` (moderation) sirf admin.
 */
const updateComment = async (req, res) => {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
        throw new AppError("Comment not found", 404);
    }

    const isOwner = comment.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
        throw new AppError("Forbidden", 403);
    }

    if (req.body.text !== undefined) {
        comment.text = req.body.text;
    }

    if (req.body.rating !== undefined) {
        if (comment.parentComment) {
            throw new AppError("A reply cannot have a rating", 400);
        }

        const rating = req.body.rating === null || req.body.rating === "" ? null : req.body.rating;

        // Pehle bina rating ka comment tha aur ab rating add ho rahi hai — to
        // check karo ke is user ka koi aur rated review pehle se maujood na ho.
        if (rating !== null && comment.rating === null) {
            const alreadyRated = await Comment.findOne({
                _id: { $ne: comment._id },
                product: comment.product,
                user: comment.user,
                parentComment: null,
                rating: { $ne: null },
            });

            if (alreadyRated) {
                throw new AppError("You have already rated this product", 400);
            }
        }

        comment.rating = rating;
    }

    if (req.body.isActive !== undefined) {
        if (!isAdmin) {
            throw new AppError("Forbidden: only admin can hide or restore comments", 403);
        }
        comment.isActive = req.body.isActive;
    }

    await comment.save(); // post-save hook product rating dobara calculate karta hai
    await comment.populate("user", "name");

    return res.json({ message: "Comment updated successfully", comment });
};

/**
 * DELETE /api/comments/:id
 * Owner ya admin. Comment ke sath uski replies bhi jaati hain (orphan replies
 * ka koi matlab nahi hota).
 */
const deleteComment = async (req, res) => {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
        throw new AppError("Comment not found", 404);
    }

    if (comment.user.toString() !== req.user.id && req.user.role !== "admin") {
        throw new AppError("Forbidden", 403);
    }

    const { deletedCount } = await Comment.deleteMany({
        $or: [{ _id: comment._id }, { parentComment: comment._id }],
    });

    // deleteMany ke pass koi doc nahi hota, is liye hook chal nahi sakta —
    // rating yahan manually sync karte hain.
    await Comment.syncProductRating(comment.product);

    return res.json({
        message: "Comment deleted successfully",
        deletedCount, // comment + uski replies
    });
};

module.exports = {
    getComments,
    getProductComments,
    getCommentById,
    createComment,
    updateComment,
    deleteComment,
};
