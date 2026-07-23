import {
    getSignalDenebContainer,
    type DenebContainerSignal
} from '@deneb-viz/vega-runtime/signals';

/**
 * Trailing debounce applied to container ResizeObserver notifications
 * before the `denebContainer` signal is refreshed. Long enough to
 * coalesce a resize storm (the host emits continuous notifications
 * while a visual is dragged) into a single signal write at settle,
 * short enough that the settle is imperceptible.
 */
export const CONTAINER_RESIZE_DEBOUNCE_MS = 150;

/**
 * Observe an element's physical box with a ResizeObserver, invoking
 * `onResize` on a trailing debounce once the size settles.
 *
 * Why this exists (#480 OoF residual): the host can resize the visual's
 * iframe AFTER it reports the new viewport in `update()` — on-object
 * formatting's title-reserve restore does exactly this. Update-driven
 * effects sample the DOM at commit time and can capture the stale
 * pre-resize box, with nothing left to observe the later physical
 * change. Watching the container element itself closes that gap
 * deterministically, whatever the host's ordering.
 *
 * @returns dispose function — cancels any pending trailing call and
 * disconnects the observer.
 */
export const observeContainerResize = (
    container: Element,
    onResize: () => void,
    debounceMs: number = CONTAINER_RESIZE_DEBOUNCE_MS
): (() => void) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(onResize, debounceMs);
    });
    observer.observe(container);
    return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
    };
};

/**
 * Build the refreshed `denebContainer` signal from the MEASURED SCROLL
 * CONTAINER, or `null` when no write should happen.
 *
 * All six fields come from the one element: clientWidth/Height (the
 * visible box), scrollWidth/Height (content extent), scrollTop/Left
 * (offsets). The element's own offsets are authoritative — including a
 * legitimate scroll back to 0 — so nothing is preserved from the
 * current value. 1.x-parity semantics; see
 * docs/plans/2026-07-23-001-container-signal-consolidation-design.md.
 *
 * Guards: no current signal (no live view yet) → null; 0×0 container
 * (hidden or tearing-down) → null; value-equal → null (Vega compares
 * signal values by reference — an equal-but-new object still re-runs
 * the dataflow).
 */
export const getMeasuredContainerRefresh = (
    container: HTMLElement,
    current: DenebContainerSignal | undefined
): { name: string; value: DenebContainerSignal } | null => {
    if (current === undefined) return null;
    const signal = getSignalDenebContainer({ container });
    if (signal.value.width === 0 && signal.value.height === 0) return null;
    if (isSameDenebContainerValue(current, signal.value)) return null;
    return signal;
};

/**
 * Value-equality for `denebContainer` signal payloads. Vega compares
 * signal values by reference, so writing a new-but-equal object still
 * re-runs the dataflow; callers use this to suppress those no-op
 * writes.
 */
export const isSameDenebContainerValue = (
    current: DenebContainerSignal | undefined,
    next: DenebContainerSignal
): boolean =>
    current !== undefined &&
    current.width === next.width &&
    current.height === next.height &&
    current.scrollWidth === next.scrollWidth &&
    current.scrollHeight === next.scrollHeight &&
    current.scrollTop === next.scrollTop &&
    current.scrollLeft === next.scrollLeft;
