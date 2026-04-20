import type { ReactNode } from 'react';
import { Tooltip } from '@fluentui/react-components';

import { useDataTableTooltip } from './data-table-tooltip-context';

type DataTableHeaderCellProps = {
    label: ReactNode;
    /**
     * Optional help text shown on hover. When absent or empty, the header
     * renders plainly with no tooltip wrapper.
     */
    tooltip?: string | null;
};

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
    if (!tooltip) {
        return <span>{label}</span>;
    }
    return (
        <Tooltip
            content={tooltip}
            relationship='description'
            withArrow
            mountNode={mountNode}
        >
            <span>{label}</span>
        </Tooltip>
    );
};
