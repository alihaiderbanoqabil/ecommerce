const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose")
const AppError = require("../utils/AppError");
// console.log(__dirname, "__dirname");
// console.log(__filename, "__filename");

// the below 2 lines of code will automatically create uploads folder 
const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });


const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new AppError("Only image files are allowed", 400));
};

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // console.log({ req, file, cb }, "destination");
        cb(null, uploadDir)
    },
    // filename: (req, file, cb) => {
    //     const ext = path.extname(file.originalname);
    //     const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    //     cb(null, uniqueName);
    // },
    filename: (req, file, cb) => {
        // console.log({ req, file, cb }, "filename");

        const ext = path.extname(file.originalname);
        // const name = path.basename(file.originalname, ext).replace(/\s+/g, "-");
        // const uniqueName = `${name}-${new mongoose.Types.ObjectId()}${ext}`;
        const uniqueName = `${new mongoose.Types.ObjectId()}${ext}`;
        cb(null, uniqueName);
    }
});


const upload = multer({
    storage: diskStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadSingle = (fieldName = "image") => upload.single(fieldName);
const uploadMultiple = (fieldName = "images", maxCount = 5) => upload.array(fieldName, maxCount);


/**
 * Token do jagah se aa sakta hai:
 *  1. httpOnly cookie — browser (login khud set karta hai, JS ko dikhti nahi)
 *  2. Authorization: Bearer <token> header — Postman, mobile app, server-to-server
 *
 * Cookie ko pehle dekhte hain kyunke browser wahi bhejta hai; header fallback
 * ke tor par rakha hua hai taake purane clients aur API tests chalte rahen.
 */
const getTokenFromRequest = (req) => {
    if (req.cookies?.token) return req.cookies.token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];

    return null;
};

const authenticate = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        throw new AppError("Login required for this action.", 401);
    }

    // jwt.verify JsonWebTokenError / TokenExpiredError throw karta hai. Express
    // middleware ke sync throws khud pakar leta hai, aur errorHandler dono ko 401 bana deta hai.
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
};

/**
 * authenticate ka narm version: token ho to req.user set kar deta hai, na ho
 * (ya kharab ho) to bhi request aage chali jati hai.
 *
 * Public routes ke liye jahan logged-in user ko thora zyada dikhana ho —
 * jaise comments list, jahan admin hidden comments bhi dekh sakta hai.
 */
const optionalAuthenticate = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            // Invalid/expired token yahan error nahi hai — guest samjho
        }
    }

    next();
};

const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user) {
        throw new AppError("Login required for this action.", 401);
    }

    if (!roles.includes(req.user.role)) {
        throw new AppError("Forbidden: insufficient role", 403);
    }

    next();
};

module.exports = {
    upload,
    getTokenFromRequest,
    authenticate,
    optionalAuthenticate,
    authorizeRoles,
    uploadSingle,
    uploadMultiple,
};


// function add(num1, num2) {
//     return num1 + num2
// }

// function add(...numbers) {
//     let sum = 0
//     console.log(numbers, "numbers");
//     for (const number of numbers) {
//         sum = sum + number;
//     }
//     return sum

// }
// console.log(add(10, 20, 30, 40, 50));
// console.log(add(10, 20, 30, 40, 50, 40));
