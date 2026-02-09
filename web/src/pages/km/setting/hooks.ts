import message from '@/components/ui/message';
import { DocumentParserType } from '@/constants/knowledge';
import { useSetModalState } from '@/hooks/common-hooks';
import { IKnowledgeBase } from '@/interfaces/database/knowledge';
import { IRenameTag } from '@/interfaces/database/knowledge';
import i18n from '@/locales/config';
import kbService, {
  kmListTagsByKnowledgeId,
  kmListTagsByKnowledgeIds,
  kmRemoveTag,
  kmRenameTag,
} from '@/services/knowledge-service';
import request from '@/utils/request';
import {
  useIsFetching,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { FormInstance } from 'antd';
import { UseFormReturn } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'umi';
import { z } from 'zod';
import { formSchema } from './form-schema';

export const useKmKnowledgeBaseId = (): string => {
  const { id } = useParams();
  return (id as string) || '';
};

const fetchKmDetail = (kb_id: string) =>
  request.get(`/v1/km/detail`, { params: { kb_id } });

export const useFetchKmKnowledgeBaseConfiguration = () => {
  const kb_id = useKmKnowledgeBaseId();

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

export const useKmUpdateKnowledge = () => {
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['kmUpdateKnowledge'],
    mutationFn: async (params: Record<string, any>) => {
      const { data = {} } = await kbService.km_update_kb(params);
      if (data.code === 0) {
        message.success(i18n.t(`message.modified`));
        queryClient.invalidateQueries({ queryKey: ['kmKnowledgeBase'] });
      }
      return data;
    },
  });

  return { data, loading, saveKnowledgeConfiguration: mutateAsync };
};

export const useSubmitKnowledgeConfiguration = (form: FormInstance) => {
  const { saveKnowledgeConfiguration, loading } = useKmUpdateKnowledge();

  const submitKnowledgeConfiguration = useCallback(async () => {
    const values = await form.validateFields();
    saveKnowledgeConfiguration({
      ...values,
    });
  }, [saveKnowledgeConfiguration, form]);

  return {
    submitKnowledgeConfiguration,
    submitLoading: loading,
  };
};

// The value that does not need to be displayed in the analysis method Select
const HiddenFields = ['email', 'picture', 'audio'];

export function useSelectChunkMethodList() {
  const { data: knowledgeDetails } = useFetchKmKnowledgeBaseConfiguration();
  const parserIds = knowledgeDetails?.parser_ids?.split(',') ?? [];
  const parserList =
    parserIds.length > 0
      ? parserIds.map((x) => {
          const arr = x.split(':');
          return { value: arr[0], label: arr[1] || arr[0] };
        })
      : Object.values(DocumentParserType).map((x) => ({
          value: x,
          label: x,
        }));

  return parserList.filter((x) => !HiddenFields.some((y) => y === x.value));
}

// Backward-compatible alias used by CategoryPanel
export const useSelectParserList = useSelectChunkMethodList;

export function useSelectEmbeddingModelOptions() {
  const { data: knowledgeDetails } = useFetchKmKnowledgeBaseConfiguration();
  const embdId = knowledgeDetails?.embd_id;
  return embdId ? [{ value: embdId, label: embdId }] : [];
}

export function useHasParsedDocument() {
  const { data: knowledgeDetails } = useFetchKmKnowledgeBaseConfiguration();
  return (knowledgeDetails?.chunk_num ?? 0) > 0;
}

export const useFetchKnowledgeConfigurationOnMount = (
  form: UseFormReturn<z.infer<typeof formSchema>, any, undefined>,
) => {
  const { data: knowledgeDetails } = useFetchKmKnowledgeBaseConfiguration();

  useEffect(() => {
    if (!knowledgeDetails?.id) return;
    form.reset({
      name: knowledgeDetails.name,
      description: knowledgeDetails.description,
      permission: knowledgeDetails.permission,
      embd_id: knowledgeDetails.embd_id,
      parser_id: knowledgeDetails.parser_id,
      language: knowledgeDetails.language,
      parser_config: knowledgeDetails.parser_config,
      pagerank: knowledgeDetails.pagerank,
      avatar: knowledgeDetails.avatar ? [{ thumbUrl: knowledgeDetails.avatar }] : [],
    });
  }, [form, knowledgeDetails]);

  return knowledgeDetails;
};

export const useSelectKnowledgeDetailsLoading = () =>
  useIsFetching({ queryKey: ['kmKnowledgeBase'] }) > 0;

export const useHandleChunkMethodChange = () => {
  return {};
};

export const useRenameKnowledgeTag = () => {
  const [tag, setTag] = useState<string>('');
  const {
    visible: tagRenameVisible,
    hideModal: hideTagRenameModal,
    showModal: showFileRenameModal,
  } = useSetModalState();

  const handleShowTagRenameModal = useCallback(
    (record: string) => {
      setTag(record);
      showFileRenameModal();
    },
    [showFileRenameModal],
  );

  return {
    initialName: tag,
    tagRenameVisible,
    hideTagRenameModal,
    showTagRenameModal: handleShowTagRenameModal,
  };
};

// tag operations (public)
export const useFetchTagListByKnowledgeIds = () => {
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);

  const { data, isFetching: loading } = useQuery<Array<[string, number]>>({
    queryKey: ['kmFetchTagListByKnowledgeIds', knowledgeIds],
    enabled: knowledgeIds.length > 0,
    initialData: [],
    gcTime: 0,
    queryFn: async () => {
      const { data } = await kmListTagsByKnowledgeIds(knowledgeIds);
      return data?.data || [];
    },
  });

  return { list: data, loading, setKnowledgeIds };
};

export const useFetchTagList = () => {
  const kb_id = useKmKnowledgeBaseId();
  const { data, isFetching: loading } = useQuery<Array<[string, number]>>({
    queryKey: ['kmFetchTagList', kb_id],
    initialData: [],
    gcTime: 0,
    queryFn: async () => {
      if (!kb_id) return [];
      const { data } = await kmListTagsByKnowledgeId(kb_id);
      return data?.data || [];
    },
  });
  return { list: data, loading };
};

export const useRenameTag = () => {
  const kb_id = useKmKnowledgeBaseId();
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['kmRenameTag'],
    mutationFn: async (params: IRenameTag) => {
      const { data } = await kmRenameTag(kb_id, params);
      if (data.code === 0) {
        message.success(i18n.t(`message.modified`));
        queryClient.invalidateQueries({ queryKey: ['kmFetchTagList'] });
      }
      return data?.data ?? [];
    },
  });
  return { data, loading, renameTag: mutateAsync };
};

export const useTagIsRenaming = () =>
  useIsMutating({ mutationKey: ['kmRenameTag'] }) > 0;

export const useDeleteTag = () => {
  const kb_id = useKmKnowledgeBaseId();
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['kmDeleteTag'],
    mutationFn: async (tags: string[]) => {
      const { data } = await kmRemoveTag(kb_id, tags);
      if (data.code === 0) {
        message.success(i18n.t(`message.deleted`));
        queryClient.invalidateQueries({ queryKey: ['kmFetchTagList'] });
      }
      return data?.data ?? [];
    },
  });
  return { data, loading, deleteTag: mutateAsync };
};
