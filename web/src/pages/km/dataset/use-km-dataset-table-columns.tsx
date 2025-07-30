// 檔案路徑: web/src/pages/km/dataset/use-km-dataset-table-columns.tsx
// 【【【最終精煉版】】】

import { Link, useParams, useLocation } from 'umi'; // 導入 Link, useParams 和 useLocation
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Settings, Pencil, Trash, Download } from 'lucide-react';
import { IDocument } from '@/interfaces/database/document';
import { DocumentType, RunningStatus as TaskStatus } from '@/constants/knowledge';
import { ReparseIcon } from './ReparseIcon';
import { Badge } from '@/components/ui/badge';
import { FileIcon } from '@/components/icon-font';
import { RunningStatusMap } from '@/pages/dataset/dataset/constant';
import { formatDate } from '@/utils/date';
import { Switch } from '@/components/ui/switch';

// IKmDatasetActionCellProps 介面定義 (保持不變)
interface IKmDatasetActionCellProps {
  record: IDocument;
  onRerun: (docId: string) => void;
  onShowRenameModal: (doc: IDocument) => void;
  onShowChunkMethod: (doc: IDocument) => void;
  onShowMeta: (doc: IDocument) => void;
  onDownload: (docId: string, filename: string) => void;
  onShowDeleteDialog: (doc: IDocument) => void;
  loading: boolean;
}

// KmDatasetActionCell 元件 (保持不變)
const KmDatasetActionCell = ({ record, onRerun, onShowRenameModal, onShowChunkMethod, onShowMeta, onDownload, onShowDeleteDialog, loading }: IKmDatasetActionCellProps) => {
    const { t } = useTranslation();
    // ... 此元件內部程式碼維持原樣 ...
    return (
     <>
       <TooltipProvider>
         <div className="flex items-center space-x-1">
           <DropdownMenu>
             <Tooltip>
               <TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger></TooltipTrigger>
               <TooltipContent><p>{t('knowledgeDetails.chunkMethod')}</p></TooltipContent>
             </Tooltip>
             <DropdownMenuContent>
               <DropdownMenuItem onClick={() => onShowChunkMethod(record)}>{t('knowledgeDetails.chunkMethod')}</DropdownMenuItem>
               <DropdownMenuItem onClick={() => onShowMeta(record)}>{t('knowledgeDetails.setMetaData')}</DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
          
           <Tooltip>
             <TooltipTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0" disabled={record.run === TaskStatus.RUNNING || loading} onClick={() => onRerun(record.id)}><ReparseIcon /></Button></TooltipTrigger>
             <TooltipContent><p>{t('knowledgeDetails.run')}</p></TooltipContent>
           </Tooltip>
           <Tooltip>
             <TooltipTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0" disabled={loading} onClick={() => onShowRenameModal(record)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger>
             <TooltipContent><p>{t('common.rename')}</p></TooltipContent>
           </Tooltip>
           <Tooltip>
             <TooltipTrigger asChild>
               <Button variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" disabled={loading} onClick={() => onShowDeleteDialog(record)}>
                 <Trash className="h-4 w-4" />
               </Button>
             </TooltipTrigger>
             <TooltipContent><p>{t('common.delete')}</p></TooltipContent>
           </Tooltip>
           <Tooltip>
             <TooltipTrigger asChild>
               <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading || record.type === DocumentType.Virtual} onClick={() => onDownload(record.id, record.name)}>
                 <Download className="h-4 w-4" />
               </Button>
             </TooltipTrigger>
             <TooltipContent><p>{t('common.download')}</p></TooltipContent>
           </Tooltip>
         </div>
       </TooltipProvider>
     </>
   );
};

// StatusToggleCell 元件 (保持不變)
const StatusToggleCell = ({ record, onStatusChange, loading }: { record: IDocument, onStatusChange: (checked: boolean) => void, loading: boolean }) => {
    return (<Switch checked={record.status === '1'} onCheckedChange={onStatusChange} disabled={loading} />);
};

