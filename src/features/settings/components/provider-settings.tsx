import * as React from 'react';
import { shallow } from 'zustand/shallow';
import {
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    useId
} from '@fluentui/react-components';

import { updateProvider } from '../../../core/ui/commands';
import store from '../../../store';
import { TSpecProvider } from '../../../core/vega';
import { useSettingsStyles } from '.';
import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';
import { getI18nValue } from '../../i18n';

export const ProviderSettings: React.FC = () => {
    const {
        vega: { provider }
    } = store((state) => state.visualSettings, shallow);
    const onChange = React.useCallback(
        (ev: React.FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            updateProvider(data.value as TSpecProvider);
        },
        []
    );
    const classes = useSettingsStyles();
    const labelId = useId('label');
    return (
        <div className={classes.sectionContainer}>
            <SettingsHeadingLabel>
                {getI18nValue('Objects_Vega_Provider')}
            </SettingsHeadingLabel>
            <div className={classes.radioGroupHorizontal}>
                <RadioGroup
                    layout='horizontal'
                    aria-labelledby={labelId}
                    onChange={onChange}
                    value={provider}
                >
                    <Radio
                        value='vegaLite'
                        label={getI18nValue('Provider_VegaLite')}
                    />
                    <Radio value='vega' label={getI18nValue('Provider_Vega')} />
                </RadioGroup>
            </div>
            <SettingsTextSection>
                {getI18nValue('Assistive_Text_Provider')}
            </SettingsTextSection>
        </div>
    );
};
