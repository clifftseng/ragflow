import { useTranslate } from '@/hooks/common-hooks';
import { camelCase } from 'lodash';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RAGFlowSelect } from '@/components/ui/select';

export const enum DocumentType {
  DeepDOC = 'DeepDOC',
  PlainText = 'Plain Text',
}

export function KmLayoutRecognizeFormField() {
  const form = useFormContext();
  const { t } = useTranslate('knowledgeDetails');

  const options = useMemo(() => {
    return [DocumentType.DeepDOC, DocumentType.PlainText].map((x) => ({
      label: x === DocumentType.PlainText ? t(camelCase(x)) : 'DeepDoc',
      value: x,
    }));
  }, [t]);

  return (
    <FormField
      control={form.control}
      name="parserConfig.layout_recognize"
      render={({ field }) => (
        <FormItem className="items-center space-y-0">
          <div className="flex items-center">
            <FormLabel tooltip={t('layoutRecognizeTip')} className="text-sm text-muted-foreground whitespace-nowrap w-1/4">
              {t('layoutRecognize')}
            </FormLabel>
            <div className="w-3/4">
              <FormControl>
                <RAGFlowSelect {...field} options={options} defaultValue={field.value ?? 'DeepDOC'} />
              </FormControl>
            </div>
          </div>
          <div className="flex pt-1"><div className="w-1/4"></div><FormMessage /></div>
        </FormItem>
      )}
    />
  );
}