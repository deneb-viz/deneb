import React, { useState, useCallback, useMemo } from 'react';
import { VegaViewContext } from './vega-view-context';
import type { View } from 'vega';

/**
 * Provider component for Vega view context - wraps components that need access to the Vega view instance.
 *
 * Note: This provider maintains React state for the view reference to enable reactive updates in React components. The
 * actual view operations (`getAllData`, `getAllSignals`, etc.) should be accessed via `VegaViewServices` from
 * `@deneb-viz/vega-runtime/view`, which is the single source of truth.
 *
 * @example
 * ```tsx
 * <VegaViewProvider>
 *   <YourVegaComponents />
 * </VegaViewProvider>
 * ```
 */
export const VegaViewProvider: React.FC<{ children: React.ReactNode }> = ({
    children
}) => {
    const [view, setViewInternal] = useState<View | null>(null);

    const setView = useCallback((newView: View | null) => {
        setViewInternal(newView);
    }, []);

    const value = useMemo(
        () => ({
            view,
            setView
        }),
        [view, setView]
    );

    return (
        <VegaViewContext.Provider value={value}>
            {children}
        </VegaViewContext.Provider>
    );
};
