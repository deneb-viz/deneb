import { type RenderingLifecycleEvent } from '../../../lib/rendering-lifecycle';

export type OverlayClipboardPayloadInput = {
    /** Computed lifecycle tally (plain data from computeLifecycleTally). */
    tally: unknown;
    /** Recent `failed` lifecycle events shown in the failures section. */
    recentFailures: RenderingLifecycleEvent[];
    /** Display-history records (type + viewport per update). */
    history: unknown;
    /** Full lifecycle event ring. */
    lifecycleEvents: RenderingLifecycleEvent[];
};

/**
 * Render an arbitrary lifecycle `error` value as a JSON-safe string.
 * `failed` events carry whatever the embed rejection produced —
 * cyclic objects, BigInt, anything — and `JSON.stringify` throws on
 * those, which would break the copy button for exactly the event it
 * exists to capture. `Error` instances keep their message; everything
 * else goes through `String()`.
 */
const describeErrorValue = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.message;
    return String(error);
};

/**
 * Compact a lifecycle event for the clipboard dump:
 *
 *  - `opened` events embed the full VisualUpdateOptions (dataViews +
 *    spec), which balloons the payload past what can be pasted into
 *    an issue or chat — reduce to the update-shape essentials,
 *    keeping the persisted `stateManagement` object (it evidences
 *    viewport-persistence pollution, e.g. #480's OoF residue).
 *  - `failed` events carry an arbitrary `error` value — sanitize to a
 *    string so serialization cannot throw.
 */
const compactLifecycleEvent = (event: RenderingLifecycleEvent): unknown => {
    if (event.kind === 'opened') {
        return {
            ...event,
            options: {
                type: event.options.type,
                viewport: event.options.viewport,
                editMode: event.options.editMode,
                viewMode: event.options.viewMode,
                isInFocus: event.options.isInFocus,
                formatMode: (event.options as { formatMode?: boolean | null })
                    .formatMode,
                updateId: (event.options as { updateId?: string }).updateId,
                stateManagement:
                    event.options.dataViews?.[0]?.metadata?.objects
                        ?.stateManagement
            }
        };
    }
    if (event.kind === 'failed') {
        return {
            ...event,
            error: describeErrorValue(event.error)
        };
    }
    return event;
};

/**
 * Build the structured JSON dump for the overlay's copy button. Never
 * throws: event error values are sanitized before serialization, and
 * if `JSON.stringify` still fails on something unexpected the
 * function returns a plain error note instead — a diagnostic surface
 * must not break on the data it is diagnosing.
 */
export const getOverlayClipboardPayload = (
    input: OverlayClipboardPayloadInput
): string => {
    const { tally, recentFailures, history, lifecycleEvents } = input;
    try {
        return JSON.stringify(
            {
                tally,
                recentFailures: recentFailures.map(compactLifecycleEvent),
                history,
                lifecycleEvents: lifecycleEvents.map(compactLifecycleEvent)
            },
            null,
            2
        );
    } catch (error) {
        return `Overlay payload serialization failed: ${describeErrorValue(error)}`;
    }
};
