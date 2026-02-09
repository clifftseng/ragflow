import { useHandleFilterSubmit } from '@/components/list-filter-bar/use-handle-filter-submit';
import { INextTestingResult } from '@/interfaces/database/knowledge';
import { ITestRetrievalRequestBody } from '@/interfaces/request/knowledge';
import kbService from '@/services/knowledge-service';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'umi';

export const useKmTestRetrieval = () => {
  const { id: kb_id } = useParams();
  const [values, setValues] = useState<ITestRetrievalRequestBody>();
  const mountedRef = useRef(false);
  const { filterValue, handleFilterSubmit } = useHandleFilterSubmit();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const onPaginationChange = useCallback((page: number, pageSize: number) => {
    setPage(page);
    setPageSize(pageSize);
  }, []);

  const queryParams = useMemo(() => {
    return {
      ...values,
      kb_id: values?.kb_id || kb_id,
      page,
      size: pageSize,
      doc_ids: filterValue.doc_ids,
      highlight: true,
    };
  }, [filterValue, kb_id, page, pageSize, values]);

  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery<INextTestingResult>({
    queryKey: ['kmTestRetrieval', queryParams, page, pageSize],
    initialData: {
      chunks: [],
      doc_aggs: [],
      total: 0,
      isRuned: false,
    },
    enabled: false,
    gcTime: 0,
    queryFn: async () => {
      const { data } = await kbService.km_retrieval_test(queryParams);
      const result = data?.data ?? {};
      return { ...result, isRuned: true };
    },
  });

  useEffect(() => {
    if (mountedRef.current) {
      refetch();
    }
    mountedRef.current = true;
  }, [page, pageSize, refetch, filterValue]);

  return {
    data,
    loading,
    setValues,
    refetch,
    onPaginationChange,
    page,
    pageSize,
    handleFilterSubmit,
    filterValue,
  };
};
