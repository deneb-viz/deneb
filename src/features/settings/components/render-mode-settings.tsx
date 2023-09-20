import * as React from 'react';
import { shallow } from 'zustand/shallow';
import {
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    useId
} from '@fluentui/react-components';

import { updateRenderMode } from '../../../core/ui/commands';
import store from '../../../store';
import { TSpecRenderMode } from '../../../core/vega';
import { useSettingsStyles } from '.';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';
import { getI18nValue } from '../../i18n';

export const RenderModeSettings: React.FC = () => {
    const {
        visualSettings: {
            vega: { renderMode }
        }
    } = store((state) => state, shallow);
    const onChange = React.useCallback(
        (ev: React.FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            updateRenderMode(data.value as TSpecRenderMode);
        },
        []
    );
    const classes = useSettingsStyles();
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
                    value={renderMode}
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
