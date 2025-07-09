// 檔案: web/src/pages/km/chunk/chunk-creating-modal.tsx
// 【【【請覆蓋此檔案】】】
import { Modal, Form, Input } from 'antd';
import { useKmCreateChunk } from './hooks'; // 【關鍵】: 導入我們新建的 Hook

interface KmChunkCreatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: () => void;
}

export function KmChunkCreatingModal({ open, onOpenChange, onFinish }: KmChunkCreatingModalProps) {
  const [form] = Form.useForm();
  const { createChunk, creating } = useKmCreateChunk(); // 【關鍵】: 使用新建的 Hook

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      createChunk(values, {
        onSuccess: () => {
          onFinish(); // 成功後關閉彈窗並清空表單
          form.resetFields();
        }
      });
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    form.resetFields();
  };

  return (
    <Modal
      title="Add New Chunk"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={creating} // 將按鈕的 loading 狀態與 hook 連動
      destroyOnClose
    >
      <Form form={form} layout="vertical" name="form_in_modal">
        <Form.Item
          name="content_with_weight"
          label="Chunk Content"
          rules={[{ required: true, message: 'Please input the content of the chunk!' }]}
        >
          <Input.TextArea rows={10} />
        </Form.Item>
      </Form>
    </Modal>
  );
}