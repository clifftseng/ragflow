import { Routes } from '@/routes';
import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'umi';

export enum QueryStringMap {
  KnowledgeId = 'knowledgeId',
}

export const useNavigatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();

  const navigateToDatasetList = useCallback(() => {
    navigate(Routes.Datasets);
  }, [navigate]);

  const navigateToDataset = useCallback(
    (id: string) => () => {
      navigate(`${Routes.Dataset}/${id}`);
    },
    [navigate],
  );

  const navigateToPublicChunk = (path: SegmentedValue) => {
    navigate(path as string);
  };


  const navigateToPublicChunkPage = (kb_id: string, doc_id: string) => () => {
    navigate(`/km/${kb_id}/chunk/${doc_id}/parsed-result`);
  };

  const navigateToHome = useCallback(() => {
    navigate(Routes.Home);
  }, [navigate]);

  const navigateToProfile = useCallback(() => {
    navigate(Routes.ProfileSetting);
  }, [navigate]);

  const navigateToChatList = useCallback(() => {
    navigate(Routes.Chats);
  }, [navigate]);

  const navigateToChat = useCallback(() => {
    navigate(Routes.Chat);
  }, [navigate]);

  const navigateToAgentList = useCallback(() => {
    navigate(Routes.Agents);
  }, [navigate]);

  const navigateToAgent = useCallback(
    (id: string) => () => {
      navigate(`${Routes.Agent}/${id}`);
    },
    [navigate],
  );

  const navigateToAgentTemplates = useCallback(() => {
    navigate(Routes.AgentTemplates);
  }, [navigate]);

  const navigateToSearchList = useCallback(() => {
    navigate(Routes.Searches);
  }, [navigate]);

  const navigateToSearch = useCallback(() => {
    navigate(Routes.Search);
  }, [navigate]);

  const navigateToChunkParsedResult = useCallback(
    (id: string, knowledgeId?: string) => () => {
      navigate(
        `${Routes.ParsedResult}/${id}?${QueryStringMap.KnowledgeId}=${knowledgeId}`,
      );
    },
    [navigate],
  );

  const getQueryString = useCallback(
    (queryStringKey?: QueryStringMap) => {
      const allQueryString = {
        [QueryStringMap.KnowledgeId]: searchParams.get(
          QueryStringMap.KnowledgeId,
        ),
      };
      if (queryStringKey) {
        return allQueryString[queryStringKey];
      }
      return allQueryString;
    },
    [searchParams],
  );

  const navigateToChunk = useCallback(
    (route: Routes) => {
      navigate(
        `${route}/${id}?${QueryStringMap.KnowledgeId}=${getQueryString(QueryStringMap.KnowledgeId)}`,
      );
    },
    [getQueryString, id, navigate],
  );

  const navigateToFiles = useCallback(
    (folderId?: string) => {
      navigate(`${Routes.Files}?folderId=${folderId}`);
    },
    [navigate],
  );

  /**
   * 【新增並補全】導航至公開知識庫詳情頁 (/km/:id/dataset)
   * 用於 Chunk 頁面的返回按鈕。
   */
  const navigateToKmDataset = useCallback(
    (kbId: string) => () => {
      navigate(`/km/${kbId}/dataset`);
    },
    [navigate],
  );



  /**
   * 【保留且正確】產生一個用於 onClick 的、導航到公開 Chunk 頁面的函式
   * 用於 Dataset 列表頁點擊文件跳轉。
   */
  const navigateToKmChunkParsedResult = (docId: string, kbId: string) => {
    return () => {
      navigate(`/km/${kbId}/chunk/${docId}/parsed-result`);
    };
  };

  return {
    navigateToDatasetList,
    navigateToDataset,
    navigateToHome,
    navigateToProfile,
    navigateToChatList,
    navigateToChat,
    navigateToChunkParsedResult,
    getQueryString,
    navigateToChunk,
    navigateToAgentList,
    navigateToAgent,
    navigateToAgentTemplates,
    navigateToSearchList,
    navigateToSearch,
    navigateToFiles,
    navigateToPublicChunk,
    navigateToPublicChunkPage,
    navigateToKmChunkParsedResult,
    navigateToKmDataset, //【已補全並匯出】
  };
};