// useKmDatasetTableColumns Hook (精煉後的版本)
export const useKmDatasetTableColumns = (
    { onRerun, onDownload, onShowRenameModal, onShowChunkMethod, onShowMeta, onStatusChange, onShowDeleteDialog, isActionLoading, isStatusLoading }:
    {
        onRerun: (docId: string) => void;
        onDownload: (docId: string, filename: string) => void;
        onShowRenameModal: (doc: IDocument) => void;
        onShowChunkMethod: (doc: IDocument) => void;
        onShowMeta: (doc: IDocument) => void;
        onShowDeleteDialog: (doc: IDocument) => void;
        onStatusChange: (docId: string, status: string) => void;
        isActionLoading: boolean;
        isStatusLoading: boolean;
    }
): ColumnDef<IDocument>[] => {
    const { t } = useTranslation('translation');
    const { id: kb_id } = useParams();
    // ✅ 只保留最關鍵的 useLocation
    const location = useLocation();

    return useMemo(() => [
        {
            accessorKey: 'name',
            header: t('knowledgeDetails.doc'),
            cell: ({ row }) => {
                const hasChunks = (row.original.chunk_num ?? 0) > 0;
                const docNameContent = (
                    <div className="flex items-center space-x-2">
                        <FileIcon name={row.original.name} />
                        <span>{row.original.name}</span>
                    </div>
                );

                if (hasChunks) {
                    // ✅ 這就是最正確、最穩健的寫法
                    const destination = `/km/${kb_id}/chunk/${row.original.id}/parsed-result${location.search}`;
                    return (
                        <Link to={destination} className="text-blue-500 hover:underline">
                            {docNameContent}
                        </Link>
                    );
                }
                
                return docNameContent;
            }
        },
        { 
            accessorKey: 'run', 
            header: t('knowledgeDetails.parsingStatus'), 
            cell: ({ row }) => { 
                const { run } = row.original; 
                const currentStatus = RunningStatusMap[run] ?? { label: 'default.status', color: 'orange' }; 
                return (<Badge variant={currentStatus.color as any}>{t(currentStatus.label)}</Badge>); 
            } 
        },
        {
            accessorKey: 'chunk_num',
            header: t('knowledgeDetails.chunkNumber'),
            cell: ({ row }) => {
                const chunkNum = row.original.chunk_num ?? 0;
                const hasChunks = chunkNum > 0;

                if (hasChunks) {
                    // ✅ 同樣應用於此處的連結
                    const destination = `/km/${kb_id}/chunk/${row.original.id}/parsed-result${location.search}`;
                    return (
                        <Link to={destination} className="capitalize cursor-pointer text-blue-500 hover:underline">
                            {chunkNum}
                        </Link>
                    );
                }

                return <span>{chunkNum}</span>;
            }
        },
        { accessorKey: 'create_time', header: t('knowledgeDetails.uploadDate'), cell: ({ row }) => formatDate(row.original.create_time) },
        { id: 'status', header: t('knowledgeDetails.enabled'), cell: ({ row }) => <StatusToggleCell record={row.original} onStatusChange={(checked) => onStatusChange(row.original.id, checked ? '1' : '0')} loading={isStatusLoading} /> },
        {
            id: 'actions',
            header: t('knowledgeDetails.action'),
            cell: ({ row }) =>
                <KmDatasetActionCell
                    record={row.original}
                    onRerun={onRerun}
                    onDownload={onDownload}
                    onShowRenameModal={onShowRenameModal}
                    onShowChunkMethod={onShowChunkMethod}
                    onShowMeta={onShowMeta}
                    onShowDeleteDialog={onShowDeleteDialog}
                    loading={isActionLoading}
                />
        },
    // ✅ 依賴項也保持簡潔
    ], [t, onRerun, onDownload, onShowRenameModal, onShowChunkMethod, onShowMeta, onStatusChange, onShowDeleteDialog, isActionLoading, isStatusLoading, kb_id, location.search]);
};