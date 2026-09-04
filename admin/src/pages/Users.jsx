import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Input,
  Popconfirm,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import { useDeleteUserMutation, useGetUsersQuery, useUpdateUserMutation } from "../store/api/userApi";
import { useGetMeQuery } from "../store/api/authApi";
import { getApiError } from "../store/api/baseApi";
import { formatDate } from "../utils/format";
import useDebouncedValue from "../utils/useDebouncedValue";

const ROLE_OPTIONS = [
  { value: "customer", label: "customer" },
  { value: "admin", label: "admin" },
];

const SELF_GUARD = "You cannot change or delete your own admin account from here.";

export default function Users() {
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("-createdAt");
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState();

  const search = useDebouncedValue(searchText, 450);

  useEffect(() => {
    setPage(1);
  }, [search, role]);

  const params = useMemo(() => {
    const next = { page, limit, sort };
    if (search.trim()) next.search = search.trim();
    if (role) next.role = role;
    return next;
  }, [page, limit, sort, search, role]);

  const { data, isFetching, error } = useGetUsersQuery(params);
  const { data: me } = useGetMeQuery();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const changeRole = async (id, nextRole) => {
    try {
      await updateUser({ id, role: nextRole }).unwrap();
      message.success(`Role changed to ${nextRole}`);
    } catch (err) {
      message.error(getApiError(err, "Could not change the role"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id).unwrap();
      message.success("User deleted");
    } catch (err) {
      message.error(getApiError(err, "Could not delete the user"));
    }
  };

  const sortField = sort.replace("-", "");
  const sortDirection = sort.startsWith("-") ? "descend" : "ascend";
  const sortable = (field) => ({ sorter: true, sortOrder: sortField === field ? sortDirection : null });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ...sortable("name"),
      render: (name, record) => (
        <Flex vertical>
          <Typography.Text strong>{name}</Typography.Text>
          {record._id === me?._id && <Typography.Text type="secondary">that's you</Typography.Text>}
        </Flex>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email", ...sortable("email") },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 190,
      render: (value, record) => {
        // Apna hi role customer karna = khud ko admin panel se bahar kar dena
        const isSelf = record._id === me?._id;

        return (
          <Flex align="center" gap={8}>
            <Tag color={value === "admin" ? "purple" : "blue"}>{value}</Tag>
            <Tooltip title={isSelf ? SELF_GUARD : ""}>
              <Select
                size="small"
                style={{ width: 110 }}
                value={value}
                disabled={isSelf || updating}
                options={ROLE_OPTIONS}
                onChange={(next) => changeRole(record._id, next)}
              />
            </Tooltip>
          </Flex>
        );
      },
    },
    {
      title: "Verified",
      dataIndex: "isEmailVerified",
      key: "isEmailVerified",
      width: 110,
      align: "center",
      render: (verified) => <Tag color={verified ? "green" : "orange"}>{verified ? "yes" : "no"}</Tag>,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (value) => value || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      ...sortable("createdAt"),
      render: (value) => formatDate(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => {
        const isSelf = record._id === me?._id;

        if (isSelf) {
          // Disabled button khud mouse events fire nahi karta, is liye tooltip
          // ko ek span par lagate hain warna wajah kabhi nazar nahi aati
          return (
            <Tooltip title={SELF_GUARD}>
              <span style={{ display: "inline-block" }}>
                <Button size="small" danger disabled icon={<DeleteOutlined />} />
              </span>
            </Tooltip>
          );
        }

        return (
          <Popconfirm
            title="Delete this user?"
            description="Their orders and comments stay in the database."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        );
      },
    },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    setPage(pagination.current);
    setLimit(pagination.pageSize);
    setSort(sorter?.order ? `${sorter.order === "descend" ? "-" : ""}${sorter.field}` : "-createdAt");
  };

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Users
      </Typography.Title>

      <Card size="small">
        <Flex gap={12} wrap>
          <Input
            allowClear
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
            placeholder="Search name or email"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder="All roles"
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS}
          />
        </Flex>
      </Card>

      {error && <Alert type="error" showIcon message={getApiError(error, "Could not load users")} />}

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isFetching}
        onChange={handleTableChange}
        scroll={{ x: 1050 }}
        pagination={{
          current: data?.pagination?.page || page,
          pageSize: data?.pagination?.limit || limit,
          total: data?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
        }}
      />
    </Flex>
  );
}
