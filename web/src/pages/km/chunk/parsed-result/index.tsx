// 檔案: web/src/pages/km/chunk/parsed-result/index.tsx
// 【【【簡化版】】】

import { Skeleton } from '@/components/ui/skeleton';
import { useChunk } from '../context';
import { ChunkCard } from '../chunk-card';
import { IChunk } from '@/interfaces/database/knowledge';

export default function ParsedResultPage() {
  // ✨ 所有資料和操作函式都從 context 中獲取
  const { data, loading, isError, error, handleEdit } = useChunk();

  if (loading) {
    return (
      <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-32" />
      </div>
    );
  }

  if (isError) {
    return <div className="p-6 text-red-500">Error: {(error as Error)?.message}</div>;
  }

  return (
    <div className="p-6">
      {/* ✨ KmChunkToolbar 已被移除 */}
      {data?.chunks?.length > 0 ? (
        <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {data.chunks.map((chunk: IChunk, index: number) => (
            <ChunkCard
              key={chunk.chunk_id}
              chunk={chunk}
              onEdit={handleEdit} // onEdit 來自 context
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground mt-8">
          No chunks found. You can add one by clicking the "Add Chunk" button.
        </div>
      )}
      {/* ✨ 彈窗的渲染邏輯已被移至父元件 */}
    </div>
  );
}