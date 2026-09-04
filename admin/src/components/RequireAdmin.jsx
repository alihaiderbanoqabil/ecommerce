import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button, Flex, Result, Spin, Typography } from "antd";
import { useGetMeQuery, useLogoutMutation } from "../store/api/authApi";

/**
 * Admin-only gate.
 *
 * Cookie httpOnly hai, is liye client khud faisla nahi kar sakta — /auth/me se
 * puchhna parta hai. Jab tak jawab na aaye Spin dikhate hain.
 *
 * Non-admin ko redirect NAHI karte: /login par bhejte to GuestOnly usay wapis
 * yahan bhej deta aur infinite loop ban jata. Is liye 403 + logout button.
 */
export default function RequireAdmin() {
  const location = useLocation();
  const { data, error, isLoading } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  // Logout ke baad /auth/me 401 deta hai, magar RTK Query purana data cache
  // mein rakhta hai — error hone par usay ignore karna zaroori hai warna
  // logged out admin ko bhi purana session dikhta rehta hai.
  const user = error ? undefined : data;

  if (isLoading) {
    return (
      <Flex align="center" justify="center" vertical gap={12} style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Spin size="large" />
        <Typography.Text type="secondary">Checking your session...</Typography.Text>
      </Flex>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (user.role !== "admin") {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Result
          status="403"
          title="403"
          subTitle={`Signed in as ${user.email} (${user.role}). This portal is for admins only.`}
          extra={
            <Button type="primary" loading={loggingOut} onClick={() => logout()}>
              Logout
            </Button>
          }
        />
      </Flex>
    );
  }

  return <Outlet />;
}
