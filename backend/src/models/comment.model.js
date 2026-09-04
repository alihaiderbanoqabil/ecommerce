const mongoose = require("mongoose");

/**
 * Comment / Review
 * -----------------------------------------------------------------------
 * Ek comment do cheezon se linked hai: Product (kis cheez par baat ho rahi
 * hai) aur User (kisne likha). `parentComment` khud isi model ko refer karta
 * hai — yahi se replies (threads) banti hain, bilkul Category ke
 * `parentCategory` ki tarah.
 *
 * Rating sirf top-level comment par hoti hai (review), reply par nahi.
 * Jab bhi rating badalti hai, `syncProductRating` product ke
 * `averageRating` / `numReviews` ko dobara calculate kar deta hai — is liye
 * product list par average dikhane ke liye har baar aggregate nahi karna parta.
 */
const commentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      minlength: [2, "Comment is too short"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    // null = sirf comment, koi rating nahi. Reply par rating allowed nahi
    // (controller strip kar deta hai) — warna ek hi user average kai baar hila deta.
    rating: {
      type: Number,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
      default: null,
    },
    // null = top-level comment. Value = kis comment ka reply hai (sirf 1 level deep).
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    // Soft delete / moderation — admin comment chupa sakta hai without deleting.
    // Hidden comment average rating mein bhi count nahi hota.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Product page ka main query: ek product ke naye comments pehle
commentSchema.index({ product: 1, parentComment: 1, createdAt: -1 });
// "is user ne is product ko pehle rate kiya hai?" check + reply lookup
commentSchema.index({ product: 1, user: 1 });
commentSchema.index({ parentComment: 1 });

/**
 * Product ke rating fields ko comments se dobara calculate karta hai.
 * Sirf active + rated comments count hote hain.
 */
commentSchema.statics.syncProductRating = async function (productId) {
  if (!productId) return;

  const [stats] = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
        isActive: true,
        rating: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  // Product ko yahan lazily resolve karte hain (require ki jagah), warna
  // dono models ek dusre ko require karte to circular dependency ban jati.
  await mongoose.model("Product").findByIdAndUpdate(productId, {
    // 4.6666 -> 4.7
    averageRating: stats ? Math.round(stats.averageRating * 10) / 10 : 0,
    numReviews: stats ? stats.numReviews : 0,
  });
};

/**
 * Ek product ki star breakdown: { average, total, breakdown: { 5: n, 4: n, ... } }
 * Product detail page par "5 star (12), 4 star (3)" dikhane ke liye.
 */
commentSchema.statics.getRatingSummary = async function (productId) {
  const rows = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
        isActive: true,
        rating: { $ne: null },
      },
    },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const row of rows) {
    breakdown[row._id] = row.count;
    total += row.count;
    sum += row._id * row.count;
  }

  return {
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    total,
    breakdown,
  };
};

// create() aur document.save() dono ke baad chalta hai
commentSchema.post("save", async function (doc) {
  await doc.constructor.syncProductRating(doc.product);
});

// findByIdAndUpdate / findByIdAndDelete ke baad. doc null hota hai jab kuch match na ho.
commentSchema.post(["findOneAndUpdate", "findOneAndDelete"], async function (doc) {
  if (doc) await mongoose.model("Comment").syncProductRating(doc.product);
});

module.exports = mongoose.model("Comment", commentSchema);
