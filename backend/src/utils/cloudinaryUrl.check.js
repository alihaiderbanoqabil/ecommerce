/**
 * publicIdFromUrl ka check — chalane ke liye: npm run check:cloudinary -w backend
 *
 * Parser hai, is liye check zaroori: galat public_id ka matlab hai purani image
 * Cloudinary par pari rehti hai (free plan ka storage chupke se bharta rehta
 * hai), aur bad-tareen soorat mein galat file delete ho jati hai.
 */
require("dotenv").config({ quiet: true }); // sirf config/cloudinary ki warning se bachne ke liye
const assert = require("assert");
const { publicIdFromUrl, publicIdsFrom } = require("./cloudinaryUrl");

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1/bano-qabil-ecommerce-backend";

// Wohi shakal jo multer-storage-cloudinary hamein deta hai
assert.strictEqual(
    publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1712345678/bano-qabil-ecommerce-backend/abc123.png"),
    "bano-qabil-ecommerce-backend/abc123"
);

// Version ke bagair bhi chalna chahiye
assert.strictEqual(
    publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/folder/name.webp"),
    "folder/name"
);

// Nested folders aur naam mein dots
assert.strictEqual(
    publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1/a/b/my.photo.jpg"),
    "a/b/my.photo"
);

// Video bhi wohi raasta hai (media routes mp4 allow karte hain)
assert.strictEqual(
    publicIdFromUrl("https://res.cloudinary.com/demo/video/upload/v1/clips/intro.mp4"),
    "clips/intro"
);

// Cloudinary ka na ho to null — warna delete karne ki koshish hoti
assert.strictEqual(publicIdFromUrl("/uploads/old-local-file.png"), null, "purana local path skip hona chahiye");
assert.strictEqual(publicIdFromUrl("https://picsum.photos/seed/electronics/400/300"), null, "bahar ka URL skip hona chahiye");
assert.strictEqual(publicIdFromUrl(null), null);
assert.strictEqual(publicIdFromUrl(undefined), null);
assert.strictEqual(publicIdFromUrl(""), null);

// ── publicIdsFrom: yehi tay karta hai ke kya kya delete hoga ────────────────

// Product ki images (array) — sab delete honi chahiyen
assert.deepStrictEqual(
    publicIdsFrom([`${CLOUD}/one.png`, `${CLOUD}/two.png`]),
    ["bano-qabil-ecommerce-backend/one", "bano-qabil-ecommerce-backend/two"]
);

// Category ki ek image (array nahi, single string)
assert.deepStrictEqual(publicIdsFrom(`${CLOUD}/solo.webp`), ["bano-qabil-ecommerce-backend/solo"]);

// Kuch bhi na ho to khali — destroyImages ko Cloudinary call hi nahi karni chahiye
assert.deepStrictEqual(publicIdsFrom(null), []);
assert.deepStrictEqual(publicIdsFrom(undefined), []);
assert.deepStrictEqual(publicIdsFrom([]), []);
assert.deepStrictEqual(publicIdsFrom([null, undefined, ""]), []);

// Seed/bahar ke URLs ko haath nahi lagana — warna kisi aur ki file delete karne
// ki koshish hoti (ya bad-tareen soorat mein hamare account ka ghalat asset)
assert.deepStrictEqual(publicIdsFrom(["https://picsum.photos/seed/x/400/300", "/uploads/old.png"]), []);

// Mila jula: sirf Cloudinary wali nikle
assert.deepStrictEqual(
    publicIdsFrom(["https://picsum.photos/seed/x/400/300", `${CLOUD}/keep.png`]),
    ["bano-qabil-ecommerce-backend/keep"]
);

// Ek hi file do dafa list mein ho to ek hi dafa destroy ho
assert.deepStrictEqual(publicIdsFrom([`${CLOUD}/same.png`, `${CLOUD}/same.png`]), [
    "bano-qabil-ecommerce-backend/same",
]);

console.log("OK — publicIdFromUrl aur publicIdsFrom: sahi files delete hongi, bahar wali chhut jayengi");
