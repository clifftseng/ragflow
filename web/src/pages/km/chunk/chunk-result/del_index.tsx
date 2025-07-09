// 檔案: web/src/pages/km/chunk/chunk-result/index.tsx
// 【【【請建立或覆蓋此檔案】】】

import { Skeleton } from '@/components/ui/skeleton';
import { useChunk } from '../context';
import { ChunkCard } from '../chunk-card'; // 確保您已經複製了 chunk-card.tsx
import { IChunk } from '@/interfaces/database/knowledge';

export default function ChunkResultPage() {
  // 從 Context 獲取狀態
  const { data, loading, isError, error } = useChunk();

  // 偵錯日誌
  console.log(`[CHILD: ChunkResultPage] Received from context. Loading: ${loading}, Data:`, data);

  if (loading) {
    // 提供一個 Loading 狀態的 UI
    return <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"><Skeleton className="w-full h-32" /><Skeleton className="w-full h-32" /><Skeleton className="w-full h-32" /></div>;
  }

  if (isError) {
    // 提供一個錯誤訊息的 UI
    return <div className="p-6 text-red-500">Error: {(error as any)?.message || 'An unknown error occurred.'}</div>;
  }

  // 【【【核心修改處】】】
  // 在使用 .map 之前，先進行防禦性檢查，確保 data 和 data.chunks 都存在
  if (!data || !Array.isArray(data.chunks) || data.chunks.length === 0) {
    return <div className="p-6">No chunks found.</div>;
  }

  return (
    <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* 對 data.chunks 進行 map，而不是 data */}
      {data.chunks.map((chunk: IChunk) => (
        <ChunkCard
          key={chunk.chunk_id}
          activated={chunk.available_int === 1}
          content={chunk.content_with_weight}
        />
      ))}
    </div>
  );
}