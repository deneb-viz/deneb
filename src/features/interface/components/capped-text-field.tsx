import * as React from 'react';
import {
    Input,
    InputOnChangeData,
    Label,
    Textarea,
    TextareaOnChangeData,
    makeStyles,
    shorthands,
    tokens,
    useId
} from '@fluentui/react-components';

import debounce from 'lodash/debounce';
import get from 'lodash/get';

import store from '../../../store';
import { getI18nValue } from '../../../features/i18n';
import { PROPERTY_DEFAULTS } from '../../../../config';

interface ICappedTextFieldProps {
    id: string;
    i18nLabel: string;
    i18nPlaceholder: string;
    maxLength: number;
    multiline?: boolean;
    inline?: boolean;
}

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        marginTop: tokens.spacingVerticalXS,
        marginBottom: tokens.spacingVerticalS,
        ...shorthands.gap('2px')
    }
});

export const CappedTextField: React.FC<ICappedTextFieldProps> = (props) => {
    const inputId = useId(props.id);
    const classes = useStyles();
    const { templateExportMetadata, updateTemplateExportPropertyBySelector } =
        store();
    const [value, setValue] = React.useState(
        get(templateExportMetadata, props.id, '')
    );
    const delayedInput = React.useCallback(
        debounce((value: string) => {
            updateTemplateExportPropertyBySelector({
                selector: props.id,
                value
            });
        }, PROPERTY_DEFAULTS.editor.debounceInterval),
        []
    );
    const onChange = (
        ev: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
        data: TextareaOnChangeData | InputOnChangeData
    ) => {
        const value = data.value || '';
        if (value.length <= props.maxLength) {
            setValue(value);
            delayedInput(value);
        }
    };
    const label = !props.inline
        ? `${getI18nValue(props.i18nLabel)} (${value?.length || 0}/${
              props.maxLength
          })`
        : '';
    return (
        <div className={classes.root}>
            <Label htmlFor={inputId}>{label}</Label>
            {props.multiline ? (
                <Textarea
                    value={value}
                    onChange={onChange}
                    id={inputId}
                    placeholder={getI18nValue(props.i18nPlaceholder)}
                />
            ) : (
                <Input
                    value={value}
                    onChange={onChange}
                    id={inputId}
                    placeholder={getI18nValue(props.i18nPlaceholder)}
                />
            )}
        </div>
    );
};
