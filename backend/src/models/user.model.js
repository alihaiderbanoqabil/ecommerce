const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
            select: false, // don't return password by default
        },
        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },
        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: String,
        },
        phone: {
            type: String,
            trim: true,
            unique: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: {
            type: String,
            default: null,
            select: false, // don't return password by default
        },
        // Forgot-password flow. Token DB mein bhi rakhte hain taake ek link sirf
        // ek baar chale — reset ke baad isay null kar dete hain, to purana email
        // dobara use nahi ho sakta (chahe JWT ki expiry baqi ho).
        passwordResetToken: {
            type: String,
            default: null,
            select: false,
        },

        // embedding
        //  addresses: [{
        //             street: String,
        //             city: String,
        //             state: String,
        //             zip: String,
        //             country: String,
        //         }],

    },
    { timestamps: true }
);

// Hash password before saving
// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);