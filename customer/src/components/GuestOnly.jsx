import { Navigate, Outlet } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import Spinner from "./Spinner";

// Login/Register jaise pages — pehle se logged-in user ko yahan aane ka
// koi faida nahi, home bhej dete hain.
export default function GuestOnly() {
  const { user, isLoading } = useAuthUser();

  if (isLoading) return <Spinner label="Loading..." />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
