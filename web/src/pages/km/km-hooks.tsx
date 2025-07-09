// 檔案路徑: web/src/pages/km/km-hooks.tsx
// 【【【快取問題修正版】】】

import { IKnowledgeBase } from '@/interfaces/database/knowledge';
import request from '@/utils/request';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'umi';

// 呼叫我們新建的後端 API - 獲取知識庫詳情
const fetchKmDetail = (kb_id: string) => {
  return request.get(`/v1/km/detail`, { params: { kb_id } });
};

// 呼叫我們新建的後端 API - 獲取文件列表
const fetchKmDocumentList = (params: any) => {
  return request.get<any>(`/v1/km/documents`, { params });
};

// 知識庫詳情的鉤子 (無變動)
export const useFetchKmKnowledgeBaseConfiguration = () => {
  const { id: kb_id } = useParams();

  const { data, isFetching: loading } = useQuery<IKnowledgeBase>({
    queryKey: ['kmKnowledgeBase', kb_id],
    initialData: {} as IKnowledgeBase,
    gcTime: 0,
    enabled: !!kb_id,
    queryFn: async () => {
      if (!kb_id) return {} as IKnowledgeBase;
      const { data: res } = await fetchKmDetail(kb_id);
      if (res.code === 0) {
        return res.data;
      }
      return {} as IKnowledgeBase;
    },
  });

  return { data, loading };
};


// 文件列表的鉤子 (清理後)
export const useFetchKmDocumentList = () => {
  const { id: kb_id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchString, setSearchString] = useState('');

  const page = searchParams.get('page') ?? '1';
  const size = searchParams.get('size') ?? '10';

  const { data, isFetching: loading } = useQuery({
    queryKey: ['kmDocumentList', kb_id, page, size, searchString],
    initialData: { docs: [], total: 0 },
    gcTime: 0,
    enabled: !!kb_id,
    queryFn: async () => {
      if (!kb_id) return { docs: [], total: 0 };

      // 【【【關鍵修正：添加 Cache Busting 參數】】】
      // 我們在請求中加入一個不斷變化的時間戳 `_`，
      // 這會讓瀏覽器認為每次都是新的請求，從而避免讀取舊的快取。
      const apiParams = {
        kb_id,
        page,
        size,
        keywords: searchString,
        '_': new Date().getTime(),
      };

      const { data: res } = await fetchKmDocumentList(apiParams);

      if (res.code === 0) {
        return res.data;
      }
      return { docs: [], total: 0 };
    },
  });

  const pagination = {
    current: Number(page),
    pageSize: Number(size),
    total: data?.total ?? 0,
  };

  const handleInputChange = (eventOrValue: any) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setSearchString(value);
  };

  const setPagination = ({
    current,
    pageSize,
  }: {
    current: number;
    pageSize: number;
  }) => {
    setSearchParams((prev) => {
      prev.set('page', current.toString());
      prev.set('size', pageSize.toString());
      return prev;
    });
  };

  const returnValue = {
    searchString,
    documents: data?.docs ?? [],
    pagination,
    handleInputChange,
    setPagination,
    loading,
  };

  return returnValue;
};