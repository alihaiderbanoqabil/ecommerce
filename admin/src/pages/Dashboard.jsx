import { Link } from "react-router-dom";
import { Alert, Card, Col, Flex, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  CommentOutlined,
  DollarOutlined,
  HourglassOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetOverviewQuery } from "../store/api/statsApi";
import { getApiError } from "../store/api/baseApi";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  shortId,
} from "../utils/format";

const statCardProps = { size: "small" };

export default function Dashboard() {
  // Cache ab 5 minute rehta hai (baseApi), jo navigation ke liye theek hai —
  // magar dashboard wo screen hai jo admin khol kar chhor deta hai. Tab wapis
  // aane par numbers dobara mangwa lete hain, warna aadhe ghante purana
  // revenue dikhta rehta. Socket bhi Stats invalidate karta hai, magar wo sirf
  // tab kaam karta hai jab connection zinda ho — ye uska safety net hai.
  const { data, isLoading, error } = useGetOverviewQuery(undefined, { refetchOnFocus: true });

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 320 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (error) {
    return <Alert type="error" showIcon message="Could not load dashboard" description={getApiError(error)} />;
  }

  const totals = data?.totals || {};
  const ordersByStatus = data?.ordersByStatus || {};

  // Recharts ko chhoti keys pasand hain; date ko bhi readable bana dete hain
  const chartData = (data?.salesByDay || []).map((row) => ({
    ...row,
    label: formatDate(row.date),
  }));

  const topProductColumns = [
    { title: "Product", dataIndex: "name", key: "name", ellipsis: true },
    { title: "Units sold", dataIndex: "unitsSold", key: "unitsSold", width: 110, align: "right" },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      width: 130,
      align: "right",
      render: (value) => formatCurrency(value),
    },
  ];

  const lowStockColumns = [
    { title: "Product", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      width: 100,
      align: "right",
      render: (stock) => <Tag color={stock === 0 ? "red" : "orange"}>{stock} left</Tag>,
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 120,
      align: "right",
      render: (value) => formatCurrency(value),
    },
  ];

  const recentOrderColumns = [
    {
      title: "Order",
      dataIndex: "_id",
      key: "_id",
      render: (id) => <Link to={`/orders?order=${id}`}>{shortId(id)}</Link>,
    },
    {
      title: "Customer",
      dataIndex: ["user", "name"],
      key: "customer",
      render: (name, record) => name || record.user?.email || "(deleted user)",
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={ORDER_STATUS_COLORS[status]}>{status}</Tag>,
    },
    {
      title: "Payment",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (status) => <Tag color={PAYMENT_STATUS_COLORS[status]}>{status}</Tag>,
    },
    {
      title: "Placed",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatDateTime(value),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Dashboard
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card {...statCardProps}>
            <Statistic
              title="Revenue (paid)"
              value={formatCurrency(totals.revenue)}
              prefix={<DollarOutlined />}
            />
            <Typography.Text type="secondary">{totals.paidOrders || 0} paid orders</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card {...statCardProps}>
            <Statistic
              title="Pending revenue"
              value={formatCurrency(totals.pendingRevenue)}
              prefix={<HourglassOutlined />}
            />
            <Typography.Text type="secondary">Awaiting payment</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card {...statCardProps}>
            <Statistic title="Orders" value={totals.orders || 0} prefix={<ShoppingCartOutlined />} />
            <Typography.Text type="secondary">All time</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card {...statCardProps}>
            <Statistic title="Products" value={totals.products || 0} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card {...statCardProps}>
            <Statistic title="Users" value={totals.users || 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card {...statCardProps}>
            <Statistic title="Comments" value={totals.comments || 0} prefix={<CommentOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Orders by status">
        <Flex gap={8} wrap>
          {Object.entries(ordersByStatus).map(([status, count]) => (
            <Tag key={status} color={ORDER_STATUS_COLORS[status]} style={{ fontSize: 14, padding: "4px 10px" }}>
              {status}: {count}
            </Tag>
          ))}
        </Flex>
      </Card>

      <Card size="small" title="Revenue — last 7 days">
        {chartData.length === 0 ? (
          <Typography.Text type="secondary">No sales in the last 7 days.</Typography.Text>
        ) : (
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <ChartTooltip
                  formatter={(value, name) => [name === "revenue" ? formatCurrency(value) : value, name]}
                />
                <Bar dataKey="revenue" name="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Top selling products">
            <Table
              rowKey={(record) => record._id || record.name}
              size="small"
              pagination={false}
              columns={topProductColumns}
              dataSource={data?.topProducts || []}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Low stock (5 or fewer)">
            <Table
              rowKey="_id"
              size="small"
              pagination={false}
              columns={lowStockColumns}
              dataSource={data?.lowStockProducts || []}
              locale={{ emptyText: "Nothing running low" }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Recent orders">
        <Table
          rowKey="_id"
          size="small"
          pagination={false}
          scroll={{ x: 720 }}
          columns={recentOrderColumns}
          dataSource={data?.recentOrders || []}
        />
      </Card>
    </Flex>
  );
}
