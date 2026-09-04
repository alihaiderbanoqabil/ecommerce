const Stripe = require("stripe");

/**
 * Stripe client lazily banate hain, taake key na hone par server phir bhi
 * chal jaye — card payment ke ilawa poora app kaam karta rehta hai (COD wali
 * orders, browsing, sab).
 */
let stripe = null;

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const getStripe = () => {
  if (!isStripeConfigured()) return null;
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
};

module.exports = { getStripe, isStripeConfigured };
