import {
  Alert,
  App,
  Descriptions,
  Drawer,
  Flex,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useGetOrderByIdQuery, useUpdateOrderMutation } from "../store/api/orderApi";
import { getApiError } from "../store/api/baseApi";
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUSES,
  shortId,
  toOptions,
} from "../utils/format";

export default function OrderDetailDrawer({ open, orderId, onClose }) {
  const { message } = App.useApp();
  const { data: order, isFetching, error } = useGetOrderByIdQuery(orderId, { skip: !orderId });
  const [updateOrder, { isLoading: saving }] = useUpdateOrderMutation();

  const patch = async (changes, label) => {
    try {
      await updateOrder({ id: orderId, ...changes }).unwrap();
      message.success(`${label} updated`);
    } catch (err) {
      message.error(getApiError(err, `Could not update ${label.toLowerCase()}`));
    }
  };

  const itemColumns = [
    {
      title: "Product",
      dataIndex: ["product", "name"],
      key: "product",
      render: (name) => name || <Typography.Text type="secondary">(deleted product)</Typography.Text>,
    },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 60, align: "center" },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 110,
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Line total",
      key: "lineTotal",
      width: 120,
      align: "right",
      render: (_, record) => formatCurrency(record.price * record.quantity),
    },
  ];

  const address = order?.shippingAddress || {};

  return (
    <Drawer
      title={order ? `Order ${shortId(order._id)}` : "Order"}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isFetching && !order ? (
        <Flex align="center" justify="center" style={{ minHeight: 200 }}>
          <Spin />
        </Flex>
      ) : error ? (
        <Alert type="error" showIcon message={getApiError(error, "Could not load this order")} />
      ) : order ? (
        <Flex vertical gap={20}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Customer">
              {order.user?.name || "(deleted user)"}
              {order.user?.email && (
                <>
                  <br />
                  <Typography.Text type="secondary">{order.user.email}</Typography.Text>
                </>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Placed">{formatDateTime(order.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Total">
              <Typography.Text strong>{formatCurrency(order.totalAmount)}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Shipping address">
              {address.street ? (
                <>
                  {address.street}
                  <br />
                  {[address.city, address.state, address.zip].filter(Boolean).join(", ")}
                  <br />
                  {address.country}
                </>
              ) : (
                <Typography.Text type="secondary">No address saved</Typography.Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Flex gap={12} wrap>
            <Flex vertical gap={4} style={{ minWidth: 170 }}>
              <Typography.Text type="secondary">Order status</Typography.Text>
              <Select
                value={order.status}
                loading={saving}
                options={toOptions(ORDER_STATUSES)}
                onChange={(value) => patch({ status: value }, "Status")}
              />
            </Flex>
            <Flex vertical gap={4} style={{ minWidth: 170 }}>
              <Typography.Text type="secondary">Payment status</Typography.Text>
              <Select
                value={order.paymentStatus}
                loading={saving}
                options={toOptions(PAYMENT_STATUSES)}
                onChange={(value) => patch({ paymentStatus: value }, "Payment status")}
              />
            </Flex>
            <Flex vertical gap={4} style={{ minWidth: 170 }}>
              <Typography.Text type="secondary">Payment method</Typography.Text>
              <Select
                value={order.paymentMethod}
                loading={saving}
                options={toOptions(PAYMENT_METHODS)}
                onChange={(value) => patch({ paymentMethod: value }, "Payment method")}
              />
            </Flex>
          </Flex>

          <Flex gap={8}>
            <Tag color={ORDER_STATUS_COLORS[order.status]}>{order.status}</Tag>
            <Tag color={PAYMENT_STATUS_COLORS[order.paymentStatus]}>{order.paymentStatus}</Tag>
          </Flex>

          <Alert
            type="info"
            showIcon
            message="Cancelling an order puts its stock back on the shelf (the server does that)."
          />

          <Table
            rowKey={(record) => record._id || record.product?._id}
            size="small"
            pagination={false}
            columns={itemColumns}
            dataSource={order.items || []}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
