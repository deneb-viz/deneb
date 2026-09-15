import { type ChangeEvent, useEffect, useRef, useState } from 'react';
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
import { useDebounce } from '@uidotdev/usehooks';

import { useDenebState } from '../../state';
import { EDITOR_DEFAULTS } from '@deneb-viz/configuration';

/**
 * A debounced edit reported by `CappedTextField`: the field's `id` as the
 * property selector, plus the current text.
 */
export type CappedTextFieldChange = {
    selector: string;
    value: string;
};

type CappedTextFieldProps = {
    id: string;
    i18nLabel: string;
    i18nPlaceholder: string;
    maxLength: number;
    multiline?: boolean;
    inline?: boolean;
    /**
     * Receives the debounced value under the field's `id`. Fires once on
     * mount with the (empty) initial value, then after each debounce period.
     */
    onValueChange: (change: CappedTextFieldChange) => void;
};

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

export const CappedTextField = (props: CappedTextFieldProps) => {
    const inputId = useId(props.id);
    const classes = useStyles();
    const translate = useDenebState((state) => state.i18n.translate);
    const [value, setValue] = useState('');
    const debouncedValue = useDebounce(
        value,
        EDITOR_DEFAULTS.debouncePeriod.default
    );
    // Always call the latest callback without re-running the effect on
    // callback identity: an inline arrow from the caller would otherwise
    // re-report the same value on every render.
    const onValueChangeRef = useRef(props.onValueChange);
    onValueChangeRef.current = props.onValueChange;

    useEffect(() => {
        onValueChangeRef.current({
            selector: props.id,
            value: debouncedValue
        });
    }, [debouncedValue, props.id]);
    const onChange = (
        ev: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
        data: TextareaOnChangeData | InputOnChangeData
    ) => {
        const value = data.value || '';
        if (value.length <= props.maxLength) {
            setValue(value);
        }
    };
    const label = !props.inline
        ? `${translate(props.i18nLabel)} (${value?.length || 0}/${
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
                    placeholder={translate(props.i18nPlaceholder)}
                    autoComplete='off'
                />
            ) : (
                <Input
                    value={value}
                    onChange={onChange}
                    id={inputId}
                    placeholder={translate(props.i18nPlaceholder)}
                    autoComplete='off'
                />
            )}
        </div>
    );
};
