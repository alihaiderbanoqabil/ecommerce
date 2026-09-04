import { baseApi } from "./baseApi";

export const statsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Poora dashboard ek request mein — totals, chart, top/low stock, recent orders
    getOverview: builder.query({
      query: () => "/stats/overview",
      providesTags: ["Stats"],
    }),
  }),
});

export const { useGetOverviewQuery } = statsApi;
