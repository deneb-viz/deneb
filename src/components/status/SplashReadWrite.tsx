import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import React, { useEffect } from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { shallow } from 'zustand/shallow';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StandardHeaderContent from './StandardHeaderContent';
import UsefulResources from './UsefulResources';

import { BodyHeading, Paragraph } from '../elements/Typography';
import store from '../../store';
import { hostServices } from '../../core/services';
import { getI18nValue } from '../../features/i18n';

const SplashReadWrite = () => (
    <Scrollbars>
        <StatusLayoutStack>
            <StandardHeaderContent />
            <StatusLayoutStackItem verticalFill>
                <BodyHeading>
                    {getI18nValue('Landing_Data_Heading')}
                </BodyHeading>
                <div>{resolveInstructions()}</div>
                <UsefulResources />
            </StatusLayoutStackItem>
        </StatusLayoutStack>
    </Scrollbars>
);

const resolveInstructions = () => {
    const { visualEditMode } = store(
        (state) => ({
            visualEditMode: state.visualEditMode
        }),
        shallow
    );
    useEffect(() => hostServices.renderingFinished(), []);
    switch (visualEditMode) {
        case EditMode.Advanced:
            return (
                <Paragraph>
                    {getI18nValue('Landing_EditMode_Assistive_01')}
                </Paragraph>
            );
        default:
            return (
                <>
                    <Paragraph>
                        {getI18nValue('Landing_Assistive_01')}
                    </Paragraph>
                    <Paragraph>
                        {getI18nValue('Landing_Assistive_02')}
                    </Paragraph>
                </>
            );
    }
};

export default SplashReadWrite;
