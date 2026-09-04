import { baseApi } from "./baseApi";

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Default (bina params) nested tree deta hai: har category ke andar
    // subCategories array. Navigation menu isi se banta hai.
    getCategoryTree: builder.query({
      query: () => "/categories",
      providesTags: ["Category"],
    }),
  }),
});

export const { useGetCategoryTreeQuery } = categoryApi;
