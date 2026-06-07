import { useMemo } from 'react';

import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { useDenebVisualState } from '../../../state';
import { computeLifecycleTally } from '../lib/compute-tally';

const IS_OVERLAY_ENABLED = toBoolean(process.env.PBIVIZ_DEV_OVERLAY);

const PANEL_BASE_STYLE: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    color: 'white',
    fontFamily: 'Consolas, monospace',
    fontSize: '11px',
    lineHeight: 1.3,
    padding: '6px 8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    zIndex: 9999,
    pointerEvents: 'auto'
};

const TALLY_PANEL_STYLE: React.CSSProperties = {
    ...PANEL_BASE_STYLE,
    top: '0',
    left: '0',
    minWidth: '240px',
    whiteSpace: 'pre',
    display: 'block'
};

const FAILURES_PANEL_STYLE: React.CSSProperties = {
    ...PANEL_BASE_STYLE,
    top: '0',
    left: '260px',
    maxWidth: '420px',
    maxHeight: '160px',
    overflowY: 'auto',
    color: 'rgba(255, 200, 120, 0.95)',
    display: 'block'
};

const HISTORY_TEXTAREA_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: '170px',
    left: '0',
    width: '20px',
    height: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    zIndex: 9999,
    display: 'block'
};

/**
 * Dev-only HUD for the visual's rendering-lifecycle observability.
 * Three panels stack at the top-left of the visual surface when
 * `PBIVIZ_DEV_OVERLAY=true`:
 *
 *  1. **Tally panel** — live counts of opens, render-starts, closes
 *     (broken out by `via` discriminator: `sync-current` for U8
 *     synchronous dispatch closes, `async-pending-render` for
 *     U9/U10 vega-embed/incremental closes, `safety-net` for the
 *     coordinator's 10s backstop), fails (also discriminated),
 *     safety-net activity, and the count of currently-pending ids.
 *     A non-zero `pending` count sustained across multiple updates
 *     is the orphan signal — for healthy traces it stabilises at
 *     0 or 1.
 *
 *  2. **Failures panel** — the most recent `failed` events with
 *     their reason strings. This is the **only surface** that can
 *     show error context in certified builds: Power BI cert rules
 *     forbid `console.error`, and the host's `renderingFailed`
 *     reason string is a write-only sink. The observer stream
 *     captures the original `error` value alongside the reason
 *     string at the coordinator's emission point, and this panel
 *     surfaces them for the developer.
 *
 *  3. **History textarea** — the pre-existing legacy visual update
 *     history JSON dump (~20×20 px at the bottom-left). Preserved
 *     unchanged; the textarea is resizable so a developer can
 *     drag it open when needed.
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
                .filter((event) => event.kind === 'failed')
                .slice(-6),
        [lifecycleEvents]
    );

    if (!IS_OVERLAY_ENABLED) return <></>;

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
            ` def ${tally.safetyNet.deferred},` +
            ` inert ${tally.safetyNet.inert}`,
        `pending:      ${tally.pending}` +
            (tally.pendingIds.length > 0
                ? `  [${tally.pendingIds.join(', ')}]`
                : '')
    ].join('\n');

    return (
        <>
            <div style={TALLY_PANEL_STYLE}>{tallyText}</div>
            {recentFailures.length > 0 && (
                <div style={FAILURES_PANEL_STYLE}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        recent failures
                    </div>
                    {recentFailures.map((event, index) => {
                        if (event.kind !== 'failed') return null;
                        return (
                            <div
                                key={`${event.id}-${index}`}
                                style={{ marginBottom: '3px' }}
                            >
                                id={event.id} via={event.via} reason=
                                {event.reason}
                            </div>
                        );
                    })}
                </div>
            )}
            <textarea
                style={HISTORY_TEXTAREA_STYLE}
                value={JSON.stringify(history, null, 2)}
                readOnly
            />
        </>
    );
};
