import {
    Caption1,
    makeStyles,
    TextProps,
    tokens
} from '@fluentui/react-components';

const useSettingsTextSectionStyles = makeStyles({
    root: {
        display: 'flex',
        userSelect: 'none',
        msUserSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        padding: `${tokens.spacingVerticalMNudge} ${tokens.spacingHorizontalXS}`
    }
});

export const SettingsTextSection = (props: TextProps) => {
    const classes = useSettingsTextSectionStyles();
    return (
        <div className={classes.root}>
            <Caption1>{props.children}</Caption1>
        </div>
    );
};
