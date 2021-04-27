import * as React from 'react';
import { useSelector } from 'react-redux';

import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { useBoolean } from '@uifabric/react-hooks';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { IDataFieldLabelProps } from '../../types';

const SwitchableMultilineText: React.FC<IDataFieldLabelProps> = (props) => {
    const root = useSelector(state),
        { i18n } = root.visual,
        { datasetField } = props,
        [multiline, { toggle: toggleMultiline }] = useBoolean(false),
        onChange = (
            ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
            newText: string
        ): void => {
            const newMultiline = newText.length > 50;
            if (newMultiline !== multiline) {
                toggleMultiline();
            }
        };
    Debugger.log('Rendering component: [SwitchableMultilineText]...');
    return (
        <TextField
            placeholder={i18n.getDisplayName(
                'Template_Description_Optional_Placeholder'
            )}
            multiline={multiline}
            // eslint-disable-next-line react/jsx-no-bind
            onChange={onChange}
        />
    );
};

export default SwitchableMultilineText;
