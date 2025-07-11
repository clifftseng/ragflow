// 檔案路徑: web/src/pages/km/dataset/use-km-dataset-table-columns.tsx
// 【【【最終修正版】】】

import { Link, useParams } from 'umi';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Settings, Pencil, Trash, Download } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { IDocument } from '@/interfaces/database/document';
import { DocumentType, RunningStatus as TaskStatus } from '@/constants/knowledge';
import { ReparseIcon } from './ReparseIcon';
import { Badge } from '@/components/ui/badge';
import { FileIcon } from '@/components/icon-font';
import { RunningStatusMap } from '@/pages/dataset/dataset/constant';
import { formatDate } from '@/utils/date';
import { Switch } from '@/components/ui/switch';

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

// 【【【修正 1/2】】】: 在元件的參數解構中，補上 onDownload，以修復 ReferenceError
const KmDatasetActionCell = ({ record, onRerun, onRemove, onShowRenameModal, onShowChunkMethod, onShowMeta, onDownload, onShowDeleteDialog, loading }: IKmDatasetActionCellProps) => {
  const { t } = useTranslation();


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
              {/* 【【【修改 3/3】】】: onClick 直接呼叫從 props 傳入的函式 */}
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

const StatusToggleCell = ({ record, onStatusChange, loading }: { record: IDocument, onStatusChange: (checked: boolean) => void, loading: boolean }) => {
  return (<Switch checked={record.status === '1'} onCheckedChange={onStatusChange} disabled={loading} />);
};

// 【【【修正 2/2】】】: 確保所有 props 都被正確解構和傳遞，此處無需修改程式碼，但其正確性基於第一處修正
export const useKmDatasetTableColumns = (
  { onRerun, onRemove, onDownload, onShowRenameModal, onShowChunkMethod, onShowMeta, onStatusChange, onShowDeleteDialog, isActionLoading, isStatusLoading }:
  {
    onRerun: (docId: string) => void;
    onRemove: (docId: string) => void;
    onDownload: (docId: string, filename: string) => void;
    onShowRenameModal: (doc: IDocument) => void;
    onShowChunkMethod: (doc: IDocument) => void;
    onShowMeta: (doc: IDocument) => void;
    onShowDeleteDialog: (doc: IDocument) => void; // 定義新 prop 的型別
    onStatusChange: (docId: string, status: string) => void;
    isActionLoading: boolean;
    isStatusLoading: boolean;
  }
): ColumnDef<IDocument>[] => {
  const { t } = useTranslation('translation');
  const { id: kb_id } = useParams();

  return useMemo(() => [
    { 
      accessorKey: 'name', 
      header: t('knowledgeDetails.doc'), 
      // 【修改點 1/2】: Docs 欄位加入條件渲染
      cell: ({ row }) => {
        const hasChunks = (row.original.chunk_num ?? 0) > 0;
        const docNameContent = (
          <div className="flex items-center space-x-2">
            <FileIcon name={row.original.name} />
            <span>{row.original.name}</span>
          </div>
        );

        if (hasChunks) {
          return (
            <Link to={`/km/${kb_id}/chunk/${row.original.id}/parsed-result`} className="text-blue-500 hover:underline">
              {docNameContent}
            </Link>
          );
        }
        
        return docNameContent; // 若沒有 chunks，則只顯示文字，不帶連結
      } 
    },
    { accessorKey: 'run', header: t('knowledgeDetails.parsingStatus'), cell: ({ row }) => { const { run } = row.original; const currentStatus = RunningStatusMap[run] ?? { label: 'default.status', color: 'orange' }; return (<Badge variant={currentStatus.color as any}>{t(currentStatus.label)}</Badge>); } },
    { 
      accessorKey: 'chunk_num', 
      header: t('knowledgeDetails.chunkNumber'), 
      // 【修改點 2/2】: Chunk Number 欄位加入條件渲染
      cell: ({ row }) => {
        const chunkNum = row.original.chunk_num ?? 0;
        const hasChunks = chunkNum > 0;

        if (hasChunks) {
          return (
            <Link to={`/km/${kb_id}/chunk/${row.original.id}/parsed-result`} className="capitalize cursor-pointer text-blue-500 hover:underline">
              {chunkNum}
            </Link>
          );
        }

        return <span>{chunkNum}</span>; // 若 chunk 數為 0，則只顯示數字，不帶連結
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
          onRemove={onRemove} // onRemove 雖然沒在 cell 中直接用，但 columns hook 依賴它，故保留
          onDownload={onDownload} 
          onShowRenameModal={onShowRenameModal} 
          onShowChunkMethod={onShowChunkMethod} 
          onShowMeta={onShowMeta}
          onShowDeleteDialog={onShowDeleteDialog} // 傳遞新函式
          loading={isActionLoading} 
        /> 
    },
  ], [t, onRerun, onRemove, onDownload, onShowRenameModal, onShowChunkMethod, onShowMeta, onStatusChange, onShowDeleteDialog, isActionLoading, isStatusLoading, kb_id]);
};