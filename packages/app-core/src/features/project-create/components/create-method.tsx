import React from 'react';
import {
    Label,
    makeStyles,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Subtitle2,
    tokens,
    useId
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { type DenebTemplateCreateMode } from '@deneb-viz/json-processing/template-processing';
import { useDenebState } from '../../../state';
import { logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

const useCreateMethodStyles = makeStyles({
    radioGroup: {
        padding: tokens.spacingVerticalMNudge,
        paddingLeft: tokens.spacingHorizontalNone
    },
    radioButton: {
        marginLeft: tokens.spacingHorizontalXXS
    }
});

/**
 * Represents the radio button group used to specify how a new specification
 * should be created.
 */
export const CreateMethod = () => {
    const { mode, setMode } = useDenebState(
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
        setMode(data.value as DenebTemplateCreateMode);
    };
    const labelId = useId('label');
    const classes = useCreateMethodStyles();
    logRender('CreateMethod');
    return (
        <div className={classes.radioGroup}>
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
