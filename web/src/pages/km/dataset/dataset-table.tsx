// 檔案路徑: web/src/pages/km/dataset/dataset-table.tsx
// 【【【最終修正版：徹底移除勾選功能】】】

import { ColumnFiltersState, SortingState, VisibilityState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IDocument, IParserConfig } from '@/interfaces/database/document';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'umi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import kbService from '@/services/knowledge-service';
import { message, Modal } from 'antd';
import { useKmDatasetTableColumns } from './use-km-dataset-table-columns';
import { useDownloadKmDocument } from './use-download-km-document'; // 【【【修改 1/4】】】: 導入新建的下載 Hook
import { KmChunkMethodDialog } from './components/km-chunk-method-dialog';
import { SetMetaDialog } from './set-meta-dialog';
import { useFetchKmKnowledgeBaseConfiguration } from '../km-hooks';
import { RenameModal } from './rename-modal';
import { KmPagination } from './km-pagination';



interface ConfirmDeleteDialogProps {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  title: string;
  content: string;
  loading: boolean;
}

const ConfirmDeleteDialog = ({ visible, onOk, onCancel, title, content, loading }: ConfirmDeleteDialogProps) => {
  const { t } = useTranslation(); // <--- ✨ 步驟 1: 在元件內部取得 t 函式

  return (
    <Modal
      title={title}
      open={visible}       // 在 antd v5 中，使用 open 控制顯示
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={t('common.ok')} 
      cancelText={t('common.cancel')} 
      okButtonProps={{ danger: true }} // 讓確認按鈕顯示為紅色，以示警告
      centered
    >
      <p>{content}</p>
    </Modal>
  );
};


// 1. 操作邏輯 (重新解析/刪除) - 維持不變
const useOperateKmDocument = () => {
    // ... 內部程式碼維持原樣 ...
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id: knowledgeBaseId } = useParams();
  const invalidateDocumentList = useCallback(() => { queryClient.invalidateQueries({ queryKey: ['kmDocumentList', knowledgeBaseId] }); }, [knowledgeBaseId, queryClient]);

  const runMutation = useMutation({
    mutationFn: async ({ doc_ids, run_type }: { doc_ids: string[]; run_type: 'rerun' | 'stop' }) => { const { data } = await kbService.km_document_run({ doc_ids, run_type }); return data; },
    onSuccess: () => { message.success(t('message.operated')); invalidateDocumentList(); },
    onError: (error: any) => message.error(error.message || t('message.operateError')),
  });

  const removeMutation = useMutation({
    mutationFn: async (doc_ids: string[]) => { console.log('[DEBUG] removeMutation.mutationFn: Firing API call with doc_ids:', doc_ids);
      const { data } = await kbService.km_document_rm({ doc_ids }); return data; },
    onSuccess: () => { console.log('[DEBUG] removeMutation.onSuccess: API call successful.'); message.success(t('message.deleted')); invalidateDocumentList(); },
    onError: (error: any) => {
      // 【DEBUG 2/3】: 確認 API 是否回傳錯誤
      console.error('[DEBUG] removeMutation.onError:', error);
      message.error(error.message || t('message.deleteError'));
    },
  });

  const onRerun = useCallback((docId: string) => runMutation.mutate({ doc_ids: [docId], run_type: 'rerun' }), [runMutation]);
  const onRemove = useCallback((docId: string) => {
    // 【DEBUG 3/3】: 確認 onRemove 函式本身是否被呼叫，以及 docId 是否正確
    console.log('[DEBUG] useOperateKmDocument.onRemove: Called with docId:', docId);
    removeMutation.mutate([docId]);
  }, [removeMutation]);

  return { onRerun, onRemove, loading: runMutation.isPending || removeMutation.isPending };
};

// 2. 重新命名邏輯 - 維持不變
const useRenameKmDocument = () => {
    // ... 內部程式碼維持原樣 ...
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id: knowledgeBaseId } = useParams();
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<IDocument | null>(null);
  const renameMutation = useMutation({
    mutationFn: async (values: {name: string}) => { if (!selectedDocument) return; const { data } = await kbService.km_document_rename({ doc_id: selectedDocument.id, name: values.name }); return data; },
    onSuccess: (res: any) => {
      if (res?.code === 0) {
        message.success(t('message.renamed'));
        queryClient.invalidateQueries({ queryKey: ['kmDocumentList', knowledgeBaseId] });
        hideRenameModal();
      } else { message.error(res?.msg || t('message.renameError')); }
    },
    onError: (error: any) => message.error(error.message || t('message.renameError')),
  });
  const onRenameOk = (values: {name: string}) => { renameMutation.mutate(values); };
  const showRenameModal = (doc: IDocument) => { setSelectedDocument(doc); setRenameModalVisible(true); };
  const hideRenameModal = () => { setRenameModalVisible(false); setSelectedDocument(null); };
  return { loading: renameMutation.isPending, onRenameOk, renameModalVisible, showRenameModal, hideRenameModal, selectedDocument };
};

