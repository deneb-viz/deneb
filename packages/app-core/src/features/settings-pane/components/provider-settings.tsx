import { type FormEvent, useCallback } from 'react';
import {
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    useId
} from '@fluentui/react-components';

import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';
import { type SelectionMode } from '@deneb-viz/template-usermeta';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { handleVegaProvider } from '../../../lib';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';

export const ProviderSettings = () => {
    const { provider, selectionMode } = useDenebState((state) => ({
        provider: state.visualSettings.vega.output.provider
            .value as SpecProvider,
        selectionMode: state.visualSettings.vega.interactivity.selectionMode
            .value as SelectionMode
    }));
    const onChange = useCallback(
        (ev: FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            handleVegaProvider(data.value as SpecProvider, selectionMode);
        },
        []
    );
    const classes = useSettingsPaneStyles();
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
