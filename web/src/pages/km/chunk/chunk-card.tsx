// 檔案: web/src/pages/km/chunk/chunk-card.tsx
// 【【【最終交付版本】】】

import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Annoyed, Trash2, Pencil } from 'lucide-react';
import { useKmSwitchChunk, useKmRemoveChunk } from './hooks';
import { IChunk } from '@/interfaces/database/knowledge';
import { Modal } from 'antd'; // 導入 antd 的 Modal
import { useTranslation } from 'react-i18next'; // 導入翻譯 Hook

interface ChunkCardProps {
  chunk: IChunk;
  onEdit: (chunk: IChunk) => void;
}

export function ChunkCard({ chunk, onEdit }: ChunkCardProps) {
  const { t } = useTranslation();
  const { switchChunk, switching } = useKmSwitchChunk();
  const { removeChunk, removing } = useKmRemoveChunk();

  const { chunk_id, available_int, content_with_weight } = chunk;
  const activated = available_int === 1;

  const handleSwitchChange = (checked: boolean) => {
    switchChunk({ chunk_ids: [chunk_id], available_int: checked ? 1 : 0 });
  };

  // 使用 antd 的 Modal.confirm 來顯示刪除確認對話框
  const showDeleteConfirm = () => {
    Modal.confirm({
      title: t('common.delete'),
      content: t('chunk.deleteSelected', { name: `chunk (${chunk_id.slice(0, 8)}...` }),
      okText: t('common.ok'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      confirmLoading: removing,
      onOk() {
        // 返回一個 Promise，以便在異步操作完成後自動關閉對話框
        return new Promise((resolve, reject) => {
          removeChunk(chunk_id, {
            onSuccess: () => resolve(), // API 呼叫成功，關閉彈窗
            onError: (error) => reject(error), // API 呼叫失敗，同樣關閉彈窗
          });
        });
      },
    });
  };

  const isLoading = switching || removing;

  return (
    <Card className="bg-colors-outline-neutral-standard border-colors-outline-neutral-strong rounded-3xl flex flex-col justify-between h-full">
      <CardContent className="p-4 flex-1">
        <div className="flex justify-between items-center mb-2">
          <Annoyed />
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Active</span>
            <Switch
              checked={activated}
              onCheckedChange={handleSwitchChange}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="text-colors-text-neutral-strong text-base mt-2 line-clamp-4">
          {content_with_weight}
        </div>
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