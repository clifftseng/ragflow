// 檔案路徑: tb/ragflow/web/src/pages/km/dataset/km-dataset-action-cell.tsx
// 【【【最終修正版】】】

import { MoreHorizontal, Power, PowerOff, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { IDocument } from '@/interfaces/database/document';
import { useOperateKmDocument } from './use-operate-km-document';
import { useSetModalState as useModal } from '@/hooks/common-hooks';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { RunningStatus as TaskStatus } from '@/constants/knowledge';

interface IProps {
  record: IDocument;
}

const KmDatasetActionCell = ({ record }: IProps) => {
  const { t } = useTranslation();
  const { onRerun, onCancel, onRemove, rerunLoading, removeLoading } =
    useOperateKmDocument();
  const {
    visible: removeModalVisible,
    showModal: showRemoveModal,
    hideModal: hideRemoveModal,
  } = useModal();

  const loading = rerunLoading || removeLoading;

  const handleRemove = () => {
    onRemove(record.id);
    hideRemoveModal();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={record.run === TaskStatus.RUNNING}
            onClick={() => onRerun(record.id)}
          >
            <Power className="mr-2 h-4 w-4" />
            <span>{t('knowledgeDetails.run')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={record.run !== TaskStatus.RUNNING}
            onClick={() => onCancel(record.id)}
          >
            <PowerOff className="mr-2 h-4 w-4" />
            <span>{t('common.stop')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={showRemoveModal}>
            <Trash className="mr-2 h-4 w-4" />
            <span>{t('common.delete')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDeleteDialog
        visible={removeModalVisible}
        onOk={handleRemove}
        onCancel={hideRemoveModal}
        title={t('common.ok')}
        content={t('chunk.deleteSelected', { name: record.name })}
        loading={removeLoading}
      />
    </>
  );
};

export default KmDatasetActionCell;