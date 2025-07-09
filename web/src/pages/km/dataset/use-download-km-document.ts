// 檔案路徑: web/src/pages/km/dataset/use-download-km-document.ts
// 說明: 這是為實現公開文件下載功能而建立的全新 Hook。

import { useState } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import request from '@/utils/request';
import api from '@/utils/api';

export const useDownloadKmDocument = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const download = async (docId: string, filename: string) => {
    setLoading(true);
    try {
      const response = await request.get(api.km_get_document_file(docId), {
        responseType: 'blob', // 關鍵：設定回應類型為 Blob
      });

      // 建立一個 Blob URL
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename); // 設定下載的檔案名稱
      document.body.appendChild(link);
      link.click();

      // 清理
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      message.error(t('message.downloadError'));
    } finally {
      setLoading(false);
    }
  };

  return { download, loading };
};