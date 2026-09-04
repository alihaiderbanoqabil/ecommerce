import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import Spinner from "./Spinner";

/**
 * Protected routes ka wrapper.
 *
 * Cookie httpOnly hai, is liye client se "logged in hain?" ka faisla nahi ho
 * sakta — /auth/me se puchna parta hai. Jab tak jawab na aaye loader dikhate
 * hain, warna logged-in user ko ek jhatke ke liye login page dikh jata.
 *
 * `state.from` mein current location bhejte hain, taake login ke baad user
 * wahin wapis pohanche jahan jana chahta tha.
 */
export default function RequireAuth() {
  const location = useLocation();
  const { user, isLoading } = useAuthUser();

  if (isLoading) return <Spinner label="Checking your session..." />;

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
