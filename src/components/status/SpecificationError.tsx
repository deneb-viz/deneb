import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StatusHeaderSection from './StatusHeaderSection';
import { Heading, SubHeading } from '../elements/Text';
import { getHostLM } from '../../api/i18n';

const SpecificationError = () => {
    const i18n = getHostLM(),
        root = useSelector(state),
        { message } = root.visual.spec;

    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='spec-error'>
                    <Heading>
                        {i18n.getDisplayName('Spec_Error_Heading')}
                    </Heading>
                    <SubHeading>
                        {i18n.getDisplayName('Spec_Error_Overview')}
                    </SubHeading>
                </StatusHeaderSection>
                <StatusLayoutStackItem verticalFill>
                    <code>{message}</code>
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

export default SpecificationError;
