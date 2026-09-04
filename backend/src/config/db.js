require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
    // Mongoose connection listeners (error, disconnected, reconnected)
    // Ye config/db.js mein hain aur ek different problem solve karte hain. connectDB() function ka try/catch sirf pehli dafa connect hote waqt ke error ko pakarta hai — yani jab app start ho raha ho aur MongoDB se connection banaya ja raha ho.

    // Lekin server chalne ke baad agar:

    // Internet/network chala jaye
    // MongoDB service crash ho jaye ya restart ho
    // Connection kisi wajah se drop ho jaye
    // ...to ye ek naya error nahi hai jo try/catch pakre — Mongoose isay event ke through bhejta hai, promise reject nahi karta. Is liye alag se listeners chahiye:

    // Pehle in listeners ke bagair, agar connection beech mein toot jata, to koi log hi nahi milta — aapko pata bhi nahi chalta ke DB disconnect ho gaya, requests bas fail hona shuru ho jatin bina wajah bataye. Ab kam se kam terminal mein saaf dikhega "MongoDB disconnected" ya "MongoDB reconnected", jo debugging mein madad karega.

    // Note: ye sirf log karte hain, khud se koi action nahi lete (jaise process ko band karna) — Mongoose apni internal retry logic khud chalata hai, so reconnected event aana normal hai agar connection wapis aa jaye.
    mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
        console.log("MongoDB reconnected");
    });

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("MongoDB Connected Successfully");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;