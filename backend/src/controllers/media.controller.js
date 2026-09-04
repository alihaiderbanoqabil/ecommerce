const Media = require("../models/media.model");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/AppError");
const { uploadSingleMedia } = require("../services/media.service");

const uploadMedia = async (req, res) => {
    console.log(req.file, "file");

    const media = await uploadSingleMedia(req)
    
    //  if (!req.file) {
    //         throw new AppError("No file uploaded", 400);
    //     }

    //     const media = await Media.create({
    //         url: req.file.path,          // Cloudinary secure URL
    //         publicId: req.file.filename, // Cloudinary public_id
    //         uploadedBy: req.user?._id,
    //     });


    return res.status(201).json({ message: "Upload successful", media });
};

const uploadMultipleMedia = async (req, res) => {
    if (!req.files || !req.files.length) {
        throw new AppError("No files uploaded", 400);
    }

    const mediaDocs = await Promise.all(
        req.files.map((file) =>
            Media.create({ url: file.path, publicId: file.filename, uploadedBy: req.user?._id })
        )
    );

    return res.status(201).json({ message: "Upload successful", media: mediaDocs });
};

const updateMedia = async (req, res) => {
    const media = await Media.findById(req.params.id);
    if (!media) {
        throw new AppError("Media not found", 404);
    }

    if (!req.file) {
        throw new AppError("No file uploaded", 400);
    }

    // Delete the old file from Cloudinary
    if (media.publicId) {
        await cloudinary.uploader.destroy(media.publicId);
    }

    // Update the DB record with the new file's info
    media.url = req.file.path;          // new secure URL
    media.publicId = req.file.filename; // new public_id

    await media.save();

    return res.json({ message: "Media updated successfully", media });
};

const deleteMedia = async (req, res) => {
    const media = await Media.findById(req.params.id);
    if (!media) {
        throw new AppError("Media not found", 404);
    }

    await cloudinary.uploader.destroy(media.publicId);
    await media.deleteOne();

    return res.json({ message: "Deleted successfully" });
};

module.exports = {
    uploadMedia,
    uploadMultipleMedia,
    updateMedia,
    deleteMedia,
};