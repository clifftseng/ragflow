// 檔案路徑: web/src/pages/km/dataset/rename-modal.tsx
// 【【【這是一個新檔案】】】

import { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { IDocument } from '@/interfaces/database/document';

interface RenameModalProps {
  visible: boolean;
  onOk: (values: { name: string }) => void;
  onCancel: () => void;
  loading: boolean;
  document: IDocument | null;
}

export function RenameModal({ visible, onOk, onCancel, loading, document }: RenameModalProps) {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  // 當對話框可見且正在編輯的文件存在時，自動填入當前名稱
  useEffect(() => {
    if (visible && document) {
      form.setFieldsValue({ name: document.name });
    }
  }, [visible, document, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  return (
    <Modal
      title={t('common.rename')}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" name="rename_form_in_modal">
        <Form.Item
          name="name"
          label={t('common.namePlaceholder')}
          rules={[{ required: true, message: t('knowledgeDetails.fileNameTip') }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}