const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        publicId: { type: String, required: true }, // needed later for deleting/updating the file in Cloudinary
        // type: { type: String, enum: ["image", "video"], }, // optional, can be used for filtering or validation
        // size: { type: Number }, // optional, can be used for validation or display
        // originalName: { type: String }, // optional, can store the original file name
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Media", mediaSchema);