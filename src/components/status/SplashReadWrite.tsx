import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import * as React from 'react';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StandardHeaderContent from './StandardHeaderContent';
import UsefulResources from './UsefulResources';

import { BodyHeading, Paragraph } from '../elements/Typography';
import { getState } from '../../store';
import { i18nValue } from '../../core/ui/i18n';

const SplashReadWrite = () => (
    <>
        <StatusLayoutStack>
            <StandardHeaderContent />
            <StatusLayoutStackItem verticalFill>
                <BodyHeading>{i18nValue('Landing_Data_Heading')}</BodyHeading>
                <div>{resolveInstructions()}</div>
                <UsefulResources />
            </StatusLayoutStackItem>
        </StatusLayoutStack>
    </>
);

const resolveInstructions = () => {
    const { editMode } = getState().visual;
    switch (editMode) {
        case EditMode.Advanced:
            return (
                <Paragraph>
                    {i18nValue('Landing_EditMode_Assistive_01')}
                </Paragraph>
            );
        default:
            return (
                <>
                    <Paragraph>{i18nValue('Landing_Assistive_01')}</Paragraph>
                    <Paragraph>{i18nValue('Landing_Assistive_02')}</Paragraph>
                </>
            );
    }
};

export default SplashReadWrite;
