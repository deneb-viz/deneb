import { useEffect, useState, type CSSProperties } from 'react';

import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { useDenebVisualState } from '../../../state';
import { DevOverlayShell } from '../../dev-overlay-shell';

/**
 * Read-only HUD that surfaces the live values consumed by the
 * viewport-match gate. Enabled by `PBIVIZ_VIEWPORT_GATE_OVERLAY=true`
 * in `.env`, off by default. Independent of `PBIVIZ_DEV_OVERLAY` so
 * either overlay can be enabled in isolation.
 *
 * Use case: Power BI Desktop has no DevTools, so when the gate's
 * match condition behaves differently in Desktop than in browser dev
 * the only way to see the actual values is to render them inside the
 * visual itself. This overlay shows mode, host-reported viewport,
 * stored embedViewport, and the iframe's `window.innerWidth` /
 * `Height`, plus the deltas the gate predicate cares about.
 */
export const IS_OVERLAY_ENABLED = toBoolean(
    process.env.PBIVIZ_VIEWPORT_GATE_OVERLAY
);

const POLL_INTERVAL_MS = 100;

const PRE_STYLE: CSSProperties = {
    margin: 0,
    fontSize: '11px',
    lineHeight: 1.35,
    whiteSpace: 'pre'
};

const formatNumber = (value: number | undefined): string =>
    value === undefined ? '—' : String(Math.round(value));

const formatDelta = (iframe: number, target: number | undefined): string => {
    if (target === undefined) return '—';
    const delta = Math.round(iframe - target);
    return `${delta >= 0 ? '+' : ''}${delta}`;
};

export const ViewportGateDebugOverlay = () => {
    const mode = useDenebVisualState((state) => state.interface.mode);
    const embedViewport = useDenebVisualState(
        (state) => state.interface.embedViewport
    );
    const optionsViewport = useDenebVisualState(
        (state) => state.updates.options?.viewport
    );

    // window.innerWidth/Height are not reactive; poll them at the
    // same cadence the gate's effect polls (100ms). Cheap.
    const [iw, setIw] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 0
    );
    const [ih, setIh] = useState<number>(
        typeof window !== 'undefined' ? window.innerHeight : 0
    );
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const tick = () => {
            setIw(window.innerWidth);
            setIh(window.innerHeight);
        };
        tick();
        const intervalId = window.setInterval(tick, POLL_INTERVAL_MS);
        window.addEventListener('resize', tick);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('resize', tick);
        };
    }, []);

    const ovw = optionsViewport?.width;
    const ovh = optionsViewport?.height;
    const evw = embedViewport?.width;
    const evh = embedViewport?.height;

    const lines = [
        `mode      ${mode}`,
        `iw        ${formatNumber(iw)}`,
        `ih        ${formatNumber(ih)}`,
        `ov.w      ${formatNumber(ovw)}    Δ ${formatDelta(iw, ovw)}`,
        `ov.h      ${formatNumber(ovh)}    Δ ${formatDelta(ih, ovh)}`,
        `ev.w      ${formatNumber(evw)}    Δ ${formatDelta(iw, evw)}`,
        `ev.h      ${formatNumber(evh)}    Δ ${formatDelta(ih, evh)}`
    ];

    return (
        <DevOverlayShell
            title='viewport gate'
            position='top-right'
            maxWidth={240}
        >
            <pre style={PRE_STYLE}>{lines.join('\n')}</pre>
        </DevOverlayShell>
    );
};
