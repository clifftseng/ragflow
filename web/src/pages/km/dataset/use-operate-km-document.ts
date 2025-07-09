// 檔案路徑: tb/ragflow/web/src/pages/km/dataset/use-operate-km-document.ts
// 【【【這是一個全新的檔案】】】

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'umi';
import kbService from '@/services/knowledge-service';
import { useCallback } from 'react';

export const useOperateKmDocument = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id: knowledgeBaseId } = useParams();

  const invalidateDocumentList = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['kmDocumentList', knowledgeBaseId],
    });
  }, [knowledgeBaseId, queryClient]);

  // Rer-un and Cancel Mutation
  const runMutation = useMutation({
    mutationFn: async ({
      doc_ids,
      run_type,
    }: {
      doc_ids: string[];
      run_type: 'rerun' | 'cancel';
    }) => {
      const { data } = await kbService.km_document_run({ doc_ids, run_type });
      return data;
    },
    onSuccess: () => {
      message.success(t('message.operated'));
      invalidateDocumentList();
    },
    onError: (error: any) => {
      message.error(error.message || t('message.operateError'));
    },
  });

  // Remove Mutation
  const removeMutation = useMutation({
    mutationFn: async (doc_ids: string[]) => {
      const { data } = await kbService.km_document_rm({ doc_ids });
      return data;
    },
    onSuccess: () => {
      message.success(t('message.deleted'));
      invalidateDocumentList();
    },
    onError: (error: any) => {
      message.error(error.message || t('message.deleteError'));
    },
  });

  const onRerun = useCallback(
    (docId: string) => {
      runMutation.mutate({ doc_ids: [docId], run_type: 'rerun' });
    },
    [runMutation],
  );

  const onCancel = useCallback(
    (docId: string) => {
      runMutation.mutate({ doc_ids: [docId], run_type: 'cancel' });
    },
    [runMutation],
  );

  const onRemove = useCallback(
    (docId: string) => {
      removeMutation.mutate([docId]);
    },
    [removeMutation],
  );

  return {
    onRerun,
    onCancel,
    onRemove,
    rerunLoading: runMutation.isPending,
    removeLoading: removeMutation.isPending,
  };
};