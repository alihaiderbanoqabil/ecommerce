import { baseApi } from "./baseApi";

/**
 * Har wo jagah jahan categories ka DROPDOWN bharna hai (products ka category
 * filter, product drawer ka category select, category modal ka parent select)
 * bilkul yehi object bheje — do faide:
 *
 * 1. `pagination: false` se poori list aati hai. Pehle yahan `limit: 100` tha,
 *    aur 100 backend ka hard `maxLimit` bhi hai — yaani 100 se zyada categories
 *    wale store mein baqi categories dropdown se KHAMOSHI se ghayab ho jatin.
 *    Na error, na koi ishara. `pagination=false` par backend wohi response
 *    shape deta hai (data + pagination), bas `paginated: false` ke sath.
 *
 * 2. Ek hi shared object = ek hi RTK Query cache key. Teeno dropdowns ek dusre
 *    ka cache istemal karte hain, is liye poore admin session mein ye list
 *    sirf ek dafa download hoti hai. (Alag-alag jagah haath se `{ pagination:
 *    false, sort: "name" }` likhna bhi chalta, magar ek typo teen requests
 *    bana deta — is liye constant.)
 *
 * Categories TABLE isay istemal nahi karti — usay page/limit/search chahiye,
 * to wo apne params khud bhejti hai.
 */
export const CATEGORY_DROPDOWN_PARAMS = { pagination: false, sort: "name" };

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // flat: true zaroori hai — bina iske backend nested tree deta hai jismein
    // pagination ka koi matlab nahi hota (aadhi tree se rishtay toot jate hain).
    getCategories: builder.query({
      query: (params = {}) => ({ url: "/categories", params: { flat: true, ...params } }),
      providesTags: [{ type: "Category", id: "LIST" }],
      /**
       * Categories baqi sab se kam badalti hain, aur yehi list teeno dropdowns
       * bharti hai (dekhein CATEGORY_DROPDOWN_PARAMS upar). 15 minute rakhne se
       * ye list poore admin session mein bas ek dafa download hoti hai.
       * Create/update/delete category ab bhi Category:LIST invalidate karti
       * hain, aur RTK Query aisi entry ko cache se nikaal deta hai — is liye
       * lambi cache ke bawajood nayi category foran dropdown mein aa jati hai.
       */
      keepUnusedDataFor: 900,
    }),

    /**
     * body do shakal mein aa sakta hai:
     *   FormData  -> jab naya image upload ho raha ho (multipart)
     *   plain obj -> jab sirf text fields badle hain (JSON)
     * fetchBaseQuery dono ko sahi handle karta hai; multer JSON requests ko
     * chhoo kar aage bhej deta hai. JSON wala raasta is liye chahiye ke
     * parentCategory ko null karna sirf real null se hota hai — multipart mein
     * sab kuch string hota hai aur khali string par mongoose CastError deta hai.
     */
    createCategory: builder.mutation({
      query: (body) => ({ url: "/categories", method: "POST", body }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    updateCategory: builder.mutation({
      query: ({ id, body }) => ({ url: `/categories/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Category", id: "LIST" }, { type: "Product", id: "LIST" }],
    }),

    deleteCategory: builder.mutation({
      query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Category", id: "LIST" }, { type: "Product", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
