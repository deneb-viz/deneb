import { createContext } from 'react';
import type { VegaViewContextValue } from '../types';

/**
 * React context for accessing the Vega view instance across components.
 * Must be used within a VegaViewProvider.
 */
export const VegaViewContext = createContext<VegaViewContextValue | undefined>(
    undefined
);
