import type { View } from 'vega';
import type { EmbedOptions, VisualizationSpec } from 'vega-embed';

/**
 * Options for the `useVegaEmbed` hook
 */
export interface UseVegaEmbedOptions {
    /** Reference to the container element where Vega should render */
    ref: React.RefObject<HTMLDivElement | null>;
    /**
     * The Vega or Vega-Lite specification to render.
     * Pass `null` to skip embedding (useful when spec is not yet ready).
     */
    spec: VisualizationSpec | null;
    /** Vega embed options */
    options?: EmbedOptions;
    /** Callback when embed completes successfully */
    onEmbed?: (result: { view: View; vgSpec?: object }) => void;
    /** Callback when embed fails */
    onError?: (error: Error) => void;
}

/**
 * Context value for Vega view access.
 */
export interface VegaViewContextValue {
    /** The current Vega view instance (null if not yet created) */
    view: View | null;
    /** Set the current view instance */
    setView: (view: View | null) => void;
}
