import { useContext } from 'react';
import { VegaViewContext } from '../context/vega-view-context';

/**
 * This hook provides the view reference and setter for components that need reactive updates when the view changes.
 * For view operations (`getAllData`, `getAllSignals`, `getDataByName`, etc.), use `VegaViewServices` from
 * `@deneb-viz/vega-runtime/view` directly.
 *
 * @throws Error if used outside of VegaViewProvider
 *
 * @example
 * ```tsx
 * import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
 *
 * function MyComponent() {
 *   const { view, setView } = useVegaView();
 *
 *   useEffect(() => {
 *     if (view) {
 *       // Use VegaViewServices for view operations
 *       const datasets = VegaViewServices.getAllData();
 *       console.log('Available datasets:', Object.keys(datasets));
 *     }
 *   }, [view]);
 *
 *   return <div>My Vega Component</div>;
 * }
 * ```
 */
export const useVegaView = () => {
    const context = useContext(VegaViewContext);
    if (!context) {
        throw new Error('useVegaView must be used within VegaViewProvider');
    }
    return context;
};
