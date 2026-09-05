const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const { readTokenCookie } = require("../utils/authCookie");
const { imageUpload } = require("./cloudinaryUpload");
// console.log(__dirname, "__dirname");
// console.log(__filename, "__filename");

/**
 * Product/category images seedha Cloudinary par jati hain — pehle disk par
 * (`uploads/` folder) rakhi jati thin, magar Render jaisi hosting par wo disk
 * har deploy/restart par saaf ho jati hai aur images ghayab.
 *
 * Naam wahi rakhe hain (uploadSingle / uploadMultiple), sirf peeche ka storage
 * badla hai — is liye routes jaisay thay wesay hi chal rahe hain. Controllers
 * mein ab `file.path` (Cloudinary ka https URL) save hota hai, `/uploads/...`
 * nahi. Details: middlewares/cloudinaryUpload.js
 */
const uploadSingle = (fieldName = "image") => imageUpload.single(fieldName);
const uploadMultiple = (fieldName = "images", maxCount = 5) => imageUpload.array(fieldName, maxCount);


/**
 * Token do jagah se aa sakta hai:
 *  1. httpOnly cookie — browser (login khud set karta hai, JS ko dikhti nahi)
 *  2. Authorization: Bearer <token> header — Postman, mobile app, server-to-server
 *
 * Cookie ko pehle dekhte hain kyunke browser wahi bhejta hai; header fallback
 * ke tor par rakha hua hai taake purane clients aur API tests chalte rahen.
 *
 * Cookie ka naam portal ke hisab se badalta hai (admin_token vs token), taake
 * ek hi browser mein admin aur customer ke sessions alag rahen —
 * utils/authCookie.js dekhen.
 */
const getTokenFromRequest = (req) => {
    const cookieToken = readTokenCookie(req);
    if (cookieToken) return cookieToken;

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
