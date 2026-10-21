import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Whether the saved template was just removed: the saved spec moved from a
 * template back to the default between two successive values.
 *
 * The project itself follows the saved spec through the kernel's settings
 * sync, so a reset (or an undo of one) needs no handling here. What does not
 * follow is the import surface's own state, which still holds the last
 * imported template; the visual clears it when this returns true.
 *
 * Comparing successive saved values, rather than saved against in-memory
 * state, keeps an unfinished import and the gap between creating and the
 * host's echo from looking like a reset.
 */
export const isTemplateReset = (
    previousSpec: string | undefined,
    currentSpec: string | undefined
): boolean =>
    previousSpec !== undefined &&
    previousSpec !== PROJECT_DEFAULTS.spec &&
    currentSpec === PROJECT_DEFAULTS.spec;
