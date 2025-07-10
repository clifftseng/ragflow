// 檔案: web/src/pages/km/chunk/index.tsx
// 【【【最終佈局修正版】】】

import { Outlet, useParams } from 'umi';
import { PageHeader } from '@/components/page-header';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { useFetchKmChunkList } from './hooks';
import { ChunkProvider } from './context';
import { useChunk } from './context';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { IChunk } from '@/interfaces/database/knowledge';
import { ChunkFormModal } from './chunk-form-modal';

// 子元件：頁面標題頭
const KmChunkPageHeader = () => {
  const { navigateToKmDataset } = useNavigatePage();
  const { id: kb_id } = useParams();
  const { data: chunkData, loading: chunkLoading, openCreateModal } = useChunk();
  const documentInfo = chunkData?.documentInfo;

  return (
    <PageHeader
      title="Chunk Management"
      back={navigateToKmDataset(kb_id as string)}
    >
      <div className="flex items-center justify-between w-full">
        {/* 左側的資訊 */}
        <div className="flex-grow min-w-0 ">
          {chunkLoading && <Skeleton className="h-4 w-64 mt-1" />}
          {documentInfo && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              <span className="font-semibold">{documentInfo.name}</span>
              <span className="mx-2">|</span>
              {/* ✨ 核心修正：直接使用渲染列表的長度作為計數 */}
              <span>{chunkData?.chunks?.length ?? 0} Chunks</span>
            </p>
          )}
        </div>

        {/* 右側的按鈕 */}
        <div className="flex-shrink-0">
          <Button type="primary" onClick={openCreateModal}>
            <PlusOutlined /> Add Chunk
          </Button>
        </div>
      </div>
    </PageHeader>
  );
};

// 主元件：頁面佈局 (此部分與上一版相同，但為求完整，一併提供)
export default function KmChunkPage() {
  const hookData = useFetchKmChunkList();

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState<IChunk | null>(null);

  const handleEdit = (chunk: IChunk) => setEditingChunk(chunk);
  const closeEditor = () => setEditingChunk(null);
  const openCreateModal = () => setCreateModalOpen(true);

  const providerValue = {
    ...hookData,
    handleEdit,
    openCreateModal,
  };

  return (
    <ChunkProvider value={providerValue}>
      <section className="flex flex-col h-screen bg-background">
        <KmChunkPageHeader />
        <div className="flex-1 overflow-y-auto">
          {/* ✨ Outlet 會渲染 parsed-result/index.tsx，它的程式碼無需再變動 */}
          <Outlet />
        </div>

        <ChunkFormModal
          open={isCreateModalOpen}
          onCancel={() => setCreateModalOpen(false)}
        />
        {editingChunk && (
          <ChunkFormModal
            open={!!editingChunk}
            onCancel={closeEditor}
            editingChunk={editingChunk}
          />
        )}
      </section>
    </ChunkProvider>
  );
}