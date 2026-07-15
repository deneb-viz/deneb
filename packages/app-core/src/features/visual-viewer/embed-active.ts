import { type InterfaceType } from '../../lib/interface';

/**
 * Decide whether THIS Vega embed instance should be the single live one.
 *
 * Two `VisualViewer`/`VegaEmbed` instances can be mounted at once: the retained
 * (hidden) editor instance and the standalone viewer instance. Exactly one must
 * run live at any time — running both simultaneously doubles data-change
 * effects, races the shared `VegaViewServices` binding, and emits duplicate host
 * rendering events (defect C1).
 *
 * The active instance is selected by the current interface mode:
 *
 * - The editor-embedded instance (`isEmbeddedInEditor === true`) is live only in
 *   `'editor'` mode.
 * - The standalone viewer instance (`isEmbeddedInEditor === false`) is live only
 *   in `'viewer'` mode.
 *
 * The two conditions are mutually exclusive for every interface mode, so at most
 * one instance is ever active.
 */
export const computeEmbedActive = (
    interfaceType: InterfaceType,
    isEmbeddedInEditor: boolean
): boolean =>
    isEmbeddedInEditor
        ? interfaceType === 'editor'
        : interfaceType === 'viewer';
