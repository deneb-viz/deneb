import * as React from 'react';
import { useSelector } from 'react-redux';
import { Text } from '@fluentui/react/lib/Text';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';

import { choiceGroupStyles, choiceItemStyles } from '../../config/styles';
import { state } from '../../store';
import { updateRenderMode } from '../../core/ui/commands';
import { i18nValue } from '../../core/ui/i18n';
import { TSpecRenderMode } from '../../core/vega';

const RenderModeSettings = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
        handleRenderMode = React.useCallback(
            (
                ev: React.SyntheticEvent<HTMLElement>,
                option: IChoiceGroupOption
            ) => {
                updateRenderMode(option.key as TSpecRenderMode);
            },
            []
        ),
        rendererOptions: IChoiceGroupOption[] = [
            {
                key: 'canvas',
                text: i18nValue('Enum_Grammar_RenderMode_Canvas'),
                styles: choiceItemStyles
            },
            {
                key: 'svg',
                text: i18nValue('Enum_Grammar_RenderMode_Svg'),
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
                label={i18nValue('Objects_Vega_RenderMode')}
            />
            <Text variant='smallPlus'>
                {i18nValue('Assistive_Text_RenderMode')}
            </Text>
        </>
    );
};

export default RenderModeSettings;
