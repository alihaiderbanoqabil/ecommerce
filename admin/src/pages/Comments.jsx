import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Input,
  Popconfirm,
  Rate,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import {
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useUpdateCommentMutation,
} from "../store/api/commentApi";
import { getApiError } from "../store/api/baseApi";
import { formatDateTime } from "../utils/format";
import useDebouncedValue from "../utils/useDebouncedValue";

const VISIBILITY_OPTIONS = [
  { value: "true", label: "Visible only" },
  { value: "false", label: "Hidden only" },
];

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((value) => ({ value, label: `${value} star${value > 1 ? "s" : ""}` }));

export default function Comments() {
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("-createdAt");
  const [searchText, setSearchText] = useState("");
  const [rating, setRating] = useState();
  const [visibility, setVisibility] = useState();

  const search = useDebouncedValue(searchText, 450);

  useEffect(() => {
    setPage(1);
  }, [search, rating, visibility]);

  const params = useMemo(() => {
    const next = { page, limit, sort };
    if (search.trim()) next.search = search.trim();
    if (rating) next.rating = rating;
    // isActive=false sirf admin cookie ke sath chalta hai — public request par
    // backend is param ko chup chaap gira deta hai.
    if (visibility) next.isActive = visibility;
    return next;
  }, [page, limit, sort, search, rating, visibility]);

  const { data, isFetching, error } = useGetCommentsQuery(params);
  const [updateComment, { isLoading: updating }] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: deleting }] = useDeleteCommentMutation();

  const toggleVisibility = async (record) => {
    try {
      await updateComment({ id: record._id, isActive: !record.isActive }).unwrap();
      message.success(record.isActive ? "Comment hidden" : "Comment restored");
    } catch (err) {
      message.error(getApiError(err, "Could not update the comment"));
    }
  };

  const handleDelete = async (record) => {
    try {
      const result = await deleteComment(record._id).unwrap();
      message.success(`Deleted ${result.deletedCount} comment(s) including replies`);
    } catch (err) {
      message.error(getApiError(err, "Could not delete the comment"));
    }
  };

  const sortField = sort.replace("-", "");
  const sortDirection = sort.startsWith("-") ? "descend" : "ascend";
  const sortable = (field) => ({ sorter: true, sortOrder: sortField === field ? sortDirection : null });

  const columns = [
    {
      title: "Product",
      dataIndex: ["product", "name"],
      key: "product",
      width: 200,
      ellipsis: true,
      render: (name) => name || <Typography.Text type="secondary">(deleted product)</Typography.Text>,
    },
    {
      title: "Author",
      dataIndex: ["user", "name"],
      key: "user",
      width: 150,
      render: (name) => name || <Typography.Text type="secondary">(deleted user)</Typography.Text>,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      width: 140,
      ...sortable("rating"),
      render: (value, record) =>
        value ? (
          <Rate disabled value={value} style={{ fontSize: 13 }} />
        ) : (
          <Tag>{record.parentComment ? "reply" : "no rating"}</Tag>
        ),
    },
    {
      title: "Comment",
      dataIndex: "text",
      key: "text",
      render: (text) => (
        <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true, symbol: "more" }}>
          {text}
        </Typography.Paragraph>
      ),
    },
    {
      title: "Visibility",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      align: "center",
      render: (isActive) => <Tag color={isActive ? "green" : "red"}>{isActive ? "visible" : "hidden"}</Tag>,
    },
    {
      title: "Posted",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      ...sortable("createdAt"),
      render: (value) => formatDateTime(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            loading={updating}
            icon={record.isActive ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => toggleVisibility(record)}
          >
            {record.isActive ? "Hide" : "Restore"}
          </Button>
          <Popconfirm
            title="Delete this comment?"
            description="All replies to it are deleted too, and the product rating is recalculated."
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
    setSort(sorter?.order ? `${sorter.order === "descend" ? "-" : ""}${sorter.field}` : "-createdAt");
  };

  return (
    <Flex vertical gap={16}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Comments
      </Typography.Title>

      <Card size="small">
        <Flex gap={12} wrap>
          <Input
            allowClear
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
            placeholder="Search comment text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="Any rating"
            value={rating}
            onChange={setRating}
            options={RATING_OPTIONS}
          />
          <Select
            allowClear
            style={{ width: 170 }}
            placeholder="Visible + hidden"
            value={visibility}
            onChange={setVisibility}
            options={VISIBILITY_OPTIONS}
          />
        </Flex>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Because you are an admin, this list includes hidden comments — customers only ever see the visible ones."
      />

      {error && <Alert type="error" showIcon message={getApiError(error, "Could not load comments")} />}

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isFetching}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
        pagination={{
          current: data?.pagination?.page || page,
          pageSize: data?.pagination?.limit || limit,
          total: data?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} comments`,
        }}
      />
    </Flex>
  );
}
