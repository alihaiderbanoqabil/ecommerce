const AppError = require("../utils/AppError");

// Chalti hai jab koi route match na ho — har app.use("/api/...") ke baad register honi chahiye.
// errorHandler ko de deta hai taake 404 ka response bhi baaqi errors jaisa hi shape rakhe.
const notFound = (req, res, next) => {
    next(new AppError(`Route not found - ${req.method} ${req.originalUrl}`, 404));
};

// Ek hi jagah jo har error — throw hua, next() se aaya, ya Express 5 ne khud
// forward kiya async reject — ko ek consistent JSON response mein badalta hai.
// Sab se aakhir mein register hona chahiye, aur chaar (err, req, res, next)
// params rakhne zarori hain taake Express isay error-handling middleware samjhe.
const errorHandler = (err, req, res, next) => {
    // Response pehle se shuru ho chuka hai (jaise beech mein koi stream fail ho gaya) —
    // ab status/body badal nahi sakte, is liye Express ko connection band karne do.
    if (res.headersSent) return next(err);

    // AppError statusCode carry karta hai; http-errors (body-parser, etc.) status
    // carry karte hain; Cloudinary SDK apne errors http_code mein deta hai.
    let statusCode = err.statusCode || err.status || err.http_code || 500;
    let message = err.message || "Internal server error";

    switch (err.name) {
        case "CastError":
            statusCode = 400;
            message = `Invalid ${err.path}: ${err.value}`;
            break;
        case "ValidationError":
            statusCode = 400;
            message = Object.values(err.errors).map((e) => e.message).join(", ");
            break;
        // authenticate middleware ke jwt.verify se aata hai. verifyEmail apna
        // alag translate karta hai, kyunke purana signup link ek bad request
        // hai, authentication challenge nahi.
        case "JsonWebTokenError":
            statusCode = 401;
            message = "Invalid token";
            break;
        case "TokenExpiredError":
            statusCode = 401;
            message = "Token expired";
            break;
        case "MulterError":
            statusCode = 400;
            break;
    }

    // Unique index violation — field ka naam raw driver message se zyada useful hai
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0];
        message = field ? `${field} already exists` : "Duplicate field value";
    }

    // express.json() se aane wala malformed JSON body ka error
    if (err.type === "entity.parse.failed") {
        statusCode = 400;
        message = "Invalid JSON body";
    }

    // Poori stack sirf real bugs ke liye. Jo upar 4xx mein map ho gaya wo
    // client ki galti hai jo hum pehle se samajhte hain, is liye ek line kaafi hai.
    if (statusCode >= 500) {
        console.error(err.stack);
    } else if (!err.isOperational) {
        console.warn(`${statusCode} ${req.method} ${req.originalUrl} - ${message}`);
    }

    // 500 ka message internals leak kar sakta hai (driver output, file paths) — production mein chupa do
    if (statusCode === 500 && process.env.NODE_ENV === "production") {
        message = "Internal server error";
    }

    res.status(statusCode).json({ message });
};

module.exports = { notFound, errorHandler };
