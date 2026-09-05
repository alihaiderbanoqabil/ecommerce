const multer = require("multer");
// connects multer directly to Cloudinary, so files go straight to Cloudinary instead of being saved locally first
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/AppError");

/**
 * Saari file uploads Cloudinary par jati hain — local disk par kuch nahi rukta.
 *
 * Wajah: Render (aur zyadatar free hosting) ka filesystem ephemeral hai. Har
 * deploy aur har restart par disk saaf ho jati hai, is liye `uploads/` folder
 * mein rakhi images kuch der baad khud hi ghayab ho jatin — aur unhein bachane
 * ke liye paid persistent disk khareedni parti.
 *
 * Upload ke baad multer ye deta hai:
 *   file.path      -> secure https URL (yehi DB mein save hota hai)
 *   file.filename  -> Cloudinary public_id (delete karne ke liye)
 */

const FOLDER = "bano-qabil-ecommerce-backend";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storageFor = (formats) =>
    new CloudinaryStorage({
        cloudinary,
        params: {
            folder: FOLDER,
            allowed_formats: formats,
            resource_type: "auto", // lets Cloudinary detect image/video/raw automatically
        },
    });

// Sirf tasveerein — products aur categories ke liye. Cloudinary ke
// allowed_formats ke ilawa mimetype bhi check karte hain, taake "image.jpg"
// naam ki mp4 product gallery mein na ghus jaye.
const imageUpload = multer({
    storage: storageFor(["jpg", "png", "jpeg", "webp"]),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) return cb(null, true);
        cb(new AppError("Only image files are allowed", 400));
    },
    limits: { fileSize: MAX_FILE_SIZE },
});

// Media library — yahan video bhi allowed hai (pehle se aisa hi tha)
const cloudinaryUpload = multer({
    storage: storageFor(["jpg", "png", "jpeg", "webp", "mp4"]),
    limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { cloudinaryUpload, imageUpload };
