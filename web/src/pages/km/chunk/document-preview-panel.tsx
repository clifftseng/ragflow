// 檔案: tb/ragflow/web/src/pages/km/chunk/document-preview-panel.tsx
// 【【【最終修正版 - 增加無縮圖時的優雅處理】】】

import { Skeleton } from '@/components/ui/skeleton';
import { useChunk } from './context';
import { useFetchKmThumbnails } from './hooks';
import { Badge } from '@/components/ui/badge';
import { RunningStatusMap } from '@/pages/dataset/dataset/constant';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react'; // 【【【新增】】】: 導入一個文件圖示

export function DocumentPreviewPanel() {
  const { t } = useTranslation();
  const { data: chunkData, loading: chunkLoading } = useChunk();
  const { data: thumbnails, isLoading: thumbnailsLoading } = useFetchKmThumbnails();

  const documentInfo = chunkData?.documentInfo;

  if (chunkLoading || !documentInfo) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentStatus = RunningStatusMap[documentInfo.run] ?? {
    label: 'default.status',
    color: 'orange',
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold break-all">{documentInfo.name}</h3>

      <div className="text-sm space-y-1">
        <div className="flex items-center space-x-2">
            <b>{t('knowledgeDetails.parsingStatus')}:</b>
            <Badge variant={currentStatus.color as any}>
                {t(currentStatus.label)}
            </Badge>
        </div>
        <div>
            <b>{t('knowledgeDetails.chunkNumber')}:</b> {documentInfo.chunk_num}
        </div>
      </div>
      
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-2">Thumbnails</h4>
        {thumbnailsLoading && <Skeleton className="w-full h-32" />}
        
        {thumbnails && Array.isArray(thumbnails) && thumbnails.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {thumbnails.map((thumb: any, index: number) => (
              <div key={index} className="rounded-md border aspect-[3/4] flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                {/* 【【【核心修正：增加條件渲染】】】 */}
                {thumb.thumbnail ? (
                  <img
                    src={thumb.thumbnail.startsWith('data:image') ? thumb.thumbnail : `data:image/jpeg;base64,${thumb.thumbnail}`}
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileText size={24} />
                    <span className="text-xs mt-1">Page {index + 1}</span>
                    <span className="text-xs mt-1">(No Preview)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !thumbnailsLoading && <p className="text-sm text-muted-foreground">No thumbnails available for this document type.</p>
        )}
      </div>
    </div>
  );
}