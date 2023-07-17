import powerbi from 'powerbi-visuals-api';
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { VisualSettings } from '../settings';

export interface IVisualUpdateComparisonOptions {
    currentProcessingFlag: boolean;
    previousOptions: VisualUpdateOptions;
    currentOptions: VisualUpdateOptions;
    previousSettings: VisualSettings;
    currentSettings: VisualSettings;
}
