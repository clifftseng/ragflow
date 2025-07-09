// 檔案: web/src/pages/km/chunk/index.tsx
// 【【【請覆蓋為以下內容】】】
import { Outlet, useParams } from 'umi';
import { PageHeader } from '@/components/page-header';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { useFetchKmChunkList } from './hooks';
import { ChunkProvider } from './context';
import { DocumentPreviewPanel } from './document-preview-panel';

export default function KmChunkPage() {
  const { navigateToKmDataset } = useNavigatePage();
  const { id: kb_id } = useParams();
  const hookData = useFetchKmChunkList();

  return (
    <ChunkProvider value={hookData}>
      <section className="flex flex-col h-screen bg-background">
        <PageHeader title="Chunk Management" back={navigateToKmDataset(kb_id as string)} />
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area (Left) */}
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
          {/* Right Sidebar */}
          <aside className="w-80 border-l bg-slate-50 dark:bg-slate-900 overflow-y-auto">
            <DocumentPreviewPanel />
          </aside>
        </div>
      </section>
    </ChunkProvider>
  );
}