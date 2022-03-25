import React, { useEffect } from 'react';

import { useStoreProp } from '../../store';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StatusHeaderSection from './StatusHeaderSection';
import { Heading, SubHeading } from '../elements/Typography';
import { i18nValue } from '../../core/ui/i18n';
import { hostServices } from '../../core/services';

const SpecificationError = () => {
    const message = useStoreProp<string>('message', 'editorSpec');
        { message } = editorSpec;
    useEffect(() => hostServices.renderingFailed(message), []);
    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='spec-error'>
                    <Heading>{i18nValue('Spec_Error_Heading')}</Heading>
                    <SubHeading>{i18nValue('Spec_Error_Overview')}</SubHeading>
                </StatusHeaderSection>
                <StatusLayoutStackItem verticalFill>
                    <code>{message}</code>
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

export default SpecificationError;
