import * as React from 'react';
import { useSelector } from 'react-redux';
import { useId } from '@uifabric/react-hooks';
import { IIconProps } from 'office-ui-fabric-react';
import { ActionButton } from 'office-ui-fabric-react/lib/Button';

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
        handleActionClick = () => inputRef.current.click(),
        handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
            templateService.handleFileSelect(e.target.files);
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
