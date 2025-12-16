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
import { handleVegaProvider } from '../../../lib';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';

export const ProviderSettings = () => {
    const { provider, selectionMode, translate } = useDenebState((state) => ({
        provider: state.visualSettings.vega.output.provider
            .value as SpecProvider,
        selectionMode: state.visualSettings.vega.interactivity.selectionMode
            .value as SelectionMode,
        translate: state.i18n.translate
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
                {translate('Text_Vega_Provider')}
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
                        label={translate('Provider_VegaLite')}
                    />
                    <Radio value='vega' label={translate('Provider_Vega')} />
                </RadioGroup>
            </div>
            <SettingsTextSection>
                {translate('Assistive_Text_Provider')}
            </SettingsTextSection>
        </div>
    );
};
