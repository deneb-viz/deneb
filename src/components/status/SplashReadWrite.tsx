import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import * as React from 'react';
import { useSelector } from 'react-redux';

import { getHostLM } from '../../api/i18n';
import { state } from '../../store';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StandardHeaderContent from './StandardHeaderContent';
import UsefulResources from './UsefulResources';

import { BodyHeading, Paragraph } from '../elements/Text';
import { getState } from '../../api/store';

const SplashReadWrite = () => {
    const i18n = getHostLM();
    return (
        <>
            <StatusLayoutStack>
                <StandardHeaderContent />
                <StatusLayoutStackItem verticalFill>
                    <BodyHeading>
                        {i18n.getDisplayName('Landing_Data_Heading')}
                    </BodyHeading>
                    <div>{resolveInstructions()}</div>
                    <UsefulResources />
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

const resolveInstructions = () => {
    const { editMode } = getState().visual,
        i18n = getHostLM();
    switch (editMode) {
        case EditMode.Advanced:
            return (
                <Paragraph>
                    {i18n.getDisplayName('Landing_EditMode_Assistive_01')}
                </Paragraph>
            );
        default:
            return (
                <>
                    <Paragraph>
                        {i18n.getDisplayName('Landing_Assistive_01')}
                    </Paragraph>
                    <Paragraph>
                        {i18n.getDisplayName('Landing_Assistive_02')}
                    </Paragraph>
                </>
            );
    }
};

export default SplashReadWrite;
