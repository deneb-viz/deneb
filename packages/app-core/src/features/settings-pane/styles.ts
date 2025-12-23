import { makeStyles, tokens } from '@fluentui/react-components';

export const useSettingsPaneStyles = makeStyles({
    radioGroupHorizontal: {
        display: 'grid',
        gridRowGap: tokens.spacingVerticalS
    },
    sectionContainer: {
        display: 'flex',
        flexDirection: 'column',
        padding: `${tokens.spacingVerticalMNudge} ${tokens.spacingHorizontalNone}`
    }
});
