import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StatusHeaderSection from './StatusHeaderSection';
import { Heading, SubHeading } from '../elements/Typography';
import { i18nValue } from '../../core/ui/i18n';

const SpecificationError = () => {
    const root = useSelector(state),
        { message } = root.visual.spec;

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
