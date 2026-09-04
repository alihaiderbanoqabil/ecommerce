import { Navigate, Outlet } from "react-router-dom";
import { Flex, Spin } from "antd";
import { useGetMeQuery } from "../store/api/authApi";

/**
 * Login page ka guard.
 *
 * Sirf ADMIN ko dashboard bhejte hain, har logged-in user ko nahi: jab customer
 * yahan login karta hai to Login.jsx usay wapis logout kar raha hota hai, aur
 * beech mein redirect ho jane se wo 403 screen par phans jata tha.
 */
export default function GuestOnly() {
  const { data, error, isLoading } = useGetMeQuery();

  // 401 ke sath RTK Query purana data cache mein rehne deta hai
  const user = error ? undefined : data;

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (user?.role === "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
