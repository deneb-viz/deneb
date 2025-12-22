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

import { useDenebState } from '../../state';
import { EDITOR_DEFAULTS } from '@deneb-viz/configuration';

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
    const { metadata, setMetadataPropertyBySelector, translate } =
        useDenebState((state) => ({
            metadata: state.export.metadata,
            setMetadataPropertyBySelector:
                state.export.setMetadataPropertyBySelector,
            translate: state.i18n.translate
        }));
    const [value, setValue] = useState<string>(
        (metadata as unknown as Record<string, string | undefined>)?.[
            props.id
        ] || ''
    );
    const debouncedValue = useDebounce(
        value,
        EDITOR_DEFAULTS.debouncePeriod.default
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
