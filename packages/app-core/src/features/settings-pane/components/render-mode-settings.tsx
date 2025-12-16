import { useCallback } from 'react';
import {
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    useId
} from '@fluentui/react-components';

import { type SpecRenderMode } from '@deneb-viz/vega-runtime/embed';
import { useDenebState } from '../../../state';
import { handleVegaRenderMode } from '../../../lib';
import { useSettingsPaneStyles } from '../styles';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';

export const RenderModeSettings = () => {
    const { renderMode, translate } = useDenebState((state) => ({
        renderMode: state.visualSettings.vega.output.renderMode
            .value as SpecRenderMode,
        translate: state.i18n.translate
    }));
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
                {translate('Text_Vega_RenderMode')}
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
                        label={translate('Enum_Grammar_RenderMode_Canvas')}
                    />
                    <Radio
                        value='svg'
                        label={translate('Enum_Grammar_RenderMode_Svg')}
                    />
                </RadioGroup>
            </div>
            <SettingsTextSection>
                {translate('Assistive_Text_RenderMode')}
            </SettingsTextSection>
        </div>
    );
};
