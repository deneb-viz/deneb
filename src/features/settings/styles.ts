import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useSettingsStyles = makeStyles({
    radioGroupLabel: {
        userSelect: 'none',
        msUserSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none'
    },
    sectionItem: {
        display: 'flex'
    },
    sectionItemIndented: {
        display: 'flex',
        paddingLeft: tokens.spacingHorizontalL
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
