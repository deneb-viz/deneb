import React, { useEffect } from 'react';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StatusHeaderSection from './StatusHeaderSection';
import { Heading, Paragraph, SubHeading } from '../elements/Typography';
import { i18nValue } from '../../core/ui/i18n';
import { hostServices } from '../../core/services';
import { reactLog } from '../../core/utils/reactLog';
import { getLogErrorForStatusDisplay } from '../../features/debug-area';

const SpecificationError = () => {
    const message = getLogErrorForStatusDisplay();
    useEffect(() => hostServices.renderingFailed(message), []);
    reactLog('Rendering [SpecificationError]');
    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='spec-error'>
                    <Heading>{i18nValue('Spec_Error_Heading')}</Heading>
                    <SubHeading>{i18nValue('Spec_Error_Overview')}</SubHeading>
                </StatusHeaderSection>
                <StatusLayoutStackItem verticalFill>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>
                    <Paragraph>
                        {i18nValue('Spec_Error_More', [
                            i18nValue('Pivot_Preview_Log')
                        ])}
                    </Paragraph>
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

export default SpecificationError;
