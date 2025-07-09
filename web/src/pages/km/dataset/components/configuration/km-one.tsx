import { KmLayoutRecognizeFormField } from '../common/km-layout-recognize-form-field';
import { KmConfigurationFormContainer } from '../common/km-configuration-form-container';

export function KmOneConfiguration() {
  return (
    <KmConfigurationFormContainer>
      <KmLayoutRecognizeFormField />
    </KmConfigurationFormContainer>
  );
}