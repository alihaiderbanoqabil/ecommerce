import { useEffect } from "react";
import { App, Flex, Form, Input, Modal, Select, Typography, Upload } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useCreateCategoryMutation, useUpdateCategoryMutation } from "../store/api/categoryApi";
import { getApiError } from "../store/api/baseApi";

const MAX_IMAGE_MB = 5;

const normalizeFiles = (event) => (Array.isArray(event) ? event : event?.fileList || []);

export default function CategoryFormModal({ open, category, categories = [], onClose }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();

  const isEdit = Boolean(category?._id);

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        parentCategory: category.parentCategory?._id || category.parentCategory || undefined,
        image: [],
      });
    } else {
      form.resetFields();
    }
  }, [open, isEdit, category, form]);

  const beforeUpload = (file) => {
    if (!file.type?.startsWith("image/")) {
      message.error(`${file.name} is not an image`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      message.error(`${file.name} is larger than ${MAX_IMAGE_MB}MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const onFinish = async (values) => {
    const file = values.image?.[0]?.originFileObj;
    const fields = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      // Select khali chhorna = top level. null hi bhejna parta hai, kyunke
      // findByIdAndUpdate khali string ko ObjectId mein cast karte hue phat jata hai.
      parentCategory: values.parentCategory || null,
    };

    let body = fields;

    if (file) {
      body = new FormData();
      body.append("name", fields.name);
      body.append("description", fields.description);
      // multipart mein har value string hoti hai, is liye null bhej hi nahi
      // sakte — parent sirf tab bhejte hain jab wo chuna gaya ho
      if (fields.parentCategory) body.append("parentCategory", fields.parentCategory);
      body.append("image", file);
    }

    try {
      if (isEdit) {
        await updateCategory({ id: category._id, body }).unwrap();

        // Naye image ke sath parent hataya gaya ho to wo multipart request
        // mein nahi ja saka — ek chhoti JSON patch se poora kar dete hain.
        if (file && !fields.parentCategory && category.parentCategory) {
          await updateCategory({ id: category._id, body: { parentCategory: null } }).unwrap();
        }

        message.success("Category updated");
      } else {
        await createCategory(body).unwrap();
        message.success("Category created");
      }
      onClose();
    } catch (error) {
      message.error(getApiError(error, "Could not save the category"));
    }
  };

  // Apni hi category parent nahi ban sakti — warna tree mein cycle ban jata hai
  const parentOptions = categories
    .filter((item) => item._id !== category?._id)
    .map((item) => ({ value: item._id, label: item.name }));

  return (
    <Modal
      title={isEdit ? `Edit — ${category.name}` : "Add category"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={isEdit ? "Save changes" : "Create"}
      confirmLoading={creating || updating}
      destroyOnHidden
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
          <Input placeholder="Laptops" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Short description for the storefront" />
        </Form.Item>

        <Form.Item name="parentCategory" label="Parent category" extra="Leave empty for a top-level category.">
          <Select allowClear showSearch optionFilterProp="label" placeholder="None" options={parentOptions} />
        </Form.Item>

        {isEdit && category.image && (
          <Form.Item label="Current image">
            <img
              src={category.image}
              alt={category.name}
              style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #f0f0f0" }}
            />
          </Form.Item>
        )}

        <Form.Item
          name="image"
          label={isEdit ? "Replace image" : "Image"}
          valuePropName="fileList"
          getValueFromEvent={normalizeFiles}
          extra={`One image, up to ${MAX_IMAGE_MB}MB.`}
        >
          <Upload listType="picture-card" accept="image/*" maxCount={1} beforeUpload={beforeUpload}>
            <Flex vertical align="center">
              <PlusOutlined />
              <Typography.Text style={{ fontSize: 12 }}>Select</Typography.Text>
            </Flex>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
