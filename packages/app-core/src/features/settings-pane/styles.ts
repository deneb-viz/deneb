import {
    GriffelStyle,
    makeStyles,
    shorthands,
    tokens
} from '@fluentui/react-components';

/**
 * Fluent style slots for the spin-button rows, shared by the app-core settings
 * pane and the root visual's settings UI so the two panes can't drift apart.
 */
export const spinButtonStyleSlots = {
    spinButtonContainer: {
        display: 'flex',
        flexBasis: '100%',
        flexDirection: 'row',
        '> label': {
            marginRight: tokens.spacingHorizontalM
        },
        alignItems: 'center',
        ...shorthands.padding('5px', tokens.spacingHorizontalNone)
    },
    spinButtonControl: {
        width: '80px'
    }
} satisfies Record<string, GriffelStyle>;

export const useSettingsPaneStyles = makeStyles({
    radioGroupHorizontal: {
        display: 'grid',
        gridRowGap: tokens.spacingVerticalS
    },
    ...spinButtonStyleSlots
});
