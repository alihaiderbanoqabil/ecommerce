const cloudinary = require("../config/cloudinary");

/**
 * Cloudinary URL se public_id nikalta hai.
 *
 * Zarorat kyun: purani image delete karne ke liye Cloudinary ko public_id
 * chahiye, magar DB mein hum sirf URL rakhte hain (jo `<img src>` mein seedha
 * chal jata hai). Alag `imagePublicId` column rakhne ka matlab hota har model
 * mein naya field + purane records ki migration — URL se nikal lena saasta hai.
 *
 *   https://res.cloudinary.com/demo/image/upload/v1712345678/folder/abc.png
 *   -> "folder/abc"
 *
 * ponytail: upload ke waqt transformations nahi lagate, is liye parser sirf
 * optional `v<number>/` prefix handle karta hai. Agar aage chal kar upload par
 * transformations lagayen (jaise /upload/w_500/v123/...), to yahan wo segments
 * bhi hataney parenge — ya phir upload ke waqt `file.filename` (public_id)
 * model mein save karna parega.
 */
const publicIdFromUrl = (url) => {
    if (typeof url !== "string") return null;

    // Cloudinary ke har URL mein "/upload/" hota hai; na ho to ye humari image
    // nahi (purana /uploads/... path ya koi bahar ka URL) — delete kuch nahi karna.
    const afterUpload = url.split("/upload/")[1];
    if (!afterUpload) return null;

    return (
        afterUpload
            .split("?")[0] // query string (agar koi ho)
            .replace(/^v\d+\//, "") // version prefix
            .replace(/\.[^./]+$/, "") // extension
        || null
    );
};

/**
 * Ek ya kai URLs se un public_ids ki list jo waqai delete karne layak hain.
 *
 * Alag (aur pure) function is liye hai ke yehi wo hissa hai jahan ghalti
 * mehngi parti hai — test cloudinaryUrl.check.js mein hai.
 *
 * - single value ya array, dono chalte hain
 * - null/undefined/khali entries nikal deta hai
 * - jo Cloudinary ke nahi (picsum seed URLs, purane /uploads paths) wo chhor deta hai
 * - duplicates hata deta hai, taake ek hi file do dafa destroy na ho
 */
const publicIdsFrom = (urls) => [
    ...new Set(
        []
            .concat(urls ?? [])
            .map(publicIdFromUrl)
            .filter(Boolean)
    ),
];

/**
 * Cloudinary se files hata deta hai. Best-effort: yahan fail hone par request
 * nahi girni chahiye — DB ka kaam ho chuka hota hai, ye sirf safai hai.
 * (Is liye har call site is ke await ko aakhir mein rakhta hai.)
 */
const destroyImages = async (urls) => {
    const publicIds = publicIdsFrom(urls);
    if (!publicIds.length) return;

    await Promise.all(
        publicIds.map(async (publicId) => {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error(`Failed to delete ${publicId} from Cloudinary:`, err.message);
            }
        })
    );
};

module.exports = { publicIdFromUrl, publicIdsFrom, destroyImages };
