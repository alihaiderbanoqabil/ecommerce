import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

/**
 * Ye browser ke `focus` / `online` events ko RTK Query actions mein badalta hai.
 * Iske bagair baseApi ka `refetchOnReconnect: true` aur pages par diya gaya
 * `refetchOnFocus: true` dono khamosh reh jate hain — koi error nahi aata,
 * bas kuch hota hi nahi.
 */
setupListeners(store.dispatch);
