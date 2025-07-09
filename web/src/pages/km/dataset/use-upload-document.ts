// 檔案路徑: web/src/pages/km/dataset/use-upload-document.ts

import { uploadPublicDocument } from '@/services/knowledge-service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'umi';

export const useHandleUploadDocument = () => {
  const [documentUploadVisible, setDocumentUploadVisible] = useState(false);
  const { id: knowledgeBaseId } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleUploadSuccess = () => {
    message.success(t('message.uploaded'));
    queryClient.invalidateQueries({
      queryKey: ['kmDocumentList', knowledgeBaseId],
    });
  };

  const uploadMutation = useMutation({
    mutationFn: (fileList: File[]) => {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append('file', file);
      }
      return uploadPublicDocument(knowledgeBaseId as string, formData);
    },
    onSuccess: handleUploadSuccess,
  });

  const hideDocumentUploadModal = () => {
    setDocumentUploadVisible(false);
  };

  const showDocumentUploadModal = () => {
    setDocumentUploadVisible(true);
  };

  const onDocumentUploadOk = async (fileList: File[]) => {
    await uploadMutation.mutateAsync(fileList);
    hideDocumentUploadModal();
  };

  return {
    documentUploadVisible,
    hideDocumentUploadModal,
    showDocumentUploadModal,
    onDocumentUploadOk,
    documentUploadLoading: uploadMutation.isPending,
  };
};