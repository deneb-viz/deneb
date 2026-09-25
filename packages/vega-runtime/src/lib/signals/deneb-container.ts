/**
 * Represents the Deneb container signal value, providing information about the visualization container's dimensions
 * and scroll position.
 */
export interface DenebContainerSignal {
    /** Container element height in pixels */
    height: number;
    /** Container element width in pixels */
    width: number;
    /** Total scrollable height in pixels */
    scrollHeight: number;
    /** Total scrollable width in pixels */
    scrollWidth: number;
    /** Current vertical scroll position in pixels */
    scrollTop: number;
    /** Current horizontal scroll position in pixels */
    scrollLeft: number;
}

/**
 * Options for creating the denebContainer signal.
 */
export interface DenebContainerSignalOptions {
    /** Container HTML element to read dimensions from */
    container?: HTMLElement;
    /** Scroll position information (alternative to container) */
    scroll?: {
        height?: number;
        width?: number;
        scrollHeight?: number;
        scrollWidth?: number;
        scrollTop?: number;
        scrollLeft?: number;
    };
}

/**
 * Signal name for the Deneb container (modern name).
 */
export const SIGNAL_DENEB_CONTAINER = 'denebContainer';

/**
 * Legacy signal name (deprecated).
 * @deprecated Since 2.0; use {@link SIGNAL_DENEB_CONTAINER} (`denebContainer`)
 * instead. Removal target: 3.0. Specs are auto-migrated at parse via
 * `replaceLegacySignalReferences`. See `docs/DEPRECATIONS.md`.
 */
export const SIGNAL_PBI_CONTAINER_LEGACY = 'pbiContainer';

/**
 * Get the `denebContainer` signal object with current container dimensions and scroll position. This signal provides
 * information about the visualization container that specs can reference.
 *
 * @param options Configuration for signal values
 * @returns Signal object with name and current value
 *
 * @example
 * ```typescript
 * const signal = getSignalDenebContainer({
 *   container: document.getElementById('viz-container')
 * });
 * view.signal(signal.name, signal.value);
 * ```
 */
export const getSignalDenebContainer = (
    options?: DenebContainerSignalOptions
): { name: string; value: DenebContainerSignal } => {
    return {
        name: SIGNAL_DENEB_CONTAINER,
        value: {
            height:
                options?.container?.clientHeight ||
                options?.scroll?.height ||
                0,
            width:
                options?.container?.clientWidth || options?.scroll?.width || 0,
            scrollHeight:
                options?.container?.scrollHeight ||
                options?.scroll?.scrollHeight ||
                0,
            scrollWidth:
                options?.container?.scrollWidth ||
                options?.scroll?.scrollWidth ||
                0,
            scrollTop:
                options?.container?.scrollTop ||
                options?.scroll?.scrollTop ||
                0,
            scrollLeft:
                options?.container?.scrollLeft ||
                options?.scroll?.scrollLeft ||
                0
        }
    };
};

/**
 * Get signal names that reference container dimensions (for patching specs).
 */
export const getContainerSignalReferences = () => ({
    width: `${SIGNAL_DENEB_CONTAINER}.width`,
    height: `${SIGNAL_DENEB_CONTAINER}.height`,
    scrollWidth: `${SIGNAL_DENEB_CONTAINER}.scrollWidth`,
    scrollHeight: `${SIGNAL_DENEB_CONTAINER}.scrollHeight`,
    scrollTop: `${SIGNAL_DENEB_CONTAINER}.scrollTop`,
    scrollLeft: `${SIGNAL_DENEB_CONTAINER}.scrollLeft`
});

/**
 * Container dimensions input type used by spec patching functions.
 */
export interface ContainerDimensions {
    width: number;
    height: number;
}

/**
 * Which top-level dimensions Deneb stamped into a patched spec.
 *
 * Deneb only sets `width`/`height` when the user has not — so once they are
 * literal numbers, nothing in the spec distinguishes Deneb's from the user's.
 * This travels alongside the spec so the re-stamp path can tell them apart and
 * leave a user-authored dimension alone.
 */
