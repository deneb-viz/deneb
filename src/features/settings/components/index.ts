import {
    makeStyles,
    shorthands,
    tokens,
    typographyStyles
} from '@fluentui/react-components';

export const useSettingsStyles = makeStyles({
    headingContainer: {
        display: 'flex',
        ...shorthands.padding('5px', '0px')
    },
    interactivityLink: {
        ...typographyStyles.caption1
    },
    paneContainer: {
        ...shorthands.overflow('overlay'),
        ...shorthands.padding('5px')
    },
    radioGroupHorizontal: {
        display: 'grid',
        gridRowGap: tokens.spacingVerticalS
    },
    radioGroupLabel: {
        userSelect: 'none',
        msUserSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none'
    },
    sectionContainer: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.padding('10px', '0px')
    },
    sectionItem: {
        display: 'flex'
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
    },
    textSectionContainer: {
        display: 'flex',
        userSelect: 'none',
        msUserSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        ...shorthands.padding('10px', '5px')
    }
});
