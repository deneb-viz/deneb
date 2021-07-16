import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import debounce from 'lodash/debounce';
import get from 'lodash/get';

import { ITextFieldProps, TextField } from '@fluentui/react/lib/TextField';
import { IStackTokens, Stack } from '@fluentui/react/lib/Stack';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateExportTemplatePropertyBySelector } from '../../store/templateReducer';
import { getConfig } from '../../core/utils/config';
import FieldInfoIcon from './FieldInfoIcon';
import { IRenderFunction } from '@fluentui/react/lib/Utilities';
import { i18nValue } from '../../core/ui/i18n';

const stackTokens: IStackTokens = {
    childrenGap: 4
};

interface ICappedTextFieldProps {
    id: string;
    i18nLabel: string;
    i18nPlaceholder: string;
    i18nAssistiveText?: string;
    maxLength: number;
    multiline?: boolean;
    inline?: boolean;
    description?: string;
}

const CappedTextField: React.FC<ICappedTextFieldProps> = (props) => {
    Debugger.log('Rendering Component: [CappedTextField]...');
    const root = useSelector(state),
        dispatch = useDispatch(),
        { templateExportMetadata: templateToGenerate } = root.templates,
        [textFieldValue, setTextFieldValue] = React.useState(
            get(templateToGenerate, props.id, '')
        ),
        delayedInput = React.useCallback(
            debounce((value: string) => {
                dispatch(
                    updateExportTemplatePropertyBySelector({
                        selector: props.id,
                        value
                    })
                );
            }, getConfig().propertyDefaults.editor.debounceInterval),
            []
        ),
        onChangeField = (
            event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
            newValue?: string
        ) => {
            const value = newValue || '';
            if (value.length <= props.maxLength) {
                setTextFieldValue(value);
                delayedInput(value);
            }
        },
        onRenderLabel = (
            fieldProps: ITextFieldProps,
            defaultRender: IRenderFunction<ITextFieldProps>
        ) => {
            if (!props.inline) {
                const description =
                    (props.i18nAssistiveText &&
                        i18nValue(props.i18nAssistiveText)) ||
                    '';
                return (
                    <Stack
                        horizontal
                        verticalAlign='center'
                        tokens={stackTokens}
                    >
                        <span>{defaultRender(fieldProps)}</span>
                        <FieldInfoIcon description={description} />
                    </Stack>
                );
            }
        };
    return (
        <TextField
            id={props.id}
            key={props.id}
            value={textFieldValue}
            label={`${i18nValue(props.i18nLabel)} (${
                textFieldValue?.length || 0
            }/${props.maxLength})`}
            placeholder={i18nValue(props.i18nPlaceholder)}
            onChange={onChangeField}
            onRenderLabel={onRenderLabel}
            multiline={props.multiline}
            description={props.description}
        />
    );
};

export default CappedTextField;
