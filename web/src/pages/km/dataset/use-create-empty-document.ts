// 檔案路徑: web/src/pages/km/dataset/use-create-empty-document.ts
// 版本：架構整合修正版

// 【【【修正導入】】】 從 @/services/knowledge-service 導入預設的 kbService
import kbService from '@/services/knowledge-service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'umi';

export const useCreateEmptyDocument = () => {
  const { id: knowledgeBaseId } = useParams();
  const [createVisible, setCreateVisible] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (name: string) => {
      const payload = {
        name,
        kb_id: knowledgeBaseId as string,
      };

      // 【【【新增日誌紀錄】】】
      console.log(
        '%c[RAGFLOW-DEBUG] Sending request to kbService.km_document_create with payload:',
        'color: blue; font-weight: bold;',
        payload
      );

      return kbService.km_document_create(payload);
    },
    onSuccess: (data: any) => {
      // ... (此處內容保持不變) ...
    },
  });

  const onCreateOk = async (name: string) => {
    await createMutation.mutateAsync(name);
    hideCreateModal();
  };

  const showCreateModal = () => {
    setCreateVisible(true);
  };

  const hideCreateModal = () => {
    setCreateVisible(false);
  };

  return {
    createLoading: createMutation.isPending,
    onCreateOk,
    createVisible,
    showCreateModal,
    hideCreateModal,
  };
};