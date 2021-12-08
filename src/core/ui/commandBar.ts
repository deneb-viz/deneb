export {
    commandBarStyles,
    commandBarButtonStyles,
    commandBarOverflowProps,
    getAutoApplyToggle,
    getCommandBarItems,
    getCommandBarFarItems,
    getCommandBarOverflowItems
};

import { IButtonStyles, IButtonProps } from '@fluentui/react/lib/Button';
import {
    ICommandBarItemProps,
    ICommandBarStyles
} from '@fluentui/react/lib/CommandBar';
import { IContextualMenuStyles } from '@fluentui/react/lib/ContextualMenu';

import { resolveAutoApplyToggleAria } from './aria';
import {
    isApplyButtonDisabled,
    createExportableTemplate,
    createNewSpec,
    openHelpSite,
    repairFormatJson,
    handleApply,
    handleAutoApply,
    openMapFieldsDialog
} from './commands';
import { getAutoApplyIcon } from './icons';
import { resolveAutoApplyLabel } from './labels';

import { theme } from './fluent';
import { i18nValue } from './i18n';
import store, { getState } from '../../store';

const commandBarStyles: ICommandBarStyles = {
    root: {
        backgroundColor: theme.palette.neutralLighterAlt,
        padding: 0
    }
};
const commandBarButtonStyles: IButtonStyles = {
    root: {
        backgroundColor: theme.palette.neutralLighterAlt
    },
    rootDisabled: {
        backgroundColor: theme.palette.neutralLighterAlt
    },
    icon: { color: theme.palette.neutralPrimary },
    iconHovered: { color: theme.palette.neutralDark },
    iconPressed: { color: theme.palette.neutralDark },
    iconChecked: { color: theme.palette.neutralDark }
};
const menuStyles: Partial<IContextualMenuStyles> = {
    subComponentStyles: {
        menuItem: {
            root: {
                backgroundColor: theme.palette.white
            },
            icon: { color: theme.palette.neutralPrimary },
            iconHovered: { color: theme.palette.neutralDark },
            iconPressed: { color: theme.palette.neutralDark },
            iconChecked: { color: theme.palette.neutralDark }
        },
        callout: {}
    }
};
const commandBarOverflowProps = (): IButtonProps => ({
    styles: commandBarButtonStyles,
    ariaLabel: i18nValue('Button_More_Commands'),
    menuProps: {
        styles: menuStyles,
        items: []
    }
});

const getApplyCommandItem = (): ICommandBarItemProps => ({
    key: 'applyChanges',
    text: i18nValue('Button_Apply'),
    ariaLabel: i18nValue('Button_Apply'),
    iconOnly: true,
    iconProps: {
        iconName: 'Play'
    },
    buttonStyles: commandBarButtonStyles,
    disabled: isApplyButtonDisabled(),
    onClick: handleApply
});

const getAutoApplyToggle = (
    enabled: boolean,
    canAutoApply: boolean
): ICommandBarItemProps => ({
    key: 'autoApply',
    text: resolveAutoApplyLabel(enabled),
    ariaLabel: resolveAutoApplyToggleAria(enabled),
    iconOnly: true,
    iconProps: {
        iconName: getAutoApplyIcon(enabled)
    },
    toggle: true,
    checked: enabled,
    buttonStyles: commandBarButtonStyles,
    disabled: !canAutoApply,
    onClick: handleAutoApply
});

/**
 * Gets the command bar items for the left side of the bar, which is concerned with persistence.
 */
const getCommandBarItems = (): ICommandBarItemProps[] => {
    const { editorAutoApply, editorCanAutoApply } = store((state) => state);
    return [
        getApplyCommandItem(),
        getAutoApplyToggle(editorAutoApply, editorCanAutoApply),
        getRepairFormatCommandItem(),
        getMapFieldsCommandItem()
    ];
};

/**
 * Get any items we've prescribed as needing to be inthe overflow area.
 */
const getCommandBarOverflowItems = (): ICommandBarItemProps[] => [];

/**
 * Gets the command bar items for the far side of the bar, which is concerned with templating and support operations.
 */
const getCommandBarFarItems = (): ICommandBarItemProps[] => [
    getNewSpecCommandItem(),
    getExportSpecCommandItem(),
    getHelpCommandItem()
];

const getExportSpecCommandItem = (): ICommandBarItemProps => {
    const { editorSpec } = getState();
    return {
        key: 'export',
        text: i18nValue('Button_Export'),
        iconOnly: true,
        ariaLabel: i18nValue('Button_Export'),
        iconProps: { iconName: 'Share' },
        buttonStyles: commandBarButtonStyles,
        disabled: !(editorSpec?.status === 'valid'),
        onClick: createExportableTemplate
    };
};

const getHelpCommandItem = (): ICommandBarItemProps => ({
    key: 'help',
    text: i18nValue('Button_Help'),
    ariaLabel: i18nValue('Button_Reset'),
    iconOnly: true,
    iconProps: { iconName: 'Help' },
    buttonStyles: commandBarButtonStyles,
    onClick: openHelpSite
});

const getNewSpecCommandItem = (): ICommandBarItemProps => ({
    key: 'reset',
    text: i18nValue('Button_New'),
    iconOnly: true,
    ariaLabel: i18nValue('Button_New'),
    iconProps: { iconName: 'Page' },
    buttonStyles: commandBarButtonStyles,
    onClick: createNewSpec
});

const getRepairFormatCommandItem = (): ICommandBarItemProps => ({
    key: 'formatJson',
    text: i18nValue('Button_Format_Json'),
    ariaLabel: i18nValue('Button_Format_Json'),
    iconOnly: true,
    iconProps: { iconName: 'Repair' },
    buttonStyles: commandBarButtonStyles,
    onClick: repairFormatJson
});

const getMapFieldsCommandItem = (): ICommandBarItemProps => ({
    key: 'mapFields',
    text: i18nValue('Button_Map_Fields'),
    ariaLabel: i18nValue('Button_Map_Fields'),
    iconOnly: true,
    iconProps: { iconName: 'Switch' },
    buttonStyles: commandBarButtonStyles,
    onClick: openMapFieldsDialog
});
