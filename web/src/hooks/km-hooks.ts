// 檔案路徑: web/src/pages/km/km-hooks.ts
// 版本：修正 import 來源

// 修正：從兩個不同的、正確的來源引入這兩個函式
import { useFetchKnowledgeBaseConfiguration } from '@/hooks/knowledge-hooks';
import { useFetchDocumentList } from '@/hooks/use-document-request';

import request from '@/utils/request';
import { useLocation, useParams } from 'umi';

// 呼叫我們新建的後端 API - 獲取知識庫詳情
const fetchKmDetail = (kb_id: string) => {
  return request.get(`/v1/km/detail`, {
    kb_id,
  });
};

// 呼叫我們新建的後端 API - 獲取文件列表
const fetchKmDocumentList = (params: any) => {
  return request.get<any>(`/v1/km/documents`, params);
};

// 導出新的鉤子，供 km 頁面使用
export const useFetchKmKnowledgeBaseConfiguration = (refreshCount?: number) => {
  const { id: kb_id } = useParams();
  return useFetchKnowledgeBaseConfiguration(
    () => fetchKmDetail(kb_id as string),
    [kb_id, refreshCount],
    kb_id,
  );
};

export const useFetchKmDocumentList = () => {
  const { id: kb_id } = useParams();
  const location = useLocation();

  const {
    searchString,
    documents,
    pagination,
    handleInputChange,
    setPagination,
    filterValue,
    handleFilterSubmit,
    loading,
  } = useFetchDocumentList(
    (params) => fetchKmDocumentList(params),
    ['km-documents', filterValue, location.search, kb_id],
    kb_id as string,
  );

  return {
    searchString,
    documents,
    pagination,
    handleInputChange,
    setPagination,
    filterValue,
    handleFilterSubmit,
    loading,
  };
};