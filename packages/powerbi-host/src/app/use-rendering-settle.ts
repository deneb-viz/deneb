import { useEffect } from 'react';

import { useDenebVisualState } from '../state';
import { type VisualAppProps } from './kernel-config';

/**
 * Delay (ms) before the settle close fires for an update that did not start
 * a Vega render: long enough for a typical render to finish first, and short
 * enough to close an update that never reaches Vega well inside the kernel's
 * safety net.
 */
const RENDERING_MODE_SETTLE_MS = 500;

/**
 * Closes the pending rendering lifecycle for each update that won't reach,
 * or has already finished with, a Vega render.
 *
 *  - On a renderless surface Vega never embeds, so there is no in-flight
 *    render to protect: the update closes synchronously through the
 *    terminal `onRenderingFinished`.
 *  - On a rendering surface, an update that doesn't change Vega's inputs
 *    (such as a formatting property Vega doesn't read) never fires the
 *    embed callbacks, so a settle timer closes it through
 *    `onSettleClose`. That close DEFERS: it no-ops while a render is in
 *    flight, so a render slower than the timer is closed by its own embed
 *    callback (or the safety net) and is never pre-empted mid-render, and
 *    Power BI's export capture cannot see pre-render content.
 *
 * Effect cleanup clears the previous timer when the next update or surface
 * arrives, so at most one settle timer is in flight however many updates
 * arrive. A timer firing after Vega has already closed the render is a
 * no-op through the coordinator's exactly-once guard.
 *
 * @param surface what the visual shows for the current update; a change
 *   restarts the timer.
 * @param isRenderless whether Vega never embeds on `surface`.
 */
export const useRenderingSettle = (
    surface: string,
    isRenderless: boolean,
    { onRenderingFinished, onSettleClose }: VisualAppProps
) => {
    const visualUpdateOptions = useDenebVisualState(
        (state) => state.updates.options
    );
    useEffect(() => {
        if (isRenderless) {
            onRenderingFinished();
            return;
        }
        const settleId = window.setTimeout(() => {
            onSettleClose();
        }, RENDERING_MODE_SETTLE_MS);
        return () => {
            window.clearTimeout(settleId);
        };
    }, [
        visualUpdateOptions,
        surface,
        isRenderless,
        onRenderingFinished,
        onSettleClose
    ]);
};
