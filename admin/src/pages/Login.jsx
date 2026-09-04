import { useLocation, useNavigate } from "react-router-dom";
import { Alert, App, Button, Form, Input, Typography } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useLoginMutation, useLogoutMutation } from "../store/api/authApi";
import { getApiError } from "../store/api/baseApi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [login, { isLoading }] = useLoginMutation();
  const [logout] = useLogoutMutation();

  // RequireAdmin ne jahan se bheja tha wahin wapis
  const from = location.state?.from?.pathname || "/";

  const onFinish = async (values) => {
    try {
      const result = await login(values).unwrap();

      /**
       * Customer ka portal alag app hai. Backend login sab ko allow karta hai,
       * is liye non-admin ko foran wapis logout kar dete hain — warna uske paas
       * ek valid cookie reh jati aur wo yahan 403 screens par phansa rehta.
       */
      if (result?.data?.role !== "admin") {
        await logout();
        message.error("This portal is for admins only");
        return;
      }

      message.success(`Welcome back, ${result.data.name}`);
      navigate(from, { replace: true });
    } catch (error) {
      message.error(getApiError(error, "Login failed"));
    }
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Admin sign in
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Use your admin account to manage products, orders and users.
      </Typography.Paragraph>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Email is required" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="admin@example.com" autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Password is required" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={isLoading}>
            Sign in
          </Button>
        </Form.Item>
      </Form>

      <Alert
        style={{ marginTop: 20 }}
        type="info"
        showIcon
        message="Customers should use the storefront app — this portal only accepts admin accounts."
      />
    </>
  );
}
