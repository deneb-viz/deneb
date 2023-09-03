import React from 'react';
import {
    Label,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Subtitle2,
    useId
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { logRender } from '../../logging';
import { useCreateStyles } from './';
import { getI18nValue } from '../../i18n';
import { TTemplateProvider } from '../../template';

/**
 * Represents the radio button group used to specify how a new specification
 * should be created.
 */
export const CreateMethod = () => {
    const { mode, setMode } = store(
        (state) => ({
            mode: state.create.mode,
            setMode: state.create.setMode
        }),
        shallow
    );
    const onChange = (
        ev: React.FormEvent<HTMLDivElement>,
        data: RadioGroupOnChangeData
    ) => {
        setMode(data.value as TTemplateProvider);
    };
    const labelId = useId('label');
    const classes = useCreateStyles();
    logRender('CreateMethod');
    return (
        <div className={classes.importRadioGroup}>
            <Label id={labelId}>
                <Subtitle2>{getI18nValue('Text_Radio_Group_Create')}</Subtitle2>
            </Label>
            <RadioGroup
                aria-labelledby={labelId}
                value={mode}
                onChange={onChange}
            >
                <Radio
                    className={classes.radioButton}
                    value='import'
                    label={getI18nValue('Text_Radio_Button_Create_Import')}
                />
                <Radio
                    className={classes.radioButton}
                    value='vegaLite'
                    label={getI18nValue('Text_Radio_Button_Create_VegaLite')}
                />
                <Radio
                    className={classes.radioButton}
                    value='vega'
                    label={getI18nValue('Text_Radio_Button_Create_Vega')}
                />
            </RadioGroup>
        </div>
    );
};
