/**
 * @deneb-viz/vega-react
 *
 * React hooks and components for Vega/Vega-Lite visualization integration via Deneb's main application.
 * Provides a clean, hook-based API for embedding Vega visualizations in React applications.
 */

// Context and Provider
export { VegaViewContext, VegaViewProvider } from './context';

// Hooks
export { useVegaView, useVegaEmbed } from './hooks';

// Types
export type { UseVegaEmbedOptions, VegaViewContextValue } from './types';
