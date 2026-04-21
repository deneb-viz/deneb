import type { ReactNode } from 'react';
import { makeStyles, Tooltip } from '@fluentui/react-components';

import { useDataTableTooltip } from './data-table-tooltip-context';

type DataTableHeaderCellProps = {
    label: ReactNode;
    /**
     * Optional help text shown on hover. When absent or empty, the header
     * renders plainly with no tooltip wrapper. May contain `\n` to force
     * line breaks in the rendered tooltip.
     */
    tooltip?: string | null;
};

const useStyles = makeStyles({
    // Fluent's default tooltip content collapses `\n` to whitespace because
    // the container inherits `white-space: normal`. `pre-line` preserves
    // explicit line breaks from the i18n string while still allowing soft
    // wrapping when the line exceeds the tooltip width.
    tooltipContent: {
        whiteSpace: 'pre-line'
    }
});

/**
 * Renders a column header with an optional help tooltip. Uses the same
 * Fluent `<Tooltip>` + shared mount-node pattern as `DataTableCell`, so
 * header tooltips portal alongside cell tooltips instead of falling back to
 * the browser-native `title` attribute (which can't be dismissed
 * programmatically and conflicts with the inspector popover).
 */
export const DataTableHeaderCell = ({
    label,
    tooltip
}: DataTableHeaderCellProps) => {
    const mountNode = useDataTableTooltip();
    const classes = useStyles();
    if (!tooltip) {
        return <span>{label}</span>;
    }
    return (
        <Tooltip
            content={<span className={classes.tooltipContent}>{tooltip}</span>}
            relationship='description'
            withArrow
            mountNode={mountNode}
        >
            <span>{label}</span>
        </Tooltip>
    );
};
