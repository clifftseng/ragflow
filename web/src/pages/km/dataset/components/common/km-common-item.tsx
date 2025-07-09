import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RAGFlowSelect } from '@/components/ui/select';
import { useTranslate } from '@/hooks/common-hooks';
import { useFormContext } from 'react-hook-form';

// 我們將在這裡定義一個 props 接口，而不是使用內部 hook
interface IKmChunkMethodItemProps {
    parserList: Array<{ value: string; label: string }>;
}

export function KmChunkMethodItem({ parserList }: IKmChunkMethodItemProps) {
  const { t } = useTranslate('knowledgeConfiguration');
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={'parserId'} // 注意：我們表單的欄位名是 parserId
      render={({ field }) => (
        <FormItem className="items-center space-y-0">
          <div className="flex items-center">
            <FormLabel tooltip={t('chunkMethodTip')} className="text-sm text-muted-foreground whitespace-nowrap w-1/4">
              {t('chunkMethod')}
            </FormLabel>
            <div className="w-3/4">
              <FormControl>
                <RAGFlowSelect
                  {...field}
                  options={parserList} // 使用從 props 傳入的列表
                  placeholder={t('chunkMethodPlaceholder')}
                />
              </FormControl>
            </div>
          </div>
          <div className="flex pt-1"><div className="w-1/4"></div><FormMessage /></div>
        </FormItem>
      )}
    />
  );
}