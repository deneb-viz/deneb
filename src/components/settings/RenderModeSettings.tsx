import * as React from 'react';
import { useSelector } from 'react-redux';
import { Text } from '@fluentui/react/lib/Text';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';

import Debugger from '../../Debugger';
import { commandService } from '../../services';
import { TSpecRenderMode } from '../../types';
import { choiceGroupStyles, choiceItemStyles } from '../../config/styles';
import { state } from '../../store';

const RenderModeSettings = () => {
    Debugger.log('Rendering Component: [RenderModeSettings]...');
    const { i18n, settings } = useSelector(state).visual,
        { vega } = settings,
        handleRenderMode = React.useCallback(
            (
                ev: React.SyntheticEvent<HTMLElement>,
                option: IChoiceGroupOption
            ) => {
                Debugger.log(`Updating render mode to ${option.key}...`);
                commandService.updateRenderMode(option.key as TSpecRenderMode);
            },
            []
        ),
        rendererOptions: IChoiceGroupOption[] = [
            {
                key: 'canvas',
                text: i18n.getDisplayName('Enum_Grammar_RenderMode_Canvas'),
                styles: choiceItemStyles
            },
            {
                key: 'svg',
                text: i18n.getDisplayName('Enum_Grammar_RenderMode_Svg'),
                styles: choiceItemStyles
            }
        ];
    return (
        <>
            <ChoiceGroup
                options={rendererOptions}
                styles={choiceGroupStyles}
                onChange={handleRenderMode}
                selectedKey={vega.renderMode}
                label={i18n.getDisplayName('Objects_Vega_RenderMode')}
            />
            <Text variant='smallPlus'>
                {i18n.getDisplayName('Assistive_Text_RenderMode')}
            </Text>
        </>
    );
};

export default RenderModeSettings;
