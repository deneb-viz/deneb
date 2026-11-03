import '../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

import { VisualKernel } from '@deneb-viz/powerbi-host';
import { KERNEL_CONFIG } from './app/kernel-config';
// Registers the template import dialog, which Power BI constructs by id in
// a frame of its own.
import './features/create/components/import-dialog';

/**
 * Power BI resolves `visualClassName` from `pbiviz.json` against this
 * module by name, so `ViewerVisual` must stay a named export of this file
 * even though all lifecycle behaviour lives in {@link VisualKernel}.
 */
export class ViewerVisual extends VisualKernel {
    constructor(options: VisualConstructorOptions) {
        super(options, KERNEL_CONFIG);
    }
}
