import '../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

import { VisualKernel } from './host';
import { KERNEL_CONFIG } from './app/kernel-config';

/**
 * Power BI resolves `visualClassName` from `pbiviz.json` against this
 * module by name, so `Deneb` must stay a named export of this file even
 * though all lifecycle behaviour lives in {@link VisualKernel}.
 */
export class Deneb extends VisualKernel {
    constructor(options: VisualConstructorOptions) {
        super(options, KERNEL_CONFIG);
    }
}
