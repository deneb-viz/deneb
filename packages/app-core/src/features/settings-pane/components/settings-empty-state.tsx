import {
    makeStyles,
    tokens,
    typographyStyles
} from '@fluentui/react-components';

import { useDenebState } from '../../../state';

type SettingsEmptyStateProps = {
    /** The current query string — surfaced in the message. */
    query: string;
};

const useStyles = makeStyles({
    root: {
        ...typographyStyles.body1,
        color: tokens.colorNeutralForeground2,
        padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalL}`,
        textAlign: 'center'
    }
});

/**
 * Substitute `{0}` in a translated template with the provided value.
 * Exported for tests — plain text insertion, no HTML escaping needed
 * since React handles it.
 */
export const formatEmptyStateMessage = (
    template: string,
    query: string
): string => template.replace('{0}', query);

/**
 * Rendered when the active query filters every section to zero rows
 * and no always-visible platform section exists. Uses `role='status'`
 * so the result is announced by assistive tech.
 */
export const SettingsEmptyState = ({ query }: SettingsEmptyStateProps) => {
    const classes = useStyles();
    const translate = useDenebState((state) => state.i18n.translate);
    const template = translate('Text_Settings_Search_NoMatches');
    return (
        <div className={classes.root} role='status'>
            {formatEmptyStateMessage(template, query)}
        </div>
    );
};
