import powerbi from 'powerbi-visuals-api';

import { type VisualFormattingSettingsModel } from '../properties';

export type VisualUpdateComparisonOptions = {
    currentProcessingFlag: boolean;
    previousOptions: powerbi.extensibility.visual.VisualUpdateOptions;
    currentOptions: powerbi.extensibility.visual.VisualUpdateOptions;
    previousSettings: VisualFormattingSettingsModel;
    currentSettings: VisualFormattingSettingsModel;
};
