import * as React from 'react';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';

import { choiceGroupStyles, choiceItemStyles } from '../../config/styles';
import store from '../../store';
import { updateRenderMode } from '../../core/ui/commands';
import { i18nValue } from '../../core/ui/i18n';
import { TSpecRenderMode } from '../../core/vega';
import { Paragraph } from '../elements/Typography';

const RenderModeSettings = () => {
    const { vega } = store((state) => state.visualSettings),
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
            <Paragraph>{i18nValue('Assistive_Text_RenderMode')}</Paragraph>
        </>
    );
};

export default RenderModeSettings;