// 3. 狀態變更邏輯 - 維持不變
const useChangeKmDocumentStatus = () => {
    // ... 內部程式碼維持原樣 ...
  const queryClient = useQueryClient();
  const { id: knowledgeBaseId } = useParams();
  const { t } = useTranslation();
  const queryKey = useMemo(() => ['kmDocumentList', knowledgeBaseId], [knowledgeBaseId]);
  const mutation = useMutation({
    mutationFn: async ({ doc_id, status }: { doc_id: string; status: string }) => {
      const { data } = await kbService.km_document_change_status({ doc_id, status });
      if (data?.code !== 0) { throw new Error(data.msg || t('message.operateError')); }
      return data;
    },
    onMutate: async (newDocument) => {
      await queryClient.cancelQueries({ queryKey });
      const previousDocuments = queryClient.getQueryData<any>(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, docs: old.docs.map((doc: IDocument) => doc.id === newDocument.doc_id ? { ...doc, status: newDocument.status } : doc) };
      });
      return { previousDocuments };
    },
    onError: (err: Error, newDocument, context) => {
      message.error(err.message);
      if (context?.previousDocuments) { queryClient.setQueryData(queryKey, context.previousDocuments); }
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });
  return mutation;
};

// 4. 設定邏輯 - 維持不變
const useDocumentSettings = () => {
    // ... 內部程式碼維持原樣 ...
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id: knowledgeBaseId } = useParams();
  const [chunkMethodVisible, setChunkMethodVisible] = useState(false);
  const [metaVisible, setMetaVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<IDocument | null>(null);

  const changeParserMutation = useMutation({
    mutationFn: async (params: { parser_id: string; parser_config: IParserConfig }) => {
      if (!selectedDocument) return;
      const { data } = await kbService.km_document_change_parser({ doc_id: selectedDocument.id, ...params });
      return data;
    },
    onSuccess: (data) => {
      if (data?.code === 0) {
        message.success(t('message.modified'));
        queryClient.invalidateQueries({ queryKey: ['kmDocumentList', knowledgeBaseId] });
        setChunkMethodVisible(false);
      } else { message.error(data.msg || t('message.operateError')) }
    },
    onError: (error: any) => message.error(error.message || t('message.operateError')),
  });
 
  const setMetaMutation = useMutation({
    mutationFn: async (params: { meta_as_keywords: boolean; meta: Record<string, any> }) => {
      if (!selectedDocument) return;
      const { data } = await kbService.km_document_set_meta({ doc_id: selectedDocument.id, ...params });
      return data;
    },
    onSuccess: (data) => {
      if (data?.code === 0) {
        message.success(t('message.modified'));
        queryClient.invalidateQueries({ queryKey: ['kmDocumentList', knowledgeBaseId] });
        setMetaVisible(false);
      } else { message.error(data.msg || t('message.operateError')) }
    },
    onError: (error: any) => message.error(error.message || t('message.operateError')),
  });

  const showChunkMethod = (doc: IDocument) => { setSelectedDocument(doc); setChunkMethodVisible(true); };
  const hideChunkMethod = () => { setSelectedDocument(null); setChunkMethodVisible(false); };
  const showMeta = (doc: IDocument) => { setSelectedDocument(doc); setMetaVisible(true); };
  const hideMeta = () => { setSelectedDocument(null); setMetaVisible(false); };

  return {
    selectedDocument,
    chunkMethodVisible, showChunkMethod, hideChunkMethod, onChunkMethodOk: changeParserMutation.mutate, chunkMethodLoading: changeParserMutation.isPending,
    metaVisible, showMeta, hideMeta, onMetaOk: setMetaMutation.mutate, metaLoading: setMetaMutation.isPending
  };
};

// 【【【修改 1/3】】】: DataTableProps 介面不再需要 rowSelection 和 setRowSelection
interface DataTableProps {
 loading: boolean;
 documents: IDocument[];
 pagination: { current: number; pageSize: number; total: number };
 setPagination: (pagination: { current: number; pageSize: number }) => void;
}

