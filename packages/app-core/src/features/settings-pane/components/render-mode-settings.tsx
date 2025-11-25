import { useCallback } from 'react';
import {
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    useId
} from '@fluentui/react-components';

import { type SpecRenderMode } from '@deneb-viz/vega-runtime/embed';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { useDenebState } from '../../../state';
import { handleVegaRenderMode } from '../../../lib';
import { useSettingsPaneStyles } from '../styles';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';

export const RenderModeSettings = () => {
    const renderMode = useDenebState(
        (state) =>
            state.visualSettings.vega.output.renderMode.value as SpecRenderMode
    );
    const onChange = useCallback(
        (ev: React.FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            handleVegaRenderMode(data.value as SpecRenderMode);
        },
        []
    );
    const classes = useSettingsPaneStyles();
    const labelId = useId('label');
    return (
        <div className={classes.sectionContainer}>
            <SettingsHeadingLabel>
                {getI18nValue('Objects_Vega_RenderMode')}
            </SettingsHeadingLabel>
            <div className={classes.radioGroupHorizontal}>
                <RadioGroup
                    layout='horizontal'
                    aria-labelledby={labelId}
                    onChange={onChange}
                    value={renderMode as SpecRenderMode}
                >
                    <Radio
                        value='canvas'
                        label={getI18nValue('Enum_Grammar_RenderMode_Canvas')}
                    />
                    <Radio
                        value='svg'
                        label={getI18nValue('Enum_Grammar_RenderMode_Svg')}
                    />
                </RadioGroup>
            </div>
            <SettingsTextSection>
                {getI18nValue('Assistive_Text_RenderMode')}
            </SettingsTextSection>
        </div>
    );
};
