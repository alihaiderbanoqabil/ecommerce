import { Outlet } from "react-router-dom";
import { Card, Flex, Typography } from "antd";
import { ShopOutlined } from "@ant-design/icons";

// Login page — center mein ek card, koi nav clutter nahi
export default function AuthLayout() {
  return (
    <Flex
      align="center"
      justify="center"
      vertical
      gap={24}
      style={{ minHeight: "100vh", background: "#f5f5f5", padding: 24 }}
    >
      <Flex align="center" gap={10}>
        <ShopOutlined style={{ fontSize: 28, color: "#4f46e5" }} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          ShopKart Admin
        </Typography.Title>
      </Flex>

      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Outlet />
      </Card>

      <Typography.Text type="secondary">Admin portal — staff access only</Typography.Text>
    </Flex>
  );
}
