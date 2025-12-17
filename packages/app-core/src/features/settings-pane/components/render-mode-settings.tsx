import { useCallback } from 'react';
import {
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    useId
} from '@fluentui/react-components';

import { type SpecRenderMode } from '@deneb-viz/vega-runtime/embed';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';

export const RenderModeSettings = () => {
    const { renderMode, setRenderMode, translate } = useDenebState((state) => ({
        renderMode: state.project.renderMode,
        setRenderMode: state.project.setRenderMode,
        translate: state.i18n.translate
    }));
    const onChange = useCallback(
        (ev: React.FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            setRenderMode(data.value as SpecRenderMode);
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
