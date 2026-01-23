import { VegaViewProvider } from '@deneb-viz/vega-react';
import { VisualViewer } from '../components/visual-viewer';

export const Viewer = () => {
    return (
        <VegaViewProvider>
            <VisualViewer />
        </VegaViewProvider>
    );
};
