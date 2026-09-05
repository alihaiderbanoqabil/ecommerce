const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Saari images ab yahin jati hain (koi local uploads folder nahi), is liye ye
// keys na hon to har upload fail karta hai. Server phir bhi chalta rehta hai —
// baqi app theek kaam karta hai — magar startup par saaf bata dete hain, warna
// pehli upload par "Must supply api_key" jaisa uljha hua error milta hai.
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("⚠️  CLOUDINARY_* env vars missing — image uploads will fail (see .env.example)");
}

module.exports = cloudinary;