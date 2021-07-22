import { IButtonStyles } from '@fluentui/react/lib/Button';
import {
    ICommandBarItemProps,
    ICommandBarStyles
} from '@fluentui/react/lib/CommandBar';

import { resolveAutoApplyToggleAria } from './aria';
import { toggleAutoApplyState } from './commands';
import { getAutoApplyIcon } from './icons';
import { resolveAutoApplyLabel } from './labels';

import { theme } from '../../api/fluent';

export const commandBarStyles: ICommandBarStyles = {
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

export const getAutoApplyToggle = (
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
    onClick: toggleAutoApplyState
});
