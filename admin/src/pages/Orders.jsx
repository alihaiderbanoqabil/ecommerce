import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Card, Flex, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { useDeleteOrderMutation, useGetOrdersQuery, useUpdateOrderMutation } from "../store/api/orderApi";
import { getApiError } from "../store/api/baseApi";
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  shortId,
  toOptions,
} from "../utils/format";
import useDebouncedValue from "../utils/useDebouncedValue";
import OrderDetailDrawer from "../components/OrderDetailDrawer";

const DEFAULT_SORT = "-createdAt";

export default function Orders() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState();
  const [paymentStatus, setPaymentStatus] = useState();
  const [openOrderId, setOpenOrderId] = useState(null);

  // Products page wala hi tareeqa — har keystroke par request na jaye
  const search = useDebouncedValue(searchText, 450);

  // Dashboard "recent orders" se /orders?order=<id> link aata hai — wo order
  // seedha drawer mein khol dete hain.
  useEffect(() => {
    const linked = searchParams.get("order");
    if (linked) setOpenOrderId(linked);
  }, [searchParams]);

  // Filter ya search badalne par page 1 par wapis — warna page 7 par khali
  // table milta hai (search ke baad aksar 1-2 hi orders bachti hain)
  useEffect(() => {
    setPage(1);
  }, [search, status, paymentStatus]);

  const params = useMemo(() => {
    const next = { page, limit, sort };
    // Backend `search` ko baqi filters se alag handle karta hai: naam/email
    // se users dhoondta hai, phir un ki ids par orders filter karta hai. Is liye
    // status/paymentStatus ke sath mila kar bhejna bilkul theek hai.
    if (search.trim()) next.search = search.trim();
    if (status) next.status = status;
    if (paymentStatus) next.paymentStatus = paymentStatus;
    return next;
  }, [page, limit, sort, search, status, paymentStatus]);

  // Orders sab se volatile list hai — customers order karte rehte hain. Tab par
  // wapis aate hi taaza list mangwa lete hain. (Dashboard ke ilawa sirf yahan
  // refetchOnFocus lagaya hai; api-wide lagate to har tab switch par products,
  // categories, users sab dobara chal parte.)
  const { data, isFetching, error } = useGetOrdersQuery(params, { refetchOnFocus: true });
  const [updateOrder, { isLoading: updating }] = useUpdateOrderMutation();
  const [deleteOrder, { isLoading: deleting }] = useDeleteOrderMutation();

  const patch = async (id, changes, label) => {
    try {
      await updateOrder({ id, ...changes }).unwrap();
      message.success(`${label} updated`);
    } catch (err) {
      message.error(getApiError(err, `Could not update ${label.toLowerCase()}`));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteOrder(id).unwrap();
      message.success("Order deleted");
    } catch (err) {
      message.error(getApiError(err, "Could not delete the order"));
    }
  };

  const closeDrawer = () => {
    setOpenOrderId(null);
    if (searchParams.get("order")) setSearchParams({}, { replace: true });
  };

  const sortField = sort.replace("-", "");
  const sortDirection = sort.startsWith("-") ? "descend" : "ascend";
  const sortable = (field) => ({ sorter: true, sortOrder: sortField === field ? sortDirection : null });

  const columns = [
    {
      title: "Order",
      dataIndex: "_id",
      key: "_id",
      width: 100,
      render: (id) => <Typography.Text code>{shortId(id)}</Typography.Text>,
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <Flex vertical>
          <Typography.Text>{record.user?.name || "(deleted user)"}</Typography.Text>
          <Typography.Text type="secondary">{record.user?.email}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: "Items",
      key: "items",
      width: 80,
      align: "center",
      render: (_, record) => record.items?.length || 0,
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 130,
      align: "right",
      ...sortable("totalAmount"),
      render: (value) => formatCurrency(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value, record) => (
        <Select
          size="small"
          style={{ width: 140 }}
          value={value}
          disabled={updating}
          options={toOptions(ORDER_STATUSES)}
          onChange={(next) => patch(record._id, { status: next }, "Status")}
        />
      ),
    },
    {
      title: "Payment",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 160,
      render: (value, record) => (
        <Select
          size="small"
          style={{ width: 140 }}
          value={value}
          disabled={updating}
          options={toOptions(PAYMENT_STATUSES)}
          onChange={(next) => patch(record._id, { paymentStatus: next }, "Payment status")}
        />
      ),
    },
    {
      title: "Placed",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      ...sortable("createdAt"),
      render: (value) => formatDateTime(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setOpenOrderId(record._id)}>
            View
          </Button>
          <Popconfirm
            title="Delete this order?"
            description="Deleting does not restore stock — cancel it instead if you want the stock back."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    setPage(pagination.current);
    setLimit(pagination.pageSize);
    setSort(sorter?.order ? `${sorter.order === "descend" ? "-" : ""}${sorter.field}` : DEFAULT_SORT);
  };

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Orders
      </Typography.Title>

      <Card size="small">
        <Flex gap={12} wrap align="center">
          <Input
            allowClear
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
            placeholder="Search by customer name, email or order ID"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={(event) => setSearchText(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="All statuses"
            value={status}
            onChange={setStatus}
            options={toOptions(ORDER_STATUSES)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="All payment states"
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={toOptions(PAYMENT_STATUSES)}
          />
          <Button
            onClick={() => {
              setSearchText("");
              setStatus(undefined);
              setPaymentStatus(undefined);
              setSort(DEFAULT_SORT);
            }}
          >
            Clear filters
          </Button>
          <Typography.Text type="secondary">
            Search matches the customer's name or email, or an order ID — the short{" "}
            <Typography.Text code>#ABC12345</Typography.Text> shown in the table works, and so does a
            full id.
          </Typography.Text>
        </Flex>
      </Card>

      {error && <Alert type="error" showIcon message={getApiError(error, "Could not load orders")} />}

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isFetching}
        onChange={handleTableChange}
        scroll={{ x: 1150 }}
        expandable={{
          expandedRowRender: (record) => (
            <Flex gap={8} wrap>
              {(record.items || []).map((item, index) => (
                <Tag key={item._id || index}>
                  {item.product?.name || "(deleted product)"} × {item.quantity}
                </Tag>
              ))}
            </Flex>
          ),
        }}
        pagination={{
          current: data?.pagination?.page || page,
          pageSize: data?.pagination?.limit || limit,
          total: data?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
        }}
      />

      <OrderDetailDrawer open={Boolean(openOrderId)} orderId={openOrderId} onClose={closeDrawer} />
    </Flex>
  );
}
