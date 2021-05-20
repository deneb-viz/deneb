import * as React from 'react';
import { useSelector } from 'react-redux';
import {
    CommandBar,
    ICommandBarItemProps
} from '@fluentui/react/lib/CommandBar';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { commandBarStyles, commandBarButtonStyles } from '../../config/styles';
import { commandService } from '../../services';

const EditorCommandBar: React.FC = () => {
    Debugger.log('Rendering Component: [EditorCommandBar]...');
    const { i18n } = useSelector(state).visual,
        _items = getItems(),
        _farItems = getFarItems();

    return (
        <div style={{ width: '100%' }}>
            <CommandBar
                items={_items}
                farItems={_farItems}
                ariaLabel={i18n.getDisplayName('CommandBar_Aria_Label')}
                styles={commandBarStyles}
            />
        </div>
    );
};

function getItems(): ICommandBarItemProps[] {
    Debugger.log('Getting CommandBar _items...');
    const { autoApply, canAutoApply, i18n } = useSelector(state).visual,
        handleApply = () => commandService.applyChanges(),
        handleAutoApply = () => commandService.toggleAutoApply(),
        handleFix = () => commandService.repairFormatJson();
    return [
        {
            key: 'applyChanges',
            text: i18n.getDisplayName('Button_Apply'),
            ariaLabel: i18n.getDisplayName('Button_Apply'),
            ariaDescription: 'Hi',
            iconOnly: true,
            iconProps: {
                iconName: 'Play'
            },
            buttonStyles: commandBarButtonStyles,
            disabled: canAutoApply && autoApply,
            onClick: handleApply
        },
        {
            key: 'autoApply',
            text: autoApply
                ? i18n.getDisplayName('Button_Auto_Apply_Off')
                : i18n.getDisplayName('Button_Auto_Apply_On'),
            ariaLabel: autoApply
                ? i18n.getDisplayName('Button_Auto_Apply_Off')
                : i18n.getDisplayName('Button_Auto_Apply_On'),
            iconOnly: true,
            iconProps: {
                iconName: autoApply ? 'CircleStopSolid' : 'PlaybackRate1x'
            },
            toggle: true,
            checked: autoApply,
            buttonStyles: commandBarButtonStyles,
            disabled: !canAutoApply,
            onClick: handleAutoApply
        },
        {
            key: 'formatJson',
            text: i18n.getDisplayName('Button_Format_Json'),
            ariaLabel: i18n.getDisplayName('Button_Format_Json'),
            iconOnly: true,
            iconProps: { iconName: 'Repair' },
            buttonStyles: commandBarButtonStyles,
            onClick: handleFix
        }
    ];
}

function getFarItems(): ICommandBarItemProps[] {
    Debugger.log('Getting CommandBar _farItems...');
    const { i18n, spec } = useSelector(state).visual,
        handleNewSpec = () => commandService.createNewSpec(),
        handleExport = () => commandService.createExportableTemplate(),
        handleSupport = () => commandService.openHelpSite();
    return [
        {
            key: 'reset',
            text: i18n.getDisplayName('Button_New'),
            iconOnly: true,
            ariaLabel: i18n.getDisplayName('Button_New'),
            iconProps: { iconName: 'Page' },
            buttonStyles: commandBarButtonStyles,
            onClick: handleNewSpec
        },
        {
            key: 'export',
            text: i18n.getDisplayName('Button_Export'),
            iconOnly: true,
            ariaLabel: i18n.getDisplayName('Button_Export'),
            iconProps: { iconName: 'Share' },
            buttonStyles: commandBarButtonStyles,
            disabled: !(spec?.status === 'valid'),
            onClick: handleExport
        },
        {
            key: 'help',
            text: i18n.getDisplayName('Button_Help'),
            ariaLabel: i18n.getDisplayName('Button_Reset'),
            iconOnly: true,
            iconProps: { iconName: 'Help' },
            buttonStyles: commandBarButtonStyles,
            onClick: handleSupport
        }
    ];
}

export default EditorCommandBar;
