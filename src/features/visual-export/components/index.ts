import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useVisualExportStyles = makeStyles({
    informationContainer: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        ...shorthands.gap(tokens.spacingVerticalM, tokens.spacingVerticalNone)
    },
    informationDetails: {
        flexGrow: 1,
        paddingRight: tokens.spacingHorizontalM,
        borderRightColor: tokens.colorNeutralStroke2,
        borderRightWidth: '1px',
        borderRightStyle: 'solid'
    },
    informationPreviewCheckbox: {
        marginTop: tokens.spacingVerticalXL
    }
});
