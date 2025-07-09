// 檔案路徑: web/src/pages/km/dataset/components/km-chunk-method-form.tsx
// 【【【最終運行版 - 總指揮】】】

import { useFormContext, useWatch } from 'react-hook-form';
import { DocumentParserType } from '@/constants/knowledge';
import { useMemo } from 'react';
import { KmChunkMethodItem } from './common/km-common-item';
import { KmNaiveConfiguration } from './configuration/km-naive';
import { KmTableConfiguration } from './configuration/km-table';
import { KmPaperConfiguration } from './configuration/km-paper';
import { KmBookConfiguration } from './configuration/km-book';
import { KmLawsConfiguration } from './configuration/km-laws';
import { KmPresentationConfiguration } from './configuration/km-presentation';
import { KmManualConfiguration } from './configuration/km-manual';
import { KmOneConfiguration } from './configuration/km-one';
import { KmQAConfiguration } from './configuration/km-qa';
import { KmResumeConfiguration } from './configuration/km-resume';
import { KmAudioConfiguration } from './configuration/km-audio';
import { KmEmailConfiguration } from './configuration/km-email';
import { KmPictureConfiguration } from './configuration/km-picture';
import { KmTagConfiguration } from './configuration/km-tag';
import { KmKnowledgeGraphConfiguration } from './configuration/km-knowledge-graph';
import RaptorFormFields, { showRaptorParseConfiguration } from '@/components/parse-configuration/raptor-form-fields';
import GraphRagItems, { showGraphRagItems } from '@/components/parse-configuration/graph-rag-form-fields';

const KmConfigurationComponentMap = {
  [DocumentParserType.Naive]: KmNaiveConfiguration,
  [DocumentParserType.Table]: KmTableConfiguration,
  [DocumentParserType.Paper]: KmPaperConfiguration,
  [DocumentParserType.Book]: KmBookConfiguration,
  [DocumentParserType.Laws]: KmLawsConfiguration,
  [DocumentParserType.Presentation]: KmPresentationConfiguration,
  [DocumentParserType.Manual]: KmManualConfiguration,
  [DocumentParserType.One]: KmOneConfiguration,
  [DocumentParserType.Qa]: KmQAConfiguration,
  [DocumentParserType.Resume]: KmResumeConfiguration,
  [DocumentParserType.Audio]: KmAudioConfiguration,
  [DocumentParserType.Email]: KmEmailConfiguration,
  [DocumentParserType.Picture]: KmPictureConfiguration,
  [DocumentParserType.Tag]: KmTagConfiguration,
  [DocumentParserType.KnowledgeGraph]: KmKnowledgeGraphConfiguration,
};

interface IKmChunkMethodFormProps {
    parserList: Array<{ value: string; label: string }>;
}

export function KmChunkMethodForm({ parserList }: IKmChunkMethodFormProps) {
  const form = useFormContext();
  const finalParserId: DocumentParserType = useWatch({
    control: form.control,
    name: 'parserId',
  });

  const ConfigurationComponent = useMemo(() => {
    return KmConfigurationComponentMap[finalParserId] || KmNaiveConfiguration; // 預設顯示 Naive
  }, [finalParserId]);

  return (
    <div className="overflow-auto max-h-[60vh] p-1 space-y-4">
      <KmChunkMethodItem parserList={parserList} />
      <div className="p-4 border rounded-lg">
        <ConfigurationComponent />
      </div>
      {showRaptorParseConfiguration(finalParserId) && (
        <div className="mt-4 p-4 border-t">
          <RaptorFormFields />
        </div>
      )}
      {showGraphRagItems(finalParserId) && (
        <div className="mt-4 p-4 border-t">
          <GraphRagItems marginBottom={false} className="p-0" />
        </div>
      )}
    </div>
  );
}