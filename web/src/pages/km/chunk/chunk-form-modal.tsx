// 檔案: web/src/pages/km/chunk/chunk-form-modal.tsx
// 【【【請覆蓋此檔案】】】
import { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useKmCreateChunk, useKmUpdateChunk } from './hooks';
import { IChunk } from '@/interfaces/database/knowledge';

interface ChunkFormModalProps {
  open: boolean;
  onCancel: () => void;
  editingChunk?: IChunk | null; // 設為可選，如果有值則為編輯模式
}

export function ChunkFormModal({ open, onCancel, editingChunk }: ChunkFormModalProps) {
  const [form] = Form.useForm();
  const isEditMode = !!editingChunk;

  const { createChunk, creating } = useKmCreateChunk();
  const { updateChunk, updating } = useKmUpdateChunk();

  // 當彈窗打開時，如果是編輯模式，則設定表單初始值
  useEffect(() => {
    if (open && isEditMode) {
      form.setFieldsValue({ content_with_weight: editingChunk.content_with_weight });
    } else {
      form.resetFields();
    }
  }, [open, isEditMode, editingChunk, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode) {
        // 編輯模式
        updateChunk({ chunk_id: editingChunk.chunk_id, ...values }, { onSuccess: onCancel });
      } else {
        // 新增模式
        createChunk(values, { onSuccess: onCancel });
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  return (
    <Modal
      title={isEditMode ? "Edit Chunk" : "Add New Chunk"}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={creating || updating}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="content_with_weight" label="Chunk Content" rules={[{ required: true }]}>
          <Input.TextArea rows={10} />
        </Form.Item>
      </Form>
    </Modal>
  );
}