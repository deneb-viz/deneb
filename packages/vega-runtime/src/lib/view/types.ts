import { type View } from 'vega';

/**
 * A function that binds platform-specific event listeners to a Vega view.
 * Implementations should close over any required dependencies (dataset, translations, etc.).
 */
export type ViewEventBinder = (view: View) => void;

export type HandleNewViewOptions = {
    logLevel: number;
    generateRenderId: () => void;
    logError: (error: string) => void;
    logWarn: (warning: string) => void;
    /**
     * Optional array of binders to attach platform-specific events to the view.
     */
    viewEventBinders?: ViewEventBinder[];
    /**
     * Optional callback invoked when rendering starts.
     */
    onRenderingStarted?: () => void;
    /**
     * Optional callback invoked when rendering finishes successfully.
     */
    onRenderingFinished?: () => void;
};

export type HandleViewErrorOptions = {
    generateRenderId: () => void;
    logError: (error: string) => void;
    /**
     * Optional callback invoked when rendering fails with an error.
     */
    onRenderingError?: (error: Error) => void;
};
