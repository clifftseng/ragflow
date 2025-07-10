// 檔案: web/src/pages/km/chunk/chunk-card.tsx
// 【【【最終樣式強化版】】】

import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Pencil } from 'lucide-react';
import { useKmSwitchChunk, useKmRemoveChunk } from './hooks';
import { IChunk } from '@/interfaces/database/knowledge';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
// ✨ 我們不再需要導入 CSS module 或 cn 函式

interface ChunkCardProps {
  chunk: IChunk;
  onEdit: (chunk: IChunk) => void;
  index: number;
}

export function ChunkCard({ chunk, onEdit, index }: ChunkCardProps) {
  const { t } = useTranslation();
  const { switchChunk, switching } = useKmSwitchChunk();
  const { removeChunkAsync, removing } = useKmRemoveChunk();

  const { chunk_id, available_int, content_with_weight } = chunk;
  const activated = available_int === 1;

  // ... (此處的 handleSwitchChange 和 showDeleteConfirm 函式保持不變)
  const handleSwitchChange = (checked: boolean) => {
    switchChunk({ chunk_ids: [chunk_id], available_int: checked ? 1 : 0 });
  };

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: t('common.delete'),
      content: t('chunk.deleteSelected', { name: `chunk (${chunk_id.slice(0, 8)}...` }),
      okText: t('common.ok'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      confirmLoading: removing,
      async onOk() {
        try {
         // 直接等待異步操作完成，antd 會自動處理 Promise
         await removeChunkAsync(chunk_id);
        } catch (error) {
         // 錯誤已經在 hook 中處理，這裡可以保持安靜或做額外處理
         console.error("Deletion failed:", error);
        }
       },
    });
  };

  const isLoading = switching || removing;

  // 為每個卡片產生一個唯一的 CSS class 名稱，確保樣式隔離
  const cardSpecificClass = `chunk-card-table-${chunk_id}`;

  return (
    <Card className="bg-colors-outline-neutral-standard border-colors-outline-neutral-strong rounded-3xl flex flex-col justify-between h-full">
      {/* ✨ 核心修正 1: 直接在元件內注入 scoped CSS */}
      <style>
        {`
          .${cardSpecificClass} table,
          .${cardSpecificClass} th,
          .${cardSpecificClass} td {
            border: 1px solid #cbd5e1; /* slate-300 */
            padding: 0.5rem;
          }
          .${cardSpecificClass} thead {
            background-color: #f1f5f9; /* slate-100 */
          }
          .dark .${cardSpecificClass} table,
          .dark .${cardSpecificClass} th,
          .dark .${cardSpecificClass} td {
            border-color: #475569; /* slate-600 */
          }
          .dark .${cardSpecificClass} thead {
            background-color: #1e293b; /* slate-800 */
          }
        `}
      </style>

      <CardContent className="p-4 flex-1">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
            {index + 1}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Active</span>
            <Switch
              checked={activated}
              onCheckedChange={handleSwitchChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div
          // ✨ 核心修正 2: 將唯一的 class 名稱應用到 div 上
          className={`text-colors-text-neutral-strong text-base mt-2 line-clamp-4 prose dark:prose-invert max-w-none ${cardSpecificClass}`}
          dangerouslySetInnerHTML={{ __html: content_with_weight }}
        />

      </CardContent>
      <div className="flex justify-end p-2 border-t mt-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading} onClick={() => onEdit(chunk)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('common.edit')}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" disabled={isLoading} onClick={showDeleteConfirm}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t('common.delete')}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
}