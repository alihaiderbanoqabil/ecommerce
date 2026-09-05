/**
 * Cloudinary par pari wo files dhoondta hai jinhein ab koi DB record point
 * nahi karta ("orphans") — yaani wo jo is fix se PEHLE upload hui thin aur
 * replace/delete hone par peeche reh gayin.
 *
 * Aage se ye masla nahi hoga (controllers ab khud safai karte hain), ye script
 * sirf purana kachra saaf karne ke liye hai.
 *
 *   npm run orphans -w backend            -> sirf list dikhata hai (kuch delete NAHI karta)
 *   npm run orphans -w backend -- --delete -> list mein jo hai wo delete kar deta hai
 *
 * Do ehtiyaat jaan boojh kar:
 *   1. Default dry-run hai. Delete tab hi hota hai jab aap khud --delete den.
 *   2. Sirf app ke apne folder ko dekhta hai (UPLOAD_FOLDER) — media library
 *      mein pari baqi cheezon ko haath tak nahi lagata.
 *
 * Chalane se PEHLE dekh lein ke ye kis database se juda hai — script khud
 * batata hai. Galat DB (jaise khali database) ka matlab hoga ke har file
 * orphan lagegi.
 */
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Media = require("../models/media.model");
const { publicIdsFrom } = require("./cloudinaryUrl");

const UPLOAD_FOLDER = "bano-qabil-ecommerce-backend";

// Har wo public_id jo abhi bhi kisi record se juda hua hai
const collectUsedIds = async () => {
    const [products, categories, media] = await Promise.all([
        Product.find({}, "images").lean(),
        Category.find({}, "image").lean(),
        Media.find({}, "url publicId").lean(),
    ]);

    const used = new Set();
    products.forEach((p) => publicIdsFrom(p.images).forEach((id) => used.add(id)));
    categories.forEach((c) => publicIdsFrom(c.image).forEach((id) => used.add(id)));
    // Media apna publicId khud store karta hai — URL parse karne ki zarorat nahi
    media.forEach((m) => {
        if (m.publicId) used.add(m.publicId);
        publicIdsFrom(m.url).forEach((id) => used.add(id));
    });

    return used;
};

// Folder ki saari files (Cloudinary ek dafa mein 500 se zyada nahi deta)
const listFolderAssets = async () => {
    const assets = [];
    let next;

    do {
        const page = await cloudinary.api.resources({
            type: "upload",
            prefix: `${UPLOAD_FOLDER}/`,
            max_results: 500,
            next_cursor: next,
        });
        assets.push(...page.resources);
        next = page.next_cursor;
    } while (next);

    return assets;
};

(async () => {
    const shouldDelete = process.argv.includes("--delete");

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Database : ${mongoose.connection.db.databaseName} (${process.env.MONGO_URI.split("@").pop()})`);
    console.log(`Folder   : ${UPLOAD_FOLDER}/\n`);

    const [used, assets] = await Promise.all([collectUsedIds(), listFolderAssets()]);
    const orphans = assets.filter((asset) => !used.has(asset.public_id));

    console.log(`Cloudinary par is folder mein : ${assets.length}`);
    console.log(`DB mein istemal ho rahi        : ${assets.length - orphans.length}`);
    console.log(`Orphan (koi record nahi)       : ${orphans.length}\n`);

    orphans.forEach((o) => {
        const size = (o.bytes / 1024).toFixed(0);
        console.log(`  ${o.public_id}  (${size} KB, ${o.created_at.slice(0, 10)})`);
    });

    if (!orphans.length) {
        console.log("Kuch saaf karne ko nahi hai.");
    } else if (!shouldDelete) {
        console.log("\nDRY RUN — kuch delete nahi hua.");
        console.log("Upar wali list theek lag rahi ho to: npm run orphans -w backend -- --delete");
    } else {
        for (const orphan of orphans) {
            const { result } = await cloudinary.uploader.destroy(orphan.public_id);
            console.log(`  deleted ${orphan.public_id} -> ${result}`);
        }
        console.log(`\n${orphans.length} orphan files delete ho gayin.`);
    }

    await mongoose.disconnect();
})().catch((error) => {
    console.error("FAILED —", error.message);
    process.exit(1);
});
