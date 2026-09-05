// Dono jagah (Express CORS aur Socket.IO CORS) ko same list chahiye — yahan
// ek hi jagah rakhte hain taake production origin add karte waqt ek jagah
// bhool na jaye. CORS_ORIGINS na ho to local dev ports par gir jata hai.
const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,https://ecommerce-afom.onrender.com,https://ecommerce-4sh7.onrender.com"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

module.exports = allowedOrigins;
