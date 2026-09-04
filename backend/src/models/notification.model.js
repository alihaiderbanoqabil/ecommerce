const mongoose = require("mongoose");

/**
 * Notification
 * -----------------------------------------------------------------------
 * Teen tarah ki notifications ek hi model mein:
 *
 *   user: <id>                    -> sirf us ek user ke liye (order status)
 *   user: null, audience: "all"   -> sab customers ke liye (naya product)
 *   user: null, audience: "admins"-> sab admins ke liye (nayi order, payment)
 *
 * Broadcast ke liye har user ka alag document banana mehnga hai — 10,000
 * customers ka matlab ek product par 10,000 documents. Is liye broadcast ka
 * ek hi document hota hai aur "kis ne parh liya" `readBy` array batata hai.
 *
 * `audience` sirf tab dekha jata hai jab `user` null ho. Targeted notification
 * apne user se hi pehchani jati hai — is se purane documents (jin par audience
 * nahi tha) bhi theek chalte rehte hain.
 *
 * Isi wajah se notifications page refresh ke baad bhi rehti hain, aur wo bhi
 * mil jati hain jo user ke offline hone ke doran aayin — socket sirf "abhi
 * jo juday hain" un tak pohanchata hai, record yahan banta hai.
 */
const notificationSchema = new mongoose.Schema(
  {
    // null = broadcast (sab ke liye)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: ["product:new", "order:status", "order:payment", "order:new"],
    },
    // Sirf broadcast (user: null) ke liye — kis tabqe ko dikhani hai
    audience: {
      type: String,
      enum: ["all", "admins"],
      default: "all",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      trim: true,
    },
    // Frontend isay click par kholta hai — /products/<id> ya /orders/<id>
    link: {
      type: String,
      trim: true,
    },
    // Jin users ne ise parh liya. Targeted notification ke liye is mein zyada
    // se zyada ek hi id hoti hai; broadcast ke liye kai.
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// "meri aur broadcast, naye pehle" — yehi list ka main query hai
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, createdAt: -1 });

/**
 * Ek user ki notifications ka filter: apni targeted + us ke tabqe ki broadcast.
 *
 * Admin ko customer wali broadcast (naya product) nahi dikhati — wo product
 * usne khud banaya hota hai, aur uske links customer portal ke hote hain.
 * Isi tarah customer ko admin wali (nayi order aayi) nahi dikhti.
 */
notificationSchema.statics.filterFor = (userId, role) => ({
  $or: [
    { user: userId },
    { user: null, audience: role === "admin" ? "admins" : "all" },
  ],
});

/**
 * Document ko frontend ki shape mein badalta hai — `read` boolean
 * (readBy array frontend ke kisi kaam ka nahi, aur doosre users ki ids
 * bhejna theek bhi nahi).
 */
notificationSchema.statics.toClient = (doc, userId) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  const read = (plain.readBy || []).some((id) => String(id) === String(userId));

  return {
    _id: plain._id,
    type: plain.type,
    title: plain.title,
    body: plain.body,
    link: plain.link,
    read,
    createdAt: plain.createdAt,
  };
};

module.exports = mongoose.model("Notification", notificationSchema);
