import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { App, Avatar, Button, Dropdown, Layout, Menu, Typography } from "antd";
import {
  AppstoreOutlined,
  CommentOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useGetMeQuery, useLogoutMutation } from "../store/api/authApi";
import NotificationBell from "../components/NotificationBell";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
  { key: "/products", icon: <AppstoreOutlined />, label: <Link to="/products">Products</Link> },
  { key: "/categories", icon: <TagsOutlined />, label: <Link to="/categories">Categories</Link> },
  { key: "/orders", icon: <ShoppingCartOutlined />, label: <Link to="/orders">Orders</Link> },
  { key: "/users", icon: <UserOutlined />, label: <Link to="/users">Users</Link> },
  { key: "/comments", icon: <CommentOutlined />, label: <Link to="/comments">Comments</Link> },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { data: user } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  // "/products/anything" par bhi Products highlighted rahe — sirf pehla segment dekhte hain
  const selectedKey = `/${location.pathname.split("/")[1] || ""}`;

  const handleLogout = async () => {
    await logout();
    message.success("Logged out");
    navigate("/login", { replace: true });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" breakpoint="lg">
        <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <ShopOutlined style={{ color: "#fff", fontSize: 22 }} />
          {!collapsed && (
            <Typography.Text strong style={{ color: "#fff" }}>
              ShopKart Admin
            </Typography.Text>
          )}
        </div>

        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            paddingInline: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography.Text type="secondary">Store administration</Typography.Text>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <NotificationBell />

            <Dropdown
            menu={{
              items: [
                { key: "email", label: user?.email, disabled: true },
                { type: "divider" },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  danger: true,
                  label: loggingOut ? "Logging out..." : "Logout",
                  onClick: handleLogout,
                },
              ],
            }}
          >
              <Button type="text" style={{ height: 44 }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
                {user?.name || "Admin"}
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
