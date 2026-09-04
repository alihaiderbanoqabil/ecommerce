import { useGetMeQuery } from "../store/api/authApi";

/**
 * "Logged in hain ya nahi" ka ek hi jawab, poore app ke liye.
 *
 * Seedha `useGetMeQuery().data` parhna dhoka de jata hai: RTK Query failed
 * refetch par purana successful `data` cache mein rehne deta hai. Yani logout
 * (ya token expire) ke baad /auth/me 401 deta hai, magar hook abhi bhi pichla
 * user wapis karta hai — aur navbar/guards logged-in dikhate rehte hain.
 * Error ka matlab hamesha "session nahi hai" hi hota hai, is liye us soorat
 * mein user ko null kar dete hain.
 */
export function useAuthUser() {
  const { data, isError, isLoading } = useGetMeQuery();

  return { user: isError ? undefined : data, isLoading };
}

export default useAuthUser;
