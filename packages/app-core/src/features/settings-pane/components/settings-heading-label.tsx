import {
    Label,
    LabelProps,
    makeStyles,
    tokens
} from '@fluentui/react-components';

const useSettingsHeadingLabelStyles = makeStyles({
    root: {
        display: 'flex',
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalNone}`
    }
});

export const SettingsHeadingLabel = (props: LabelProps) => {
    const classes = useSettingsHeadingLabelStyles();
    return (
        <div className={classes.root}>
            <Label weight='semibold' {...props} />
        </div>
    );
};
