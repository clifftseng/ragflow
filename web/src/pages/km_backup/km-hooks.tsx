// 檔案路徑: web/src/pages/km/km-hooks.ts
// 版本：最終正確版

import { useFetchKnowledgeBaseConfiguration } from '@/hooks/knowledge-hooks';
import { useFetchDocumentList as useOriginalFetchDocumentList } from '@/hooks/use-document-request'; // 我們從這裡引入原始的鉤子
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
  } = useOriginalFetchDocumentList( // 注意：這裡呼叫的是我們引入的原始鉤子
    (params) => fetchKmDocumentList(params), // 但是，將獲取資料的函式替換成了我們自己的 fetchKmDocumentList
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