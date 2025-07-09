// 檔案: web/src/pages/km/chunk/parsed-result/index.tsx
// 【【【最終、最完整的版本】】】

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useChunk } from '../context';
import { ChunkCard } from '../chunk-card';
import { IChunk } from '@/interfaces/database/knowledge';
import { KmChunkToolbar } from '../chunk-toolbar';
import { ChunkFormModal } from '../chunk-form-modal';

export default function ParsedResultPage() {
  const { data, loading, isError, error } = useChunk();

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState<IChunk | null>(null);

  const handleEdit = (chunk: IChunk) => {
    setEditingChunk(chunk);
  };

  const closeEditor = () => {
    setEditingChunk(null);
  }

  // 【修正】: 填上 Loading 狀態的具體 UI
  if (loading) {
    return (
        <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
        </div>
    );
  }

  // 【修正】: 填上 Error 狀態的具體 UI
  if (isError) {
    return <div className="p-6 text-red-500">Error: {(error as Error)?.message}</div>;
  }

  return (
    <div className="p-6">
      <KmChunkToolbar onAddChunk={() => setCreateModalOpen(true)} />

      {data?.chunks?.length > 0 ? (
        <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {data.chunks.map((chunk: IChunk) => (
            <ChunkCard
              key={chunk.chunk_id}
              chunk={chunk}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        // 【【【核心修正】】】: 提供一個合法的 JSX 元件作為 'else' 的回傳值
        <div className="text-center text-muted-foreground mt-8">
          No chunks found. You can add one by clicking the "Add Chunk" button.
        </div>
      )}

      {/* 新增用的彈窗 */}
      <ChunkFormModal
        open={isCreateModalOpen}
        onCancel={() => setCreateModalOpen(false)}
      />

      {/* 編輯用的彈窗 */}
      {editingChunk && (
        <ChunkFormModal
            open={!!editingChunk}
            onCancel={closeEditor}
            editingChunk={editingChunk}
        />
      )}
    </div>
  );
}