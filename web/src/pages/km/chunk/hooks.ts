// 檔案: tb/ragflow/web/src/pages/km/chunk/hooks.ts
// 【【【最終解決方案 - 全面採用樂觀更新】】】

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'umi';
import kbService from '@/services/knowledge-service';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { IChunk, IKnowledgeFile } from '@/interfaces/database/knowledge';

// 定義我們查詢回傳的資料結構，方便 TypeScript 進行類型檢查
interface IKmChunkListData {
  documentInfo: IKnowledgeFile;
  chunks: IChunk[];
  total: number;
}

// 查詢鉤子保持不變，它做得很好
export const useFetchKmChunkList = () => {
  const { id: kb_id, doc_id } = useParams<{ id: string; doc_id: string }>();

  const { data, isLoading: loading, isError, error } = useQuery<IKmChunkListData>({
    queryKey: ['fetchKmChunkList', kb_id, doc_id],
    queryFn: async () => {
      const { data: apiResponse } = await kbService.km_chunk_list({
        kb_id: kb_id!,
        doc_id: doc_id!,
        page: 1,
        size: 1000,
      });
      if (apiResponse.code === 0 && apiResponse.data) {
        const { doc, ...rest } = apiResponse.data;
        return { documentInfo: doc, ...rest };
      }
      throw new Error(apiResponse.msg || 'Failed to fetch chunks from API');
    },
    enabled: !!kb_id && !!doc_id,
  });

  return { data, loading, isError, error };
};

// 縮圖鉤子保持不變
export const useFetchKmThumbnails = () => {
  const { doc_id } = useParams<{ doc_id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['fetchKmThumbnails', doc_id],
    queryFn: async () => {
      const { data: apiResponse } = await kbService.km_document_thumbnails({ doc_id: doc_id! });
      if (apiResponse.code === 0) return apiResponse.data;
      return [];
    },
    enabled: !!doc_id,
  });
  return { data, isLoading };
};

// 【【【升級點 1：useKmSwitchChunk 採用樂觀更新】】】
export const useKmSwitchChunk = () => {
  const queryClient = useQueryClient();
  const { id: kb_id, doc_id } = useParams();
  const { t } = useTranslation();
  const queryKey = ['fetchKmChunkList', kb_id, doc_id];

  const { mutate, isPending } = useMutation({
    mutationFn: (params: { chunk_ids: string[]; available_int: number }) =>
      kbService.km_chunk_switch({ doc_id: doc_id, ...params }),
    
    onMutate: async (newItem) => {
      // 1. 取消任何可能影響結果的正在進行的查詢
      await queryClient.cancelQueries({ queryKey });

      // 2. 儲存當前的快取資料，以便在出錯時可以復原
      const previousData = queryClient.getQueryData<IKmChunkListData>(queryKey);

      // 3. 立即、樂觀地更新快取
      if (previousData) {
        const newChunks = previousData.chunks.map(chunk =>
          newItem.chunk_ids.includes(chunk.chunk_id)
            ? { ...chunk, available_int: newItem.available_int }
            : chunk
        );
        queryClient.setQueryData(queryKey, { ...previousData, chunks: newChunks });
      }

      // 4. 將舊資料回傳給 context，以便 onError 時使用
      return { previousData };
    },
    
    onError: (err, newItem, context) => {
      // 如果 mutation 失敗，使用 onMutate 回傳的 context 來復原快取
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      message.error((err as Error).message);
    },

    onSuccess:()=>{
        message.success(t('message.modified'));
    },
    
    onSettled: () => {
      // 無論成功或失敗，最終都要重新獲取伺服器的真實資料，確保最終一致性
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return { switchChunk: mutate, switching: isPending };
};


// 為了保持一致性，我們也對其他修改操作應用相同的樂觀更新模式

// 【【【升級點 2：useKmRemoveChunk 採用樂觀更新】】】
export const useKmRemoveChunk = () => {
  const queryClient = useQueryClient();
  const { id: kb_id, doc_id } = useParams();
  const { t } = useTranslation();
  const queryKey = ['fetchKmChunkList', kb_id, doc_id];

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (chunk_id: string) => kbService.km_chunk_rm({ doc_id: doc_id, chunk_ids: [chunk_id] }),
    onMutate: async (chunk_id_to_delete) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<IKmChunkListData>(queryKey);
      if (previousData) {
        const newChunks = previousData.chunks.filter(chunk => chunk.chunk_id !== chunk_id_to_delete);
        queryClient.setQueryData(queryKey, { ...previousData, chunks: newChunks });
      }
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      message.error((err as Error).message);
    },
    onSuccess: () => {
        message.success(t('message.deleted'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  return { removeChunkAsync: mutateAsync, removing: isPending };
};

// 【【【升級點 3：useKmUpdateChunk 採用樂觀更新】】】
export const useKmUpdateChunk = () => {
  const queryClient = useQueryClient();
  const { id: kb_id, doc_id } = useParams();
  const { t } = useTranslation();
  const queryKey = ['fetchKmChunkList', kb_id, doc_id];

  const { mutate, isPending } = useMutation({
    mutationFn: (params: { chunk_id: string, content_with_weight: string }) => kbService.km_chunk_set({ doc_id: doc_id, ...params }),
    onMutate: async (newItem) => {
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData<IKmChunkListData>(queryKey);
        if (previousData) {
            const newChunks = previousData.chunks.map(chunk =>
                chunk.chunk_id === newItem.chunk_id
                    ? { ...chunk, content_with_weight: newItem.content_with_weight }
                    : chunk
            );
            queryClient.setQueryData(queryKey, { ...previousData, chunks: newChunks });
        }
        return { previousData };
    },
    onError: (err, vars, context) => {
        if (context?.previousData) {
            queryClient.setQueryData(queryKey, context.previousData);
        }
        message.error((err as Error).message);
    },
    onSuccess: () => {
        message.success(t('message.modified'));
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
    },
  });

  return { updateChunk: mutate, updating: isPending };
};


// 【【【升級點 4：useKmCreateChunk 也稍微調整以保持一致】】】
export const useKmCreateChunk = () => {
    const queryClient = useQueryClient();
    const { id: kb_id, doc_id } = useParams();
  
    const { mutate, isPending } = useMutation({
      mutationFn: (values: { content_with_weight: string }) => {
        return kbService.km_chunk_create({ doc_id: doc_id, ...values });
      },
      onSuccess: () => {
        message.success('Chunk created successfully!');
        // 建立操作後，我們不需要樂觀更新，直接作廢快取即可，因為我們不知道新 chunk 的 ID
        queryClient.invalidateQueries({ queryKey: ['fetchKmChunkList', kb_id, doc_id] });
      },
      onError: (error) => {
        message.error((error as Error).message);
      },
    });
    return { createChunk: mutate, creating: isPending };
  };