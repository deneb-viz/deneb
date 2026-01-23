import { type View } from 'vega';

/**
 * A function that binds platform-specific event listeners to a Vega view.
 * Implementations should close over any required dependencies (dataset, translations, etc.).
 */
export type ViewEventBinder = (view: View) => void;