// 主表格元件
export function DatasetTable({ documents, pagination, setPagination }: DataTableProps) {
 const { t } = useTranslation(); // <--- ✨ 請在這裡加上這一行
 const [sorting, setSorting] = useState<SortingState>([]);
 const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
 const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

 const { onRerun, onRemove, loading: actionLoading } = useOperateKmDocument();
 const { loading: renameLoading, onRenameOk, renameModalVisible, showRenameModal, hideRenameModal, selectedDocument: docForRename } = useRenameKmDocument();
 const changeStatusMutation = useChangeKmDocumentStatus();
 const {
  chunkMethodVisible, hideChunkMethod, onChunkMethodOk, chunkMethodLoading, selectedDocument: docForChunk, showChunkMethod,
  metaVisible, hideMeta, onMetaOk, metaLoading, selectedDocument: docForMeta, showMeta
 } = useDocumentSettings();
 const { download: onDownload, loading: downloadLoading } = useDownloadKmDocument(); // 【【【修改 2/4】】】: 使用下載 Hook

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [docForDeletion, setDocForDeletion] = useState<IDocument | null>(null);

  const showDeleteDialog = (doc: IDocument) => {
    setDocForDeletion(doc);
    setDeleteDialogVisible(true);
  };

  const hideDeleteDialog = () => {
    setDocForDeletion(null);
    setDeleteDialogVisible(false);
  };

  const handleConfirmDelete = () => {
    if (docForDeletion) {
      onRemove(docForDeletion.id);
      hideDeleteDialog();
    }
  };


 // 【【【修改 3/4】】】: 將下載的 loading 狀態加入到 isActionLoading 中
  const isActionLoading = actionLoading || renameLoading || chunkMethodLoading || metaLoading || downloadLoading;
  const isStatusLoading = changeStatusMutation.isPending;



 // 【【【修改 2/3】】】: useKmDatasetTableColumns 不再需要 isActionLoading 和 isStatusLoading 之外的 props
  // 注意：我們仍然傳遞這些 loading 狀態，因為單一檔案的操作按鈕可能需要它們來禁用自己
 const columns = useKmDatasetTableColumns({
  onRerun,
  onRemove,
  onDownload,
  onShowRenameModal: showRenameModal,
  onShowChunkMethod: showChunkMethod,
  onShowMeta: showMeta,
  onShowDeleteDialog: showDeleteDialog, // 傳遞打開對話框的函式
  onStatusChange: (doc_id, status) => changeStatusMutation.mutate({ doc_id, status }),
  isActionLoading: isActionLoading,
  isStatusLoading: isStatusLoading,
 });

 const { data: kbDetail } = useFetchKmKnowledgeBaseConfiguration();
 const parserList = useMemo(() => {
  const parserIds: Array<string> = kbDetail?.parser_ids?.split(',') ?? [];
  return parserIds.map((x) => {
   const arr = x.split(':');
   return { value: arr[0], label: arr[1] };
  });
 }, [kbDetail]);

 const table = useReactTable({
  data: documents,
  columns,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onColumnVisibilityChange: setColumnVisibility,
  // 【【【修改 3/3】】】: 移除 onRowSelectionChange 和 state 中的 rowSelection
  // onRowSelectionChange: setRowSelection,
  state: { sorting, columnFilters, columnVisibility },
  pageCount: Math.ceil(pagination.total / pagination.pageSize),
  manualPagination: true,
 });

 return (
  <div className="w-full">
   <div className="rounded-md border">
    <Table>
          <TableHeader>{table.getHeaderGroups().map((headerGroup) => (<TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => (<TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
          {/* data-state 屬性不再需要，因為沒有 selected 狀態了 */}
          <TableBody>{table.getRowModel().rows?.length ? (table.getRowModel().rows.map((row) => (<TableRow key={row.id}>{row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>))) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>)}</TableBody>
    </Table>
   </div>
   <div className="flex items-center justify-end space-x-2 py-4">
    <KmPagination {...pagination} onChange={setPagination} />
   </div>
  
   <RenameModal visible={renameModalVisible} onOk={onRenameOk} onCancel={hideRenameModal} loading={renameLoading} document={docForRename} />
   {chunkMethodVisible && docForChunk && (<KmChunkMethodDialog loading={chunkMethodLoading} onOk={onChunkMethodOk} parserList={parserList} document={docForChunk} visible={chunkMethodVisible} hideModal={hideChunkMethod} />)}
   {metaVisible && docForMeta && (<SetMetaDialog loading={metaLoading} onOk={onMetaOk} document={docForMeta} visible={metaVisible} hideModal={hideMeta} />)}
   {docForDeletion && (
      <ConfirmDeleteDialog
        visible={deleteDialogVisible}
        onOk={handleConfirmDelete}
        onCancel={hideDeleteDialog}
        title={t('common.delete')}
        content={t('common.deleteModalTitle', { name: docForDeletion.name })}
        loading={actionLoading}
      />
    )}
  </div>
 );
}