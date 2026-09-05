/**
 * buildFilter ka check — chalane ke liye: npm run check:query -w backend
 *
 * Sab se ahem baat jo ye check pakarta hai: `baseFilter` client ki query se
 * jeetta hai. Ulta hone par ye asal bug wapis aa jata hai —
 *   ?user=<kisi aur ki id>  -> customer doosre logon ki orders parh leta tha
 *   ?isActive=false         -> chhupaye gaye products/comments dikh jate thay
 */
const assert = require("assert");
const { buildFilter } = require("./queryService");

// ── Pinned filter override nahi ho sakta ─────────────────────────────────────
assert.deepStrictEqual(
    buildFilter({ user: "someone-elses-id" }, { user: "my-id" }),
    { user: "my-id" },
    "client apni orders ke ilawa kuch nahi dekh sakta"
);

assert.deepStrictEqual(
    buildFilter({ isActive: "false" }, { isActive: true }),
    { isActive: true },
    "guest/customer hidden records nahi dekh sakta"
);

// baseFilter khali ho (admin) to client ka filter chalta hai
assert.deepStrictEqual(
    buildFilter({ isActive: "false" }, {}),
    { isActive: "false" },
    "admin ko apna isActive filter lagane dena hai"
);

// ── Baqi normal kaam pehle ki tarah ──────────────────────────────────────────
assert.deepStrictEqual(
    buildFilter({ category: "abc", page: "2", limit: "10", sort: "-price" }, {}),
    { category: "abc" },
    "page/limit/sort filter nahi bante"
);

assert.deepStrictEqual(
    buildFilter({ price: { gte: "100", lte: "500" } }, {}),
    { price: { $gte: "100", $lte: "500" } },
    "bracket operators $ mein badalte hain"
);

assert.deepStrictEqual(
    buildFilter({ status: { in: "pending,processing" } }, {}),
    { status: { $in: ["pending", "processing"] } },
    "in/nin comma-separated string se array"
);

// ── NoSQL injection ──────────────────────────────────────────────────────────
assert.deepStrictEqual(buildFilter({ $where: "1==1" }, {}), {}, "$ keys drop honi chahiyen");
assert.deepStrictEqual(
    buildFilter({ name: { $ne: null } }, {}),
    {},
    "nested $ keys strip hone ke baad khali field bhi drop ho"
);

console.log("OK — baseFilter client ki query se jeetta hai, aur filters pehle ki tarah bante hain");
