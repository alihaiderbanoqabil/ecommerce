const Media = require("../models/media.model");

const uploadSingleMedia = async (req) => {
     if (!req.file) {
        throw new AppError("No file uploaded", 400);
    }

    const media = await Media.create({
        url: req.file.path,          // Cloudinary secure URL
        publicId: req.file.filename, // Cloudinary public_id
        uploadedBy: req.user?._id,
    });

    return media;
}

module.exports = {
    uploadSingleMedia
};