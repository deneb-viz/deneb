import {
    Badge,
    Caption1,
    makeStyles,
    tokens
} from '@fluentui/react-components';
import { Warning20Filled } from '@fluentui/react-icons';

import { useDenebState } from '../../../../state';
import type { MetadataStripSpec } from './source-and-data-tab-utils';

const useMetadataStripStyles = makeStyles({
    strip: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        flexWrap: 'wrap',
        paddingBlock: tokens.spacingVerticalXS,
        paddingInline: tokens.spacingHorizontalM,
        rowGap: tokens.spacingVerticalXXS
    },
    badges: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalXS,
        display: 'flex',
        flexWrap: 'wrap',
        rowGap: tokens.spacingVerticalXXS
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
        display: 'inline-flex'
    }
});

export type MetadataStripProps = {
    spec: MetadataStripSpec;
};

/**
 * Summary strip shown above the dataset table on both the Source and Data
 * tabs. Renders the row count, a `Badge` per support-field (non-interactive
 * — see the plan's Key Technical Decisions), and optionally an error icon.
 *
 * The error badge is driven purely by `spec.errorBadge`; this component
 * does not read compilation state. `LogErrorIndicator` is intentionally not
 * reused here because it would fire on unrelated compile errors. Unit 6
 * sets `errorBadge` on the Data tab; the Source tab always leaves it
 * `false`.
 */
export const MetadataStrip = ({ spec }: MetadataStripProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useMetadataStripStyles();
    const supportFields = spec.supportFields ?? [];
    const rowCountLabel = translate('Text_Debug_MetadataStrip_RowCount', [
        spec.rowCount
    ]);
    return (
        <div className={classes.strip} role='status'>
            <Caption1>{rowCountLabel}</Caption1>
            {supportFields.length > 0 && (
                <div className={classes.badges}>
                    {supportFields.map((name) => (
                        <Badge
                            key={name}
                            appearance='outline'
                            shape='rounded'
                            size='small'
                        >
                            {name}
                        </Badge>
                    ))}
                </div>
            )}
            {spec.errorBadge && (
                <span
                    className={classes.errorIcon}
                    aria-label={translate('Text_Debug_MetadataStrip_Error')}
                    role='img'
                >
                    <Warning20Filled />
                </span>
            )}
        </div>
    );
};
