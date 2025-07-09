// 檔案路徑: web/src/pages/km/dataset/index.tsx
// 版本：移除批次操作功能

import '@/global.less';
// import { BulkOperateBar } from '@/components/bulk-operate-bar'; // 已移除
import { FileUploadDialog } from '@/components/file-upload-dialog';
import { RenameDialog } from '@/components/rename-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// import { useRowSelection } from '@/hooks/logic-hooks/use-row-selection'; // 已移除
import { useFetchKmDocumentList } from '../km-hooks';

import { Search, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DatasetTable } from './dataset-table';
// import { useBulkOperateDataset } from './use-bulk-operate-dataset'; // 已移除
import { useCreateEmptyDocument } from './use-create-empty-document';
import { useHandleUploadDocument } from './use-upload-document';

export default function Dataset() {
 const { t } = useTranslation();
 const {
  documentUploadVisible,
  hideDocumentUploadModal,
  showDocumentUploadModal,
  onDocumentUploadOk,
  documentUploadLoading,
 } = useHandleUploadDocument();

 const {
  searchString,
  documents,
  pagination,
  handleInputChange,
  setPagination,
  loading,
 } = useFetchKmDocumentList();

 const {
  createLoading,
  onCreateOk,
  createVisible,
  hideCreateModal,
  showCreateModal,
 } = useCreateEmptyDocument();

 // 【【【修改 1/2】】】: 以下兩個 Hooks 已被移除
 // const { rowSelection, rowSelectionIsEmpty, setRowSelection, selectedCount } =
 //  useRowSelection();

 // const { list } = useBulkOperateDataset({
 //  documents,
 //  rowSelection,
 //  setRowSelection,
 // });

 return (
  <section className="p-5">
   <div className="flex items-center justify-between h-16 mb-4">
    <div className="items-start">
     <div className="pb-1 text-lg font-semibold">Dataset</div>
     <div className="text-sm text-text-sub-title-invert">
      Please wait for your files to finish parsing before starting an
      AI-powered chat.
     </div>
    </div>
    <div className="flex items-center space-x-2">
     <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <Input
       className="pl-9 w-56"
       placeholder="Search by name"
       value={searchString}
       onChange={handleInputChange}
       onKeyDown={(e) => {
        if (e.key === 'Enter') handleInputChange(e);
       }}
      />
     </div>
     <DropdownMenu>
      <DropdownMenuTrigger asChild>
       <Button size={'sm'} variant="outline">
        <Upload />
        {t('knowledgeDetails.addFile')}
       </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
       <DropdownMenuItem onClick={showDocumentUploadModal}>
        {t('fileManager.uploadFile')}
       </DropdownMenuItem>
       <DropdownMenuSeparator />
       <DropdownMenuItem onClick={showCreateModal}>
        {t('fileManager.newFolder')}
       </DropdownMenuItem>
      </DropdownMenuContent>
     </DropdownMenu>
    </div>
   </div>

   { /* 【【【修改 2/2】】】: 批次操作列的渲染邏輯已被完全移除 */ }
   {/* {rowSelectionIsEmpty || (
    <BulkOperateBar list={list} count={selectedCount}></BulkOperateBar>
   )} */}
   <DatasetTable
    documents={documents}
    pagination={pagination}
    setPagination={setPagination}
      // rowSelection 和 setRowSelection 已被移除
    loading={loading}
   ></DatasetTable>
   {documentUploadVisible && (
    <FileUploadDialog
     hideModal={hideDocumentUploadModal}
     onOk={onDocumentUploadOk}
     loading={documentUploadLoading}
    ></FileUploadDialog>
   )}
   {createVisible && (
    <RenameDialog
     hideModal={hideCreateModal}
     onOk={onCreateOk}
     loading={createLoading}
     title={'File Name'}
    ></RenameDialog>
   )}
  </section>
 );
}