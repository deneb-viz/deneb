import * as React from 'react';
import { shallow } from 'zustand/shallow';
import {
    Field,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Text
} from '@fluentui/react-components';

import { updateSelectionMode } from '../../../core/ui/commands';
import store from '../../../store';
import { TSpecProvider } from '../../../core/vega';
import { getI18nValue } from '../../i18n';
import { SelectionMode } from '@deneb-viz/core-dependencies';
import { getVisualSelectionManager } from '../../visual-host';
import { useSettingsStyles } from '.';

export const CrossFilterModeSettings: React.FC = () => {
    const {
        visualSettings: {
            vega: { provider, selectionMode }
        }
    } = store((state) => state, shallow);
    const onChange = React.useCallback(
        (ev: React.FormEvent<HTMLDivElement>, data: RadioGroupOnChangeData) => {
            if (getVisualSelectionManager().hasSelection()) {
                getVisualSelectionManager().clear();
            }
            updateSelectionMode(
                data.value as SelectionMode,
                provider as TSpecProvider
            );
        },
        []
    );
    return (
        <Field label={getI18nValue('Objects_Vega_SelectionMode')}>
            <RadioGroup value={selectionMode} onChange={onChange}>
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
