import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { useDenebState } from '@deneb-viz/app-core';
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
 * `Height`, plus the deltas the gate predicate cares about. It also
 * shows the dimensions the last compile baked into the patched spec
 * as the stored compilation's `denebContainer` init (`ci.*` —
 * rewritten in place on settled resizes) and the Vega container element's client vs scroll box (`ct.*`)
 * — together these localise a stale-size render to either the
 * viewport→compile chain, the re-embed, or the physical iframe (#480
 * OoF residual).
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

/**
 * Id of the Vega output container element — the OverlayScrollbars
 * viewport that `VisualViewer` labels via its `initialized` event.
 * Mirrors `VEGA_CONTAINER_ID` in app-core's visual-viewer feature
 * (not exported from the package barrel; a dev-only overlay does not
 * justify widening the public surface for one string).
 */
const VEGA_CONTAINER_ELEMENT_ID = 'deneb-vega-container';

type ContainerBox = { cw: number; ch: number; sw: number; sh: number };

/**
 * CSS-pixel size of the rendered Vega output element (canvas or svg
 * renderer). Read via getBoundingClientRect so it reflects layout
 * size, not the DPR-scaled canvas backing store. This closes the
 * `ct.sh` blind spot: scrollHeight can never read SMALLER than
 * clientHeight, so a stale undersized view inside a grown container
 * is invisible to the container probe — but shows directly here.
 */
type ViewBox = { w: number; h: number };

/**
 * Structural view of the compilation result — just enough to pull the
 * `denebContainer` signal's init value (the literal container
 * dimensions the last compile baked into the patched spec). Local
 * structural type rather than the vega-runtime types so this dev
 * overlay adds no cross-package type dependency.
 */
type CompilationResultShape = {
    status?: string;
    parsed?: {
        spec?: {
            signals?: Array<{
                name?: string;
                value?: { width?: number; height?: number };
            }>;
        } | null;
    };
} | null;

export const ViewportGateDebugOverlay = () => {
    const mode = useDenebVisualState((state) => state.interface.mode);
    const embedViewport = useDenebVisualState(
        (state) => state.interface.embedViewport
    );
    const optionsViewport = useDenebVisualState(
        (state) => state.updates.options?.viewport
    );
    // The dimensions the stored compilation's `denebContainer` init
    // currently carries (`ci.*` = compile init). Settled container
    // resizes rewrite this init in place (geometry → cheap re-embed;
    // see the container-signal consolidation design, Revision 2), so
    // these track settled dimensions. Divergence from ev/ct is
    // expected only transiently, inside the resize debounce window —
    // a PERSISTENT divergence means the geometry channel broke.
    const compilationResult = useDenebState(
        (state) => state.compilation.result as CompilationResultShape
    );
    // `renderId` regenerates on every successful embed (see
    // `handleEmbed` in app-core's vega-embed.tsx), so comparing it
    // across a repro distinguishes "the re-embed never fired" from
    // "it fired but the view was subsequently resized to a stale
    // dimension". `viewReady` is the embed-in-flight window flag.
    const renderId = useDenebState((state) => state.interface.renderId);
    const viewReady = useDenebState((state) => state.compilation.viewReady);
    const compiledDims = useMemo(() => {
        if (compilationResult?.status !== 'ready') return undefined;
        return compilationResult.parsed?.spec?.signals?.find(
            (signal) => signal.name === 'denebContainer'
        )?.value;
    }, [compilationResult]);

    // window.innerWidth/Height are not reactive; poll them at the
    // same cadence the gate's effect polls (100ms). Cheap. The Vega
    // container element (OverlayScrollbars viewport) is polled on the
    // same tick — clientHeight is the physical container box,
    // scrollHeight the rendered content extent, so a stale Vega view
    // shows up as ct.sh disagreeing with ct.ch.
    const [iw, setIw] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 0
    );
    const [ih, setIh] = useState<number>(
        typeof window !== 'undefined' ? window.innerHeight : 0
    );
    const [containerBox, setContainerBox] = useState<ContainerBox>();
    const [viewBox, setViewBox] = useState<ViewBox>();
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const tick = () => {
            setIw(window.innerWidth);
            setIh(window.innerHeight);
            const container = document.getElementById(
                VEGA_CONTAINER_ELEMENT_ID
            );
            const next = container
                ? {
                      cw: container.clientWidth,
                      ch: container.clientHeight,
                      sw: container.scrollWidth,
                      sh: container.scrollHeight
                  }
                : undefined;
            setContainerBox((previous) =>
                previous?.cw === next?.cw &&
                previous?.ch === next?.ch &&
                previous?.sw === next?.sw &&
                previous?.sh === next?.sh
                    ? previous
                    : next
            );
            const viewElement = container?.querySelector('canvas, svg');
            const viewRect = viewElement?.getBoundingClientRect();
            const nextView = viewRect
                ? {
                      w: Math.round(viewRect.width),
                      h: Math.round(viewRect.height)
                  }
                : undefined;
            setViewBox((previous) =>
                previous?.w === nextView?.w && previous?.h === nextView?.h
                    ? previous
                    : nextView
            );
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
        `ev.h      ${formatNumber(evh)}    Δ ${formatDelta(ih, evh)}`,
        `ci.w      ${formatNumber(compiledDims?.width)}    Δ ${formatDelta(iw, compiledDims?.width)}`,
        `ci.h      ${formatNumber(compiledDims?.height)}    Δ ${formatDelta(ih, compiledDims?.height)}`,
        `ct.cw/sw  ${formatNumber(containerBox?.cw)} / ${formatNumber(containerBox?.sw)}`,
        `ct.ch/sh  ${formatNumber(containerBox?.ch)} / ${formatNumber(containerBox?.sh)}`,
        `cv.w      ${formatNumber(viewBox?.w)}    Δ ${formatDelta(iw, viewBox?.w)}`,
        `cv.h      ${formatNumber(viewBox?.h)}    Δ ${formatDelta(ih, viewBox?.h)}`,
        `rid       ${renderId ? String(renderId).slice(0, 8) : '—'}`,
        `vr        ${viewReady ? 'true' : 'false'}`
    ];

    return (
        <DevOverlayShell
            title='viewport gate'
            position='top-right'
            maxWidth={240}
            clipboardText={() => lines.join('\n')}
        >
            <pre style={PRE_STYLE}>{lines.join('\n')}</pre>
        </DevOverlayShell>
    );
};
