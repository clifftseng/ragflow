// 檔案路徑: web/src/pages/km/dataset/set-meta-dialog.tsx
// 【【【最終修正版】】】

import {
  Dialog,
  DialogContent,
  DialogDescription, // 【【【修改 1/3】】】: 導入 DialogDescription
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IModalProps } from '@/interfaces/common';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { IDocument } from '@/interfaces/database/document';
import Editor, { loader } from '@monaco-editor/react';
import { useEffect } from 'react';

// 【【【修改 2/3】】】: 更改 Monaco Editor 的資源路徑，從本地相對路徑改為使用 CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs',
  },
});

export function SetMetaDialog({
  hideModal,
  onOk,
  loading,
  document,
  visible,
}: IModalProps<any> & { document?: IDocument; visible: boolean }) {
  const { t } = useTranslation();

  const FormSchema = z.object({
    meta: z.string().refine(
      (value) => {
        try {
          JSON.parse(value);
          return true;
        } catch (error) {
          return false;
        }
      },
      { message: t('knowledgeDetails.pleaseInputJson') },
    ),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      meta: JSON.stringify(document?.meta_fields?.__meta__ ?? {}, null, 2),
    },
  });

  useEffect(() => {
    form.reset({
      meta: JSON.stringify(document?.meta_fields?.__meta__ ?? {}, null, 2),
    });
  }, [document, form]);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const ret = await onOk?.({ meta: JSON.parse(data.meta) });
    if (ret?.code === 0) {
      hideModal?.();
    }
  }

  return (
    <Dialog open={visible} onOpenChange={hideModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('knowledgeDetails.setMetadata')}</DialogTitle>
          {/* 【【【修改 3/3】】】: 增加 DialogDescription 以修正無障礙警告 */}
          <DialogDescription>
            {t('knowledgeDetails.documentMetaTips')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="meta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('knowledgeDetails.metaData')}</FormLabel>
                  <FormControl>
                    <Editor
                      height={200}
                      defaultLanguage="json"
                      theme="vs-dark"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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