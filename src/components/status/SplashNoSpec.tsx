import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import React, { useEffect } from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { shallow } from 'zustand/shallow';

import store from '../../store';

import StatusHeaderSection from './StatusHeaderSection';
import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import {
    BodyHeading,
    Heading,
    Paragraph,
    SubHeading
} from '../elements/Typography';
import UsefulResources from './UsefulResources';
import { hostServices } from '../../core/services';
import { getI18nValue } from '../../features/i18n';

const SplashNospec = () => {
    const { visualEditMode } = store(
        (state) => ({
            visualEditMode: state.visualEditMode
        }),
        shallow
    );
    const resolveDataInstruction = () => {
        switch (true) {
            case visualEditMode === EditMode.Advanced: {
                return (
                    <Paragraph>
                        {getI18nValue('New_Visual_Placeholder_Editor')}
                    </Paragraph>
                );
            }
            default: {
                return (
                    <Paragraph>
                        {getI18nValue('New_Visual_Placeholder_Open_Edit')}
                    </Paragraph>
                );
            }
        }
    };
    useEffect(() => hostServices.renderingFinished(), []);
    return (
        <Scrollbars>
            <StatusLayoutStack>
                <StatusHeaderSection icon='edit'>
                    <Heading>
                        {getI18nValue('New_Visual_Placeholder_Title')}
                    </Heading>
                    <SubHeading>
                        {getI18nValue('New_Visual_Placeholder_Subtitle')}
                    </SubHeading>
                </StatusHeaderSection>
                <StatusLayoutStackItem verticalFill>
                    <BodyHeading>
                        {getI18nValue('Landing_Data_Heading')}
                    </BodyHeading>
                    <div>{resolveDataInstruction()}</div>
                    <UsefulResources />
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </Scrollbars>
    );
};

export default SplashNospec;
