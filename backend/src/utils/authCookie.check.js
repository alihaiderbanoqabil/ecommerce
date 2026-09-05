/**
 * Session isolation ka check — admin aur customer ek hi browser (yaani ek hi
 * cookie jar) mein sath sath logged in reh sakte hain ya nahi.
 *
 * Ye woh bug tha jo authCookie.js ne theek kiya: dono ki cookie ka naam "token"
 * hone ki wajah se jo portal baad mein login karta wo doosre ka session
 * overwrite kar deta tha. Neeche wala jar jaan boojh kar SHARED hai — asli
 * browser bhi yehi karta hai (cookies port ko nahi dekhtin).
 *
 * Chalane ka tareeqa (backend chal raha ho, seed data mojood ho):
 *   npm run check:sessions -w backend
 */
const assert = require("assert");

const API = process.env.CHECK_API_URL || "http://localhost:5000/api";
const ADMIN = { email: "admin@example.com", password: "Admin@123" };
const CUSTOMER = {
    email: process.env.CHECK_CUSTOMER_EMAIL || "armand_sipes67@yahoo.com",
    password: "Password@123",
};

// Ek hi jar dono portals ke liye — bilkul browser ki tarah
const jar = new Map();

const rememberCookies = (response) => {
    for (const line of response.headers.getSetCookie()) {
        const [pair] = line.split(";");
        const index = pair.indexOf("=");
        jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
};

// portal "admin" ho to wohi header bhejte hain jo admin app bhejta hai
const call = async (path, { portal, method = "GET", body } = {}) => {
    const headers = { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    if (portal === "admin") headers["X-Portal"] = "admin";
    if (body) headers["Content-Type"] = "application/json";

    const response = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    rememberCookies(response);
    return { status: response.status, data: await response.json().catch(() => null) };
};

(async () => {
    // Tarteeb ahem hai: admin PEHLE login karta hai, customer BAAD mein. Purane
    // code mein doosra login pehle wale ko yahin uraa deta tha.
    const adminLogin = await call("/auth/login", { portal: "admin", method: "POST", body: ADMIN });
    assert.strictEqual(adminLogin.status, 200, `admin login failed: ${JSON.stringify(adminLogin.data)}`);

    const customerLogin = await call("/auth/login", { method: "POST", body: CUSTOMER });
    assert.strictEqual(customerLogin.status, 200, `customer login failed: ${JSON.stringify(customerLogin.data)}`);

    // Asal daawa: ek hi jar, magar do alag sessions
    const asAdmin = await call("/auth/me", { portal: "admin" });
    const asCustomer = await call("/auth/me");

    assert.strictEqual(asAdmin.data?.role, "admin", "admin portal ko admin session milni chahiye");
    assert.strictEqual(asAdmin.data?.email, ADMIN.email);
    assert.strictEqual(asCustomer.data?.role, "customer", "customer portal ko customer session milni chahiye");
    assert.strictEqual(asCustomer.data?.email, CUSTOMER.email);

    // Notifications isi session par chalti hain — admin ko sirf "admins" wali
    // broadcast milni chahiye, customer ko sirf apni/"all" wali.
    const adminInbox = await call("/notifications", { portal: "admin" });
    const customerInbox = await call("/notifications");

    assert.strictEqual(adminInbox.status, 200, "admin notifications 200 honi chahiyen");
    assert.strictEqual(customerInbox.status, 200, "customer notifications 200 honi chahiyen");
    assert.notDeepStrictEqual(
        adminInbox.data.data.map((n) => n._id),
        customerInbox.data.data.map((n) => n._id),
        "dono portals ko ek hi list mili — session phir se leak ho rahi hai"
    );

    // Admin logout sirf apni cookie hataye, customer ki nahi
    await call("/auth/logout", { portal: "admin", method: "POST" });
    assert.strictEqual((await call("/auth/me", { portal: "admin" })).status, 401, "admin logout hona chahiye tha");
    assert.strictEqual((await call("/auth/me")).data?.role, "customer", "admin ke logout se customer nahi girna chahiye");

    console.log("OK — admin aur customer sessions ek hi cookie jar mein alag rehti hain");
})().catch((error) => {
    console.error("FAILED —", error.message);
    process.exit(1);
});
