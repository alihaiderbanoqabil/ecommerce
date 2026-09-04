import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi";
import cartReducer from "./slices/cartSlice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

/**
 * Browser ke `focus` / `online` events ko RTK Query actions mein badalta hai.
 * Iske bagair baseApi ka `refetchOnReconnect: true` khamosh reh jata hai —
 * koi error nahi aata, bas net wapis aane par kuch refetch hi nahi hota.
 */
setupListeners(store.dispatch);
