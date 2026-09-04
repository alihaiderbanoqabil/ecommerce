import { Link } from "react-router-dom";
import { Badge, Button, Dropdown, Empty, List, Tooltip, Typography } from "antd";
import {
  BellOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CheckOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../store/api/notificationApi";
import { useGetMeQuery } from "../store/api/authApi";

const ICONS = {
  "order:new": <ShoppingCartOutlined style={{ color: "#4f46e5" }} />,
  "order:payment": <DollarOutlined style={{ color: "#16a34a" }} />,
};

const timeAgo = (iso) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationBell() {
  const { data: user, isError } = useGetMeQuery();
  const isAdmin = Boolean(user) && !isError && user.role === "admin";

  // Login screen par bell ka koi matlab nahi — query hi skip kar dete hain
  const { data } = useGetNotificationsQuery(undefined, { skip: !isAdmin });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const items = data?.data || [];
  const unread = data?.unread || 0;

  const panel = (
    <div
      style={{
        width: 360,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Typography.Text strong>
          Notifications
          {unread ? (
            <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
              {" "}
              ({unread} new)
            </Typography.Text>
          ) : null}
        </Typography.Text>
        {unread ? (
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => markAllRead()}>
            Mark all as read
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="New orders and payments appear here"
          style={{ padding: "24px 16px" }}
        />
      ) : (
        <List
          size="small"
          style={{ maxHeight: 340, overflowY: "auto" }}
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              // Unread ko halka background — read se farq saaf rahe
              style={{ padding: "10px 16px", background: item.read ? undefined : "#f5f3ff" }}
              actions={
                item.read
                  ? undefined
                  : [
                      <Tooltip title="Mark as read" key="read">
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckOutlined />}
                          aria-label="Mark as read"
                          onClick={() => markRead(item._id)}
                        />
                      </Tooltip>,
                    ]
              }
            >
              <List.Item.Meta
                avatar={ICONS[item.type] || <BellOutlined />}
                title={
                  <Link
                    to={item.link || "#"}
                    // Kholna hi "dekh li" hai
                    onClick={() => !item.read && markRead(item._id)}
                    style={{ fontSize: 13, fontWeight: item.read ? 400 : 600 }}
                  >
                    {item.title}
                  </Link>
                }
                description={
                  <span style={{ fontSize: 12 }}>
                    {item.body} · <span style={{ color: "#9ca3af" }}>{timeAgo(item.createdAt)}</span>
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown popupRender={() => panel} trigger={["click"]} placement="bottomRight">
      <Badge count={unread} size="small" offset={[-4, 4]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ height: 44 }}
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        />
      </Badge>
    </Dropdown>
  );
}
