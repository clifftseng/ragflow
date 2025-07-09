import { useTranslate } from '@/hooks/common-hooks';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

export function KmExcelToHtmlFormField() {
  const form = useFormContext();
  const { t } = useTranslate('knowledgeDetails');

  return (
    <FormField
      control={form.control}
      name="parserConfig.html4excel"
      render={({ field }) => (
        <FormItem defaultChecked={false} className="items-center space-y-0">
          <div className="flex items-center">
            <FormLabel tooltip={t('html4excelTip')} className="text-sm text-muted-foreground whitespace-nowrap w-1/4">
              {t('html4excel')}
            </FormLabel>
            <div className="w-3/4">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </div>
          </div>
          <div className="flex pt-1"><div className="w-1/4"></div><FormMessage /></div>
        </FormItem>
      )}
    />
  );
}