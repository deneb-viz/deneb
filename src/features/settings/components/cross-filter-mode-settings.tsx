import { type FormEvent, useCallback } from 'react';
import {
    Field,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Text
} from '@fluentui/react-components';

import { useSettingsStyles } from '../styles';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import {
    getDenebState,
    handleSelectionMode,
    useDenebState
} from '@deneb-viz/app-core';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { InteractivityManager } from '../../../lib/interactivity';

export const CrossFilterModeSettings = () => {
    const { provider, selectionMode, translate } = useDenebState((state) => ({
        provider: state.visualSettings.vega.output.provider
            .value as SpecProvider,
        selectionMode: state.visualSettings.vega.interactivity.selectionMode
            .value as SelectionMode,
        translate: state.i18n.translate
    }));
    const onChange = useCallback(
        (ev: FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            if (InteractivityManager.hasSelection()) {
                InteractivityManager.crossFilter();
            }
            handleSelectionMode(
                data.value as SelectionMode,
                provider as SpecProvider
            );
        },
        []
    );
    return (
        <Field label={translate('PowerBI_Objects_Vega_SelectionMode')}>
            <RadioGroup
                value={selectionMode as SelectionMode}
                onChange={onChange}
            >
                <Radio
                    value='simple'
                    label={getRadioLabel(
                        'PowerBI_Enum_SelectionMode_Simple',
                        'PowerBI_Radio_Button_Description_Cross_Filter_Simple'
                    )}
                />
                <Radio
                    value='advanced'
                    label={getRadioLabel(
                        'PowerBI_Enum_SelectionMode_Advanced',
                        'PowerBI_Radio_Button_Description_Cross_Filter_Advanced'
                    )}
                    disabled={provider === 'vegaLite'}
                />
            </RadioGroup>
        </Field>
    );
};

const getRadioLabel = (labelKey: string, descriptionKey: string) => {
    const classes = useSettingsStyles();
    const { translate } = getDenebState().i18n;
    return (
        <>
            {translate(labelKey)}
            <br />
            <Text size={200} className={classes.radioGroupLabel}>
                {translate(descriptionKey)}
            </Text>
        </>
    );
};
