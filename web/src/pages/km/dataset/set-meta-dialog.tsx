// 檔案路徑: web/src/pages/km/dataset/set-meta-dialog.tsx
// 【【【最終修正版 - HTML 內容正確渲染】】】

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from 'antd';
import { useEffect } from 'react';
import DOMPurify from 'dompurify'; // 【【【新增】】】: 導入 DOMPurify 用於安全地解析 HTML

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
          <DialogTitle>{t('knowledgeDetails.setMetaData')}</DialogTitle>
          {/* 【【【核心修改】】】: 使用 dangerouslySetInnerHTML 渲染 HTML 字串 */}
          <DialogDescription>
            <span
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(t('knowledgeDetails.documentMetaTips')),
              }}
            />
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
                    <Input.TextArea
                      rows={10}
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