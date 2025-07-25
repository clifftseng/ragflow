
import { KmLayoutRecognizeFormField } from '../common/km-layout-recognize-form-field';
import { KmMainContainer, KmConfigurationFormContainer } from '../common/km-configuration-form-container';



export function KmPaperConfiguration() {
  return (
    <KmMainContainer>
      <KmConfigurationFormContainer>
        <KmLayoutRecognizeFormField />
      </KmConfigurationFormContainer>
    </KmMainContainer>
  );
}
