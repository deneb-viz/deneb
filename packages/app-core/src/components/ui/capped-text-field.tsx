import { type ChangeEvent, useEffect, useState } from 'react';
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

import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { useDenebState } from '../../state';

type CappedTextFieldProps = {
    id: string;
    i18nLabel: string;
    i18nPlaceholder: string;
    maxLength: number;
    multiline?: boolean;
    inline?: boolean;
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
    const { metadata, setMetadataPropertyBySelector } = useDenebState(
        (state) => ({
            metadata: state.export.metadata,
            setMetadataPropertyBySelector:
                state.export.setMetadataPropertyBySelector
        })
    );
    const [value, setValue] = useState<string>(
        (metadata as unknown as Record<string, string | undefined>)?.[
            props.id
        ] || ''
    );
    const debouncedValue = useDebounce(
        value,
        DEFAULTS.editor.debouncePeriod.default
    );

    useEffect(() => {
        setMetadataPropertyBySelector({
            selector: props.id,
            value: debouncedValue
        });
    }, [debouncedValue, props.id, setMetadataPropertyBySelector]);
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
                    autoComplete='off'
                />
            ) : (
                <Input
                    value={value}
                    onChange={onChange}
                    id={inputId}
                    placeholder={getI18nValue(props.i18nPlaceholder)}
                    autoComplete='off'
                />
            )}
        </div>
    );
};
