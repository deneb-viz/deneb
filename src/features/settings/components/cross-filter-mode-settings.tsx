import { type FormEvent, useCallback } from 'react';
import {
    Field,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Text
} from '@fluentui/react-components';

import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { useSettingsStyles } from '../styles';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import {
    getI18nValue,
    getVisualSelectionManager
} from '@deneb-viz/powerbi-compat/visual-host';
import { handleSelectionMode, useDenebState } from '@deneb-viz/app-core';

export const CrossFilterModeSettings = () => {
    const { provider, selectionMode } = useDenebState((state) => ({
        provider: state.visualSettings.vega.output.provider
            .value as SpecProvider,
        selectionMode: state.visualSettings.vega.interactivity.selectionMode
            .value as SelectionMode
    }));
    const onChange = useCallback(
        (ev: FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            if (getVisualSelectionManager().hasSelection()) {
                getVisualSelectionManager().clear();
            }
            handleSelectionMode(
                data.value as SelectionMode,
                provider as SpecProvider
            );
        },
        []
    );
    return (
        <Field label={getI18nValue('Objects_Vega_SelectionMode')}>
            <RadioGroup
                value={selectionMode as SelectionMode}
                onChange={onChange}
            >
                <Radio
                    value='simple'
                    label={getRadioLabel(
                        'Enum_SelectionMode_Simple',
                        'Text_Radio_Button_Description_Cross_Filter_Simple'
                    )}
                />
                <Radio
                    value='advanced'
                    label={getRadioLabel(
                        'Enum_SelectionMode_Advanced',
                        'Text_Radio_Button_Description_Cross_Filter_Advanced'
                    )}
                    disabled={provider === 'vegaLite'}
                />
            </RadioGroup>
        </Field>
    );
};

const getRadioLabel = (labelKey: string, descriptionKey: string) => {
    const classes = useSettingsStyles();
    return (
        <>
            {getI18nValue(labelKey)}
            <br />
            <Text size={200} className={classes.radioGroupLabel}>
                {getI18nValue(descriptionKey)}
            </Text>
        </>
    );
};
