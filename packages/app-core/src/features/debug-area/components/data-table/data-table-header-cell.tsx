import type { ReactNode } from 'react';

import { DataTableTooltip } from './data-table-tooltip';

type DataTableHeaderCellProps = {
    label: ReactNode;
    /**
     * Optional help text shown on hover. When absent or empty, the header
     * renders plainly with no tooltip wrapper. May contain `\n` to force
     * line breaks in the rendered tooltip.
     */
    tooltip?: string | null;
};

/**
 * Renders a column header with an optional help tooltip. Delegates to
 * `DataTableTooltip` so header tooltips portal alongside cell tooltips
 * (via the shared `DataTableTooltipProvider` mount node) and honour `\n`
 * line breaks uniformly with the rest of the debug-area table.
 */
export const DataTableHeaderCell = ({
    label,
    tooltip
}: DataTableHeaderCellProps) => (
    <DataTableTooltip content={tooltip}>
        <span>{label}</span>
    </DataTableTooltip>
);
