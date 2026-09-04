import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Flex, Input, Popconfirm, Space, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import {
  CATEGORY_DROPDOWN_PARAMS,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
} from "../store/api/categoryApi";
import { getApiError } from "../store/api/baseApi";
import { formatDate } from "../utils/format";
import useDebouncedValue from "../utils/useDebouncedValue";
import CategoryFormModal from "../components/CategoryFormModal";

export default function Categories() {
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("name");
  const [searchText, setSearchText] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const search = useDebouncedValue(searchText, 450);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const params = useMemo(() => {
    const next = { page, limit, sort };
    if (search.trim()) next.search = search.trim();
    return next;
  }, [page, limit, sort, search]);

  // Table apni paging khud karti hai (page/limit/search)
  const { data, isFetching, error } = useGetCategoriesQuery(params);
  // Parent select ko poori list chahiye, sirf current page nahi — aur Products
  // page bhi bilkul yehi params bhejta hai, is liye cache dono ke beech share hota hai
  const { data: allCategories } = useGetCategoriesQuery(CATEGORY_DROPDOWN_PARAMS);
  const [deleteCategory, { isLoading: deleting }] = useDeleteCategoryMutation();

  const handleDelete = async (record) => {
    try {
      await deleteCategory(record._id).unwrap();
      message.success("Category deleted");
    } catch (err) {
      message.error(getApiError(err, "Could not delete the category"));
    }
  };

  const sortField = sort.replace("-", "");
  const sortDirection = sort.startsWith("-") ? "descend" : "ascend";
  const sortable = (field) => ({ sorter: true, sortOrder: sortField === field ? sortDirection : null });

  const columns = [
    {
      title: "",
      dataIndex: "image",
      key: "image",
      width: 64,
      render: (image, record) =>
        image ? (
          <img
            src={image}
            alt={record.name}
            style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }}
          />
        ) : (
          <div
            style={{ width: 44, height: 44, borderRadius: 6, background: "#fafafa", border: "1px dashed #d9d9d9" }}
          />
        ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ...sortable("name"),
      render: (name, record) => (
        <Flex vertical>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary">/{record.slug}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: "Parent",
      dataIndex: ["parentCategory", "name"],
      key: "parent",
      width: 180,
      render: (name) => (name ? <Tag>{name}</Tag> : <Typography.Text type="secondary">top level</Typography.Text>),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value) => value || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      ...sortable("createdAt"),
      render: (value) => formatDate(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this category?"
            description="Products pointing at it keep a dangling reference."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => handleDelete(record)}
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
    setSort(sorter?.order ? `${sorter.order === "descend" ? "-" : ""}${sorter.field}` : "name");
  };

  return (
    <Flex vertical gap={16}>
      <Flex align="center" justify="space-between" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Categories
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Add category
        </Button>
      </Flex>

      <Card size="small">
        <Input
          allowClear
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          placeholder="Search name or description"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </Card>

      {error && <Alert type="error" showIcon message={getApiError(error, "Could not load categories")} />}

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isFetching}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
        pagination={{
          current: data?.pagination?.page || page,
          pageSize: data?.pagination?.limit || limit,
          total: data?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} categories`,
        }}
      />

      <CategoryFormModal
        open={modalOpen}
        category={editing}
        categories={allCategories?.data || []}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </Flex>
  );
}
