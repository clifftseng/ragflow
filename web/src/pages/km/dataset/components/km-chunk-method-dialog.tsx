// 檔案路徑: web/src/pages/km/dataset/components/km-chunk-method-dialog.tsx
// 【【【最終運行版 - 對話框】】】

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { IChangeParser, IParserConfig } from '@/interfaces/database/document';
import { TParserSchema, parserSchema } from './km-form-schema';

import { KmChunkMethodForm } from './km-chunk-method-form'; 
import { useMemo, useEffect } from 'react';
interface IProps {
  visible: boolean;
  hideModal: () => void;
  document: any;
  onOk: (params: IChangeParser) => void;
  loading: boolean;
  parserList: Array<{ value: string; label: string }>;
}

export function KmChunkMethodDialog({ visible, hideModal, document, onOk, loading, parserList }: IProps) {
  const { t } = useTranslation();

  const defaultValues = useMemo(() => ({
    parserId: document.parser_id,
    parserConfig: document.parser_config,
  }), [document]);

  const form = useForm<TParserSchema>({
    resolver: zodResolver(parserSchema),
    defaultValues,
  });

  useEffect(() => {
    if (form.formState.isSubmitting) return; // 正在提交時，暫不顯示舊錯誤
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.error('ZOD VALIDATION FAILED:', JSON.stringify(errors, null, 2));
    }
  }, [form.formState.errors, form.formState.isSubmitting]);



  const onSubmit = (values: TParserSchema) => {
  const { parserId, parserConfig } = values;  
    onOk({
      parser_id: parserId,
      parser_config: parserConfig as IParserConfig,
    });
  };

  return (
    <Dialog open={visible} onOpenChange={hideModal}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('knowledgeDetails.chunkMethod')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <KmChunkMethodForm parserList={parserList} />
            <DialogFooter>
              <Button type="submit" loading={loading}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}