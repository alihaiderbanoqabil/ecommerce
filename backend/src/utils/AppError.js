/**
 * Ye error jaan-boojh kar phenka jata hai — koi business rule fail hui, bug nahi.
 *
 * Status code error ke sath hi chala jata hai, is liye controller sirf
 * `throw new AppError("Product not found", 404)` likh sakta hai aur errorHandler
 * khud sahi status bhej dega. Express 5 async handlers ke throws khud forward
 * kar deta hai, is liye call site pe try/catch ki zarorat nahi.
 *
 * `isOperational` flag isay "expected" mark karta hai, jisse errorHandler
 * routine 404/403 ke liye stack trace print nahi karta.
 */
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
