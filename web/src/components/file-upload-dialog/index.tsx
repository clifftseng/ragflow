import { ButtonLoading } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IModalProps } from '@/interfaces/common';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUploader } from '../file-uploader';
import { FileMimeType } from '@/constants/common';

type UploaderTabsProps = {
  setFiles: Dispatch<SetStateAction<File[]>>;
};

export function UploaderTabs({ setFiles }: UploaderTabsProps) {
  const { t } = useTranslation();

  const acceptedMimeTypes = Object.values(FileMimeType).reduce(
    (acc, mimeType) => {
      // FileMimeType 是一個 enum，它的值就是我們需要的字串
      acc[mimeType] = [];
      return acc;
    },
    {} as Record<string, string[]>,
  );


  return (
    <Tabs defaultValue="account">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="account">{t('fileManager.local')}</TabsTrigger>
        <TabsTrigger value="password">{t('fileManager.s3')}</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <FileUploader
          maxFileCount={8}
          maxSize={100 * 1024 * 1024}
          onValueChange={setFiles}
          accept={{ '*': [] }}
          //accept={acceptedMimeTypes}
        />
      </TabsContent>
      <TabsContent value="password">{t('common.comingSoon')}</TabsContent>
    </Tabs>
  );
}

export function FileUploadDialog({
  hideModal,
  onOk,
  loading,
}: IModalProps<File[]>) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);

  const handleOk = useCallback(() => {
    onOk?.(files);
  }, [files, onOk]);

  return (
    <Dialog open onOpenChange={hideModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('fileManager.uploadFile')}</DialogTitle>
        </DialogHeader>
        <UploaderTabs setFiles={setFiles}></UploaderTabs>
        <DialogFooter>
          <ButtonLoading type="submit" onClick={handleOk} loading={loading}>
            {t('common.save')}
          </ButtonLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
