import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';

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
import { i18nValue } from '../../core/ui/i18n';

const SplashNospec = () => {
    const root = useSelector(state),
        { editMode } = root.visual,
        resolveDataInstruction = () => {
            switch (true) {
                case editMode === EditMode.Advanced: {
                    return (
                        <Paragraph>
                            {i18nValue('New_Visual_Placeholder_Editor')}
                        </Paragraph>
                    );
                }
                default: {
                    return (
                        <Paragraph>
                            {i18nValue('New_Visual_Placeholder_Open_Edit')}
                        </Paragraph>
                    );
                }
            }
        };
    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='edit'>
                    <Heading>
                        {i18nValue('New_Visual_Placeholder_Title')}
                    </Heading>
                    <SubHeading>
                        {i18nValue('New_Visual_Placeholder_Subtitle')}
                    </SubHeading>
                </StatusHeaderSection>
                <StatusLayoutStackItem verticalFill>
                    <BodyHeading>
                        {i18nValue('Landing_Data_Heading')}
                    </BodyHeading>
                    <div>{resolveDataInstruction()}</div>
                    <UsefulResources />
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

export default SplashNospec;
