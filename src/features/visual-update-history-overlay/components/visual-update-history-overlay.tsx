import { useMemo, type CSSProperties } from 'react';

import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { useDenebVisualState } from '../../../state';
import { CollapsibleSection, DevOverlayShell } from '../../dev-overlay-shell';
import { type RenderingLifecycleEvent } from '../../../lib/rendering-lifecycle';
import { computeLifecycleTally } from '../lib/compute-tally';

export const IS_OVERLAY_ENABLED = toBoolean(process.env.PBIVIZ_DEV_OVERLAY);

const SECTION_HEADING_STYLE: CSSProperties = {
    fontWeight: 600,
    marginBottom: 4,
    color: 'rgba(255, 255, 255, 0.7)'
};

const HR_STYLE: CSSProperties = {
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.18)',
    margin: '8px 0'
};

const FAILURE_LINE_STYLE: CSSProperties = {
    color: 'rgba(255, 200, 120, 0.95)',
    marginBottom: 2
};

const HISTORY_PRE_STYLE: CSSProperties = {
    margin: 0,
    fontSize: '10px',
    lineHeight: 1.3,
    color: 'rgba(220, 220, 220, 0.9)'
};

/**
 * Dev-only HUD that surfaces rendering-lifecycle observability and
 * visual update history in a single consolidated overlay (top-left).
 * Enabled by `PBIVIZ_DEV_OVERLAY=true`.
 *
 * Three stacked sections inside one collapsible shell:
 *
 *  1. **Lifecycle tally** — live counts of opens, render-starts,
 *     closes (broken out by `via`: `sync-current` for U8 sync
 *     closes, `async-pending-render` for U9/U10, `safety-net` for
 *     the 10s backstop), fails (also discriminated), safety-net
 *     activity, and pending ids. A sustained `pending > 1`
 *     indicates a real orphan.
 *
 *  2. **Recent failures** — shown only when at least one `failed`
 *     event exists. The **only surface** that can show error
 *     context in certified builds: Power BI cert rules forbid
 *     `console.error`, and the host's `renderingFailed` reason
 *     string is a write-only sink. The observer stream captures
 *     the original error value alongside the reason string at the
 *     coordinator's emission point; this section surfaces them for
 *     the developer.
 *
 *  3. **Update history** — JSON dump of the recent display-history
 *     records (replaces the old hidden-by-default 20×20 textarea —
 *     now visible by default and scrollable in the shell body).
 */
export const VisualUpdateHistoryOverlay = () => {
    const history = useDenebVisualState((state) => state.updates.history);
    const lifecycleEvents = useDenebVisualState(
        (state) => state.updates.lifecycleEvents
    );
    const tally = useMemo(
        () => computeLifecycleTally(lifecycleEvents),
        [lifecycleEvents]
    );
    const recentFailures = useMemo(
        () =>
            lifecycleEvents
                .filter(
                    (
                        event
                    ): event is Extract<
                        RenderingLifecycleEvent,
                        { kind: 'failed' }
                    > => event.kind === 'failed'
                )
                .slice(-6),
        [lifecycleEvents]
    );

    const tallyText = [
        `opens:        ${tally.opens}`,
        `render-start: ${tally.renderStarts}`,
        `closes:       ${tally.closes.total}` +
            `  (sync: ${tally.closes.syncCurrent},` +
            ` async: ${tally.closes.asyncPendingRender},` +
            ` net: ${tally.closes.safetyNet})`,
        `fails:        ${tally.fails.total}` +
            `  (sync: ${tally.fails.syncCurrent},` +
            ` async: ${tally.fails.asyncPendingRender},` +
            ` sup: ${tally.fails.superseded})`,
        `safety-net:   armed ${tally.safetyNet.armed}` +
            ` / ticks: closed ${tally.safetyNet.closedByTick},` +
            ` inert ${tally.safetyNet.inert}`,
        `pending:      ${tally.pending}` +
            (tally.pendingIds.length > 0
                ? `  [${tally.pendingIds.join(', ')}]`
                : '')
    ].join('\n');

    // Structured dump for the title-bar copy button — the update
    // history records (type + viewport per update) are the primary
    // evidence when diagnosing host update sequences in Desktop, where
    // there are no DevTools to capture them any other way. `opened`
    // events embed the full VisualUpdateOptions (dataViews + spec),
    // which balloons the payload past what can be pasted into an
    // issue or chat — compact them to the update-shape essentials,
    // keeping the persisted `stateManagement` object (it evidences
    // viewport-persistence pollution, e.g. #480's OoF residue).
    const getClipboardText = () => {
        const compactEvents = lifecycleEvents.map((event) =>
            event.kind === 'opened'
                ? {
                      ...event,
                      options: {
                          type: event.options.type,
                          viewport: event.options.viewport,
                          editMode: event.options.editMode,
                          viewMode: event.options.viewMode,
                          isInFocus: event.options.isInFocus,
                          formatMode: (
                              event.options as { formatMode?: boolean | null }
                          ).formatMode,
                          updateId: (event.options as { updateId?: string })
                              .updateId,
                          stateManagement:
                              event.options.dataViews?.[0]?.metadata?.objects
                                  ?.stateManagement
                      }
                  }
                : event
        );
        return JSON.stringify(
            { tally, recentFailures, history, lifecycleEvents: compactEvents },
            null,
            2
        );
    };

    return (
        <DevOverlayShell
            title='lifecycle + history'
            position='top-left'
            maxWidth={520}
            clipboardText={getClipboardText}
        >
            <div style={SECTION_HEADING_STYLE}>lifecycle tally</div>
            <pre style={HISTORY_PRE_STYLE}>{tallyText}</pre>

            {recentFailures.length > 0 && (
                <>
                    <hr style={HR_STYLE} />
                    <div style={SECTION_HEADING_STYLE}>recent failures</div>
                    {recentFailures.map((event, index) => (
                        <div
                            key={`${event.id}-${index}`}
                            style={FAILURE_LINE_STYLE}
                        >
                            id={event.id} via={event.via} reason={event.reason}
                        </div>
                    ))}
                </>
            )}

            <hr style={HR_STYLE} />
            <CollapsibleSection title='update history' initiallyCollapsed>
                <pre style={HISTORY_PRE_STYLE}>
                    {JSON.stringify(history, null, 2)}
                </pre>
            </CollapsibleSection>
        </DevOverlayShell>
    );
};
