// 【【【最關鍵的修正：確保 import 路徑正確】】】
import { KmLayoutRecognizeFormField } from '../common/km-layout-recognize-form-field';
import { KmMainContainer, KmConfigurationFormContainer } from '../common/km-configuration-form-container';
// 其他公共元件，如 DelimiterFormField, RaptorFormFields 等，因為它們本身是安全的，所以可以直接從 @/components 引用
import { DelimiterFormField } from '@/components/delimiter-form-field';
import RaptorFormFields from '@/components/parse-configuration/raptor-form-fields';
import GraphRagItems from '@/components/parse-configuration/graph-rag-form-fields';

// 導出的函式名稱也必須是 Km*
export function KmBookConfiguration() {
  return (
    // 使用我們本地的 Km* 元件
    <KmMainContainer>
      <KmConfigurationFormContainer>
        <KmLayoutRecognizeFormField />
        {/* Omitted PageRankFormField, AutoKeywordsFormField, etc. as their source is not provided/purified yet. */}
      </KmConfigurationFormContainer>
       <KmConfigurationFormContainer>
         <RaptorFormFields />
       </KmConfigurationFormContainer>
      <GraphRagItems marginBottom />
    </KmMainContainer>
  );
}