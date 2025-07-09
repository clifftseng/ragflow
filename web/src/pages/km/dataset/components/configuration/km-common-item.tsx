import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RAGFlowSelect } from '@/components/ui/select';
import { useTranslate } from '@/hooks/common-hooks';
import { useFormContext } from 'react-hook-form';

interface IKmChunkMethodItemProps {
    parserList: Array<{ value: string; label: string }>;
}

export function KmChunkMethodItem({ parserList }: IKmChunkMethodItemProps) {
  const { t } = useTranslate('knowledgeConfiguration');
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={'parserId'}
      render={({ field }) => (
        <FormItem className="items-center space-y-0">
          <div className="flex items-center">
            <FormLabel tooltip={t('chunkMethodTip')} className="text-sm text-muted-foreground whitespace-nowrap w-1/4">
              {t('chunkMethod')}
            </FormLabel>
            <div className="w-3/4 ">
              <FormControl>
                <RAGFlowSelect
                  {...field}
                  options={parserList}
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

// EmbeddingModelItem has been removed as it requires authenticated hooks.
// We will omit it from the UI for now.