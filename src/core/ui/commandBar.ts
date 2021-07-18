import { ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';

import { commandBarButtonStyles } from '../../config/styles';
import { resolveAutoApplyToggleAria } from './aria';
import { toggleAutoApplyState } from './commands';
import { getAutoApplyIcon } from './icons';
import { resolveAutoApplyLabel } from './labels';

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
