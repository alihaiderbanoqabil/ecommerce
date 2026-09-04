import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useDeleteProductMutation, useGetProductsQuery } from "../store/api/productApi";
import { CATEGORY_DROPDOWN_PARAMS, useGetCategoriesQuery } from "../store/api/categoryApi";
import { getApiError } from "../store/api/baseApi";
import { formatCurrency, LOW_STOCK_THRESHOLD } from "../utils/format";
import useDebouncedValue from "../utils/useDebouncedValue";
import ProductFormDrawer from "../components/ProductFormDrawer";

const DEFAULT_SORT = "-createdAt";

export default function Products() {
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState();
  const [priceRange, setPriceRange] = useState({ min: null, max: null });
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const search = useDebouncedValue(searchText, 450);

  // Filter badalne par page 1 par wapis — warna page 7 par khali table milta hai
  useEffect(() => {
    setPage(1);
  }, [search, category, priceRange]);

  const params = useMemo(() => {
    const next = { page, limit, sort };
    if (search.trim()) next.search = search.trim();
    if (category) next.category = category;
    if (priceRange.min != null) next["price[gte]"] = priceRange.min;
    if (priceRange.max != null) next["price[lte]"] = priceRange.max;
    return next;
  }, [page, limit, sort, search, category, priceRange]);

  const { data, isFetching, error, refetch } = useGetProductsQuery(params);
  // Category filter aur drawer ka select — dono ko poori list chahiye, sirf
  // pehla page nahi
  const { data: categoryData } = useGetCategoriesQuery(CATEGORY_DROPDOWN_PARAMS);
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();

  const categories = categoryData?.data || [];

  const handleDelete = async (record) => {
    try {
      const result = await deleteProduct(record._id).unwrap();
      message.success(
        result.deletedComments
          ? `Product deleted (${result.deletedComments} comments removed too)`
          : "Product deleted"
      );
    } catch (err) {
      message.error(getApiError(err, "Could not delete the product"));
    }
  };

  // Table ke header arrows sirf tab dikhte hain jab sortOrder wapis diya jaye
  const sortField = sort.replace("-", "");
  const sortDirection = sort.startsWith("-") ? "descend" : "ascend";
  const sortable = (field) => ({
    sorter: true,
    sortOrder: sortField === field ? sortDirection : null,
  });

  const columns = [
    {
      title: "",
      dataIndex: "images",
      key: "image",
      width: 64,
      render: (images, record) =>
        images?.[0] ? (
          <img
            src={images[0]}
            alt={record.name}
            style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              background: "#fafafa",
              border: "1px dashed #d9d9d9",
            }}
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
          {record.sku && <Typography.Text type="secondary">SKU: {record.sku}</Typography.Text>}
        </Flex>
      ),
    },
    {
      title: "Category",
      dataIndex: ["category", "name"],
      key: "category",
      width: 160,
      render: (name) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 130,
      align: "right",
      ...sortable("price"),
      render: (value) => formatCurrency(value),
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      width: 100,
      align: "center",
      ...sortable("stock"),
      render: (stock) => (
        <Tag color={stock <= LOW_STOCK_THRESHOLD ? "red" : "default"}>{stock}</Tag>
      ),
    },
    {
      title: "Rating",
      dataIndex: "averageRating",
      key: "averageRating",
      width: 120,
      align: "center",
      ...sortable("averageRating"),
      render: (rating, record) =>
        record.numReviews ? (
          <span>
            ★ {Number(rating).toFixed(1)}{" "}
            <Typography.Text type="secondary">({record.numReviews})</Typography.Text>
          </span>
        ) : (
          <Typography.Text type="secondary">no reviews</Typography.Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      align: "center",
      render: (isActive) => <Tag color={isActive ? "green" : "default"}>{isActive ? "active" : "inactive"}</Tag>,
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
              setDrawerOpen(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this product?"
            description="Its comments and reviews are deleted as well."
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

    if (sorter?.order) {
      setSort(`${sorter.order === "descend" ? "-" : ""}${sorter.field}`);
    } else {
      setSort(DEFAULT_SORT);
    }
  };

  return (
    <Flex vertical gap={16}>
      <Flex align="center" justify="space-between" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Products
        </Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={isFetching}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            Add product
          </Button>
        </Space>
      </Flex>

      <Alert
        type="info"
        showIcon
        message="GET /products only returns active products, so anything you deactivate disappears from this table."
      />

      <Card size="small">
        <Flex gap={12} wrap align="flex-end">
          <Input
            allowClear
            style={{ width: 260 }}
            prefix={<SearchOutlined />}
            placeholder="Search name or description"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={(event) => setSearchText(event.target.value)}
          />

          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 240 }}
            placeholder="All categories"
            value={category}
            onChange={setCategory}
            options={categories.map((item) => ({
              value: item._id,
              label: item.parentCategory?.name ? `${item.parentCategory.name} › ${item.name}` : item.name,
            }))}
          />

          <Space.Compact>
            <InputNumber
              min={0}
              placeholder="Min price"
              value={priceRange.min}
              onChange={(value) => setPriceRange((prev) => ({ ...prev, min: value }))}
            />
            <InputNumber
              min={0}
              placeholder="Max price"
              value={priceRange.max}
              onChange={(value) => setPriceRange((prev) => ({ ...prev, max: value }))}
            />
          </Space.Compact>

          <Button
            onClick={() => {
              setSearchText("");
              setCategory(undefined);
              setPriceRange({ min: null, max: null });
              setSort(DEFAULT_SORT);
            }}
          >
            Clear filters
          </Button>
        </Flex>
      </Card>

      {error && <Alert type="error" showIcon message={getApiError(error, "Could not load products")} />}

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isFetching}
        onChange={handleTableChange}
        scroll={{ x: 1100 }}
        pagination={{
          current: data?.pagination?.page || page,
          pageSize: data?.pagination?.limit || limit,
          total: data?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
        }}
      />

      <ProductFormDrawer
        open={drawerOpen}
        product={editing}
        categories={categories}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
      />
    </Flex>
  );
}
