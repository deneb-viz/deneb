import * as React from 'react';
import { useSelector } from 'react-redux';
import { useId } from '@fluentui/react-hooks';
import { IIconProps } from '@fluentui/react/lib/Icon';
import { ActionButton } from '@fluentui/react/lib/Button';
import { v4 as uuidv4 } from 'uuid';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { actionButtonStyles } from '../../config/styles';
import { templateService } from '../../services';

const importIcon: IIconProps = { iconName: 'OpenFile' };

const ImportTemplateControl: React.FC = () => {
    Debugger.log('Rendering Component: [ImportTemplateControl]...');
    const root = useSelector(state),
        { visual } = root,
        { i18n } = visual,
        inputRef = React.useRef<HTMLInputElement>(null),
        [fileKey, setFileKey] = React.useState(uuidv4()),
        handleActionClick = () => inputRef.current.click(),
        handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            templateService.handleFileSelect(e.target.files);
            setFileKey(uuidv4());
        },
        inputId = useId('importTemplate');
    return (
        <>
            <div>
                <ActionButton
                    onClick={handleActionClick}
                    iconProps={importIcon}
                    styles={actionButtonStyles}
                >
                    {i18n.getDisplayName('Button_Import')}
                </ActionButton>
                <input
                    id={inputId}
                    ref={inputRef}
                    key={fileKey}
                    type='file'
                    onChange={handleInput}
                    accept='application/json'
                    style={{ display: 'none' }}
                />
            </div>
        </>
    );
};

export default ImportTemplateControl;
