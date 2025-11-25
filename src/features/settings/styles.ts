import {
    makeStyles,
    shorthands,
    tokens,
    typographyStyles
} from '@fluentui/react-components';

export const useSettingsStyles = makeStyles({
    interactivityLink: {
        ...typographyStyles.caption1
    },
    radioGroupLabel: {
        userSelect: 'none',
        msUserSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none'
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
    }
});
