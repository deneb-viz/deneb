import * as React from 'react';
import { useId } from '@fluentui/react-hooks';

import { IIconProps } from '@fluentui/react/lib/Icon';
import { ActionButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { v4 as uuidv4 } from 'uuid';

import { onTemplateFileSelect } from '../../../core/template';
import { i18nValue } from '../../../core/ui/i18n';
import { theme } from '../../../core/ui/fluent';

const importIcon: IIconProps = { iconName: 'OpenFile' };

const actionButtonStyles: IButtonStyles = {
    root: {
        boxSizing: 'border-box',
        display: 'flex',
        padding: 10,
        selectors: {
            '&:hover': { background: theme.palette.neutralLight },
            '&:focus': { background: theme.palette.neutralLighterAlt }
        }
    },
    icon: { color: theme.palette.neutralPrimary },
    iconHovered: { color: theme.palette.neutralDark },
    iconPressed: { color: theme.palette.neutralDark },
    label: { color: theme.palette.neutralPrimary },
    labelHovered: { color: theme.palette.neutralDark }
};

const TemplateImportControl: React.FC = () => {
    const inputRef = React.useRef<HTMLInputElement>(null),
        [fileKey, setFileKey] = React.useState(uuidv4()),
        handleActionClick = () => inputRef.current.click(),
        handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            onTemplateFileSelect(e.target.files);
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
                    {i18nValue('Button_Import')}
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

export default TemplateImportControl;