export interface PatchedDimensions {
    width: boolean;
    height: boolean;
}

/**
 * Deneb stamped neither dimension. The safe default: nothing gets re-stamped.
 */
export const NO_PATCHED_DIMENSIONS: PatchedDimensions = {
    width: false,
    height: false
};

/**
 * Get the `denebContainer` signal object from container dimensions. This is a convenience wrapper around
 * `getSignalDenebContainer` for use in spec patching where only width/height are available.
 *
 * @param containerDimensions Container width and height (optional)
 * @returns Signal object with name and current value
 *
 * @example
 * ```typescript
 * const signal = getDenebContainerSignalFromDimensions({ width: 800, height: 600 });
 * // Use in Vega spec: spec.signals.push(signal)
 * // Use in Vega-Lite spec: spec.params.push(signal)
 * ```
 */
export const getDenebContainerSignalFromDimensions = (
    containerDimensions?: ContainerDimensions
): { name: string; value: DenebContainerSignal } => {
    return getSignalDenebContainer({
        scroll: containerDimensions
            ? {
                  height: containerDimensions.height,
                  width: containerDimensions.width
              }
            : undefined
    });
};

/**
 * Immutably rewrite the stored `denebContainer` entry's init width/height in a
 * patched spec — `spec.signals` (Vega) or `spec.params` (Vega-Lite); both use
 * the same `{ name, value }` shape — and re-stamp the top-level `width`/
 * `height` literals that Deneb owns. Returns the INPUT reference when there is
 * nothing to do (no entry, non-object value, and dims already equal), so
 * callers can use identity to suppress redundant downstream work (the
 * re-embed path keys off object identity).
 *
 * `patchedDimensions` says which top-level dimensions Deneb stamped. A
 * dimension the user set is theirs and is never rewritten.
 *
 * Only `width`/`height` are rewritten: the init's scroll fields are the
 * compile-time seed for a NEW view, and the live view's scroll state is owned
 * by the signal-write path, not this helper.
 */
export const updateContainerInitDimensions = <
    T extends {
        width?: unknown;
        height?: unknown;
        signals?: Array<{ name?: string; value?: unknown }>;
        params?: Array<{ name?: string; value?: unknown }>;
    }
>(
    spec: T,
    dimensions: ContainerDimensions,
    patchedDimensions: PatchedDimensions
): T => {
    const isPlainObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && !Array.isArray(value);

    const updateArray = <E extends { name?: string; value?: unknown }>(
        entries: E[] | undefined
    ): E[] | undefined => {
        if (!entries) {
            return entries;
        }
        const index = entries.findIndex(
            (entry) => entry.name === SIGNAL_DENEB_CONTAINER
        );
        if (index === -1) {
            return entries;
        }
        const entry = entries[index] as E;
        if (!isPlainObject(entry.value)) {
            return entries;
        }
        const { width, height } = dimensions;
        if (entry.value.width === width && entry.value.height === height) {
            return entries;
        }
        const newEntries = entries.slice();
        newEntries[index] = {
            ...entry,
            value: { ...entry.value, width, height }
        } as E;
        return newEntries;
    };

    const newSignals = updateArray(spec.signals);
    const newParams = updateArray(spec.params);

    const rewriteWidth =
        patchedDimensions.width && spec.width !== dimensions.width;
    const rewriteHeight =
        patchedDimensions.height && spec.height !== dimensions.height;

    if (
        newSignals === spec.signals &&
        newParams === spec.params &&
        !rewriteWidth &&
        !rewriteHeight
    ) {
        return spec;
    }

    return {
        ...spec,
        ...(newSignals !== spec.signals ? { signals: newSignals } : {}),
        ...(newParams !== spec.params ? { params: newParams } : {}),
        ...(rewriteWidth ? { width: dimensions.width } : {}),
        ...(rewriteHeight ? { height: dimensions.height } : {})
    };
};
