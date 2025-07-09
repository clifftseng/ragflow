import { DelimiterFormField } from '@/components/delimiter-form-field';
import { KmLayoutRecognizeFormField } from '../common/km-layout-recognize-form-field';
import { KmConfigurationFormContainer, KmMainContainer } from '../common/km-configuration-form-container';

export function KmNaiveConfiguration() {
  return (
    <KmMainContainer>
      <KmConfigurationFormContainer>
        <KmLayoutRecognizeFormField />
        <DelimiterFormField />
      </KmConfigurationFormContainer>
    </KmMainContainer>
  );
}