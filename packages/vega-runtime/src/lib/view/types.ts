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
};

export type HandleViewErrorOptions = {
    generateRenderId: () => void;
    logError: (error: string) => void;
};
