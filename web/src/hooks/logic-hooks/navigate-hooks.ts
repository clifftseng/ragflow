// 檔案路徑: web/src/hooks/logic-hooks/navigate-hooks.ts
// 【【【請覆蓋為以下內容】】】

import { Routes } from '@/routes';
import { useCallback } from 'react';
// 【【【核心修正 1/3】：確認導入 useLocation】】】
import { useNavigate, useParams, useSearchParams, useLocation } from 'umi';

export enum QueryStringMap {
  KnowledgeId = 'knowledgeId',
  id = 'id',
}

export const useNavigatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  // 【【【核心修正 2/3】：取得 location 物件】】】
  const location = useLocation();

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
        `${Routes.ParsedResult}/chunks?id=${knowledgeId}&doc_id=${id}`,
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
        [QueryStringMap.id]: searchParams.get(QueryStringMap.id),
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
        `${route}/${id}?${QueryStringMap.KnowledgeId}=${getQueryString(
          QueryStringMap.KnowledgeId,
        )}`,
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
   * 【【【核心修正 3/3】：修改 navigateToKmDataset 函式】】】
   * 導航至公開知識庫詳情頁 (/km/:id/dataset)，用於 Chunk 頁面的返回按鈕。
   * 在路徑後方附加 location.search，以確保 token 等查詢參數被完整保留。
   */
  const navigateToKmDataset = useCallback(
    (kbId: string) => () => {
      // ✅ 正確做法：直接附加原始的查詢字串
      navigate(`/km/${kbId}/dataset${location.search}`);
    },
    // ✅ 將 location.search 加入依賴項
    [navigate, location.search],
  );

  /**
   * 導航到公開 Chunk 頁面，用於 Dataset 列表頁點擊文件跳轉。
   */
  const navigateToKmChunkParsedResult = (docId: string, kbId: string) => {
    return () => {
      // ✅ 同樣使用 location.search 確保 token 被正確傳遞
      navigate(`/km/${kbId}/chunk/${docId}/parsed-result${location.search}`);
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
    navigateToKmDataset,
  };
};