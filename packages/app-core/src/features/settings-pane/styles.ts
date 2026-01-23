import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useSettingsPaneStyles = makeStyles({
    radioGroupHorizontal: {
        display: 'grid',
        gridRowGap: tokens.spacingVerticalS
    },
    sectionContainer: {
        display: 'flex',
        flexDirection: 'column',
        padding: `${tokens.spacingVerticalMNudge} ${tokens.spacingHorizontalNone}`
    },
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
});
