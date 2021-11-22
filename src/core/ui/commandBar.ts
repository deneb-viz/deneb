export {
    commandBarStyles,
    commandBarButtonStyles,
    getAutoApplyToggle,
    getCommandBarItems,
    getCommandBarFarItems
};

import { IButtonStyles } from '@fluentui/react/lib/Button';
import {
    ICommandBarItemProps,
    ICommandBarStyles
} from '@fluentui/react/lib/CommandBar';

import { resolveAutoApplyToggleAria } from './aria';
import {
    isApplyButtonDisabled,
    createExportableTemplate,
    createNewSpec,
    openHelpSite,
    repairFormatJson,
    handleApply,
    handleAutoApply
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
    },
    commandBarButtonStyles: IButtonStyles = {
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
        getRepairFormatCommandItem()
    ];
};

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
