const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Ye do fields Comment model maintain karta hai (syncProductRating) —
    // client inko bhejta nahi, warna list par average dikhane ke liye har
    // request par comments aggregate karne partey.
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    // `comments` virtual ko JSON response mein bhejne ke liye zaroori hai
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false, // mongoose ka default `id` virtual off — response shape wesa hi rahe
  }
);

productSchema.index({ name: "text", description: "text" });
// Rating ke hisab se sort karne ke liye: ?sort=-averageRating
productSchema.index({ averageRating: -1 });

/**
 * Virtual link: Product -> Comments
 *
 * Comments ki ObjectId array product ke andar store nahi karte (ek product par
 * hazaron comments aa sakte hain, document bloat ho jata). Uski jagah Comment
 * apne andar `product` rakhta hai, aur ye virtual reverse direction se populate
 * karne deta hai:
 *
 *   Product.findById(id).populate({
 *     path: "comments",
 *     match: { isActive: true, parentComment: null },
 *     options: { sort: { createdAt: -1 }, limit: 10 },
 *     populate: { path: "user", select: "name" },
 *   });
 */
productSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "product",
});

module.exports = mongoose.model("Product", productSchema);