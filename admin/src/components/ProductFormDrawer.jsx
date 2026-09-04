import { useEffect } from "react";
import {
  Alert,
  App,
  Button,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useCreateProductMutation, useUpdateProductMutation } from "../store/api/productApi";
import { getApiError } from "../store/api/baseApi";

const MAX_IMAGE_MB = 5;
const MAX_IMAGES = 5;

// Upload ka event object ya seedha array — Form ko hamesha fileList chahiye
const normalizeFiles = (event) => (Array.isArray(event) ? event : event?.fileList || []);

export default function ProductFormDrawer({ open, product, categories = [], onClose }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

  const isEdit = Boolean(product?._id);
  const saving = creating || updating;

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      form.setFieldsValue({
        name: product.name,
        price: product.price,
        // populate hone ke baad category object aata hai, warna plain id
        category: product.category?._id || product.category,
        stock: product.stock,
        sku: product.sku,
        description: product.description,
        isActive: product.isActive,
        images: [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ stock: 0, isActive: true, images: [] });
    }
  }, [open, isEdit, product, form]);

  const beforeUpload = (file) => {
    if (!file.type?.startsWith("image/")) {
      message.error(`${file.name} is not an image`);
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      message.error(`${file.name} is larger than ${MAX_IMAGE_MB}MB`);
      return Upload.LIST_IGNORE;
    }

    // false = upload mat karo, sirf fileList mein rakho. Files hum khud
    // FormData mein daal kar RTK Query se bhejte hain.
    return false;
  };

  const onFinish = async (values) => {
    const formData = new FormData();
    formData.append("name", values.name.trim());
    formData.append("price", values.price);
    formData.append("category", values.category);
    formData.append("stock", values.stock ?? 0);
    formData.append("description", values.description?.trim() || "");
    formData.append("isActive", values.isActive ? "true" : "false");

    // sku par unique+sparse index hai — khali string bhejne se doosra product
    // "sku already exists" se fail hota hai, is liye sirf value hone par bhejte hain
    if (values.sku?.trim()) formData.append("sku", values.sku.trim());

    (values.images || []).forEach((file) => {
      if (file.originFileObj) formData.append("images", file.originFileObj);
    });

    try {
      if (isEdit) {
        await updateProduct({ id: product._id, formData }).unwrap();
        message.success("Product updated");
      } else {
        await createProduct(formData).unwrap();
        message.success("Product created");
      }
      onClose();
    } catch (error) {
      message.error(getApiError(error, "Could not save the product"));
    }
  };

  const categoryOptions = categories.map((category) => ({
    value: category._id,
    label: category.parentCategory?.name
      ? `${category.parentCategory.name} › ${category.name}`
      : category.name,
  }));

  return (
    <Drawer
      title={isEdit ? `Edit — ${product.name}` : "Add product"}
      width={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {isEdit ? "Save changes" : "Create"}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark>
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, message: "Name is required" },
            { min: 2, message: "Name is too short" },
          ]}
        >
          <Input placeholder="Wireless keyboard" />
        </Form.Item>

        <Flex gap={12}>
          <Form.Item
            name="price"
            label="Price (PKR)"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: "Price is required" },
              { type: "number", min: 0, message: "Price cannot be negative" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={100} placeholder="1500" />
          </Form.Item>

          <Form.Item
            name="stock"
            label="Stock"
            style={{ flex: 1 }}
            rules={[{ type: "number", min: 0, message: "Stock cannot be negative" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
          </Form.Item>
        </Flex>

        <Form.Item name="category" label="Category" rules={[{ required: true, message: "Category is required" }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Pick a category"
            options={categoryOptions}
          />
        </Form.Item>

        <Form.Item name="sku" label="SKU (optional)">
          <Input placeholder="KB-1024" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={4} placeholder="What makes this product worth buying?" />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked" extra="Inactive products are hidden from the storefront (and from this list).">
          <Switch />
        </Form.Item>

        {isEdit && product.images?.length > 0 && (
          <Form.Item label="Current images">
            <Flex gap={8} wrap>
              {product.images.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt={product.name}
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #f0f0f0" }}
                />
              ))}
            </Flex>
          </Form.Item>
        )}

        <Form.Item
          name="images"
          label={isEdit ? "Replace images" : "Images"}
          valuePropName="fileList"
          getValueFromEvent={normalizeFiles}
          extra={`Up to ${MAX_IMAGES} images, ${MAX_IMAGE_MB}MB each.`}
        >
          <Upload
            listType="picture-card"
            accept="image/*"
            multiple
            maxCount={MAX_IMAGES}
            beforeUpload={beforeUpload}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 6 }}>Select</div>
            </div>
          </Upload>
        </Form.Item>

        {isEdit && (
          <Alert
            type="warning"
            showIcon
            message="Uploading new images replaces the whole gallery"
            description="The backend swaps the images array, so leave this empty to keep the current pictures."
          />
        )}

        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          Rating and review count are calculated from customer comments — they cannot be edited here.
        </Typography.Paragraph>
      </Form>
    </Drawer>
  );
}
