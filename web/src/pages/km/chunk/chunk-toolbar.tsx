// 檔案: web/src/pages/km/chunk/chunk-toolbar.tsx
// 【【【請覆蓋此檔案】】】
import { Button } from '@/components/ui/button';
import { PlusOutlined } from '@ant-design/icons';

interface KmChunkToolbarProps {
  onAddChunk: () => void;
}

// 【【【核心修正】】】: 統一匯出的函式名稱為 KmChunkToolbar
export function KmChunkToolbar({ onAddChunk }: KmChunkToolbarProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-xl font-bold">Chunk List</span>
      <Button type="primary" onClick={onAddChunk}>
        <PlusOutlined /> Add Chunk
      </Button>
    </div>
  );
}