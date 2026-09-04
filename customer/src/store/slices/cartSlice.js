import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "shopkart_cart";

// Cart server par nahi rakha (backend mein cart model nahi hai) — localStorage
// mein rehta hai, taake refresh par bhi bacha rahe. Order banate waqt sirf
// product id + quantity server ko jate hain; price wahan se aata hai.
const loadCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt JSON (manually chheda gaya) app ko crash na kare
    return [];
  }
};

const persist = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: loadCart() },
  reducers: {
    addToCart: (state, action) => {
      const { _id, name, price, images, stock } = action.payload;
      const quantity = action.payload.quantity || 1;
      const existing = state.items.find((item) => item._id === _id);

      if (existing) {
        // Stock se aage na barhe — server bhi rok deta hai, magar user ko
        // pehle hi bata dena behtar hai
        existing.quantity = Math.min(existing.quantity + quantity, stock);
      } else {
        state.items.push({ _id, name, price, image: images?.[0] || null, stock, quantity: Math.min(quantity, stock) });
      }

      persist(state.items);
    },

    updateQuantity: (state, action) => {
      const { _id, quantity } = action.payload;
      const item = state.items.find((entry) => entry._id === _id);
      if (!item) return;

      item.quantity = Math.max(1, Math.min(quantity, item.stock));
      persist(state.items);
    },

    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => item._id !== action.payload);
      persist(state.items);
    },

    clearCart: (state) => {
      state.items = [];
      persist(state.items);
    },
  },
});

export const { addToCart, updateQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// Selectors — components inhe use karte hain, state ki shape par depend nahi karte
export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
