import type { ReactElement } from 'react';
import { makeStyles, Tooltip } from '@fluentui/react-components';

import { useDataTableTooltip } from './data-table-tooltip-context';

type DataTableTooltipProps = {
    /**
     * Text shown on hover/focus. When absent or empty, renders `children`
     * without a Fluent Tooltip wrapper — hover and focus don't produce an
     * empty tooltip, and the wrapping span's implicit description is
     * suppressed.
     *
     * May contain `\n` to force line breaks in the rendered tooltip.
     */
    content: string | null | undefined;
    /**
     * Must be a single React element — Fluent `<Tooltip>` clones the child
     * to inject ARIA description attributes, which requires an element
     * rather than a bare text node or fragment.
     */
    children: ReactElement;
};

const useStyles = makeStyles({
    // Fluent's default tooltip content inherits `white-space: normal` and
    // collapses `\n` to whitespace. `pre-line` preserves explicit line
    // breaks from i18n strings while still allowing soft wrap when the
    // line exceeds the tooltip width. Applied centrally here so every
    // consumer gets the same newline behaviour by construction rather than
    // by discipline.
    content: {
        whiteSpace: 'pre-line'
    }
});

/**
 * Shared Fluent `<Tooltip>` wrapper for debug-area table cells (header and
 * body). Centralises the `mountNode` wiring, the `relationship` /
 * `withArrow` configuration, and the `white-space: pre-line` content
 * styling so both call sites can't drift apart on any of those.
 */
export const DataTableTooltip = ({
    content,
    children
}: DataTableTooltipProps) => {
    const classes = useStyles();
    const mountNode = useDataTableTooltip();
    if (!content) {
        return <>{children}</>;
    }
    return (
        <Tooltip
            content={<span className={classes.content}>{content}</span>}
            relationship='description'
            withArrow
            mountNode={mountNode}
        >
            {children}
        </Tooltip>
    );
};
