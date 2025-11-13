import powerbi from 'powerbi-visuals-api';
import { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';

export type VisualSlice = {
    visual4d3d3d: boolean;
    visualSettings: VisualFormattingSettingsModel;
    visualUpdates: number;
    visualViewportCurrent: powerbi.IViewport;
    visualViewportReport: powerbi.IViewport;
    setVisual4d3d3d: (status: boolean) => void;
    setVisualUpdate: (payload: VisualUpdatePayload) => void;
};

export type VisualUpdatePayload = {
    settings: VisualFormattingSettingsModel;
    options: powerbi.extensibility.visual.VisualUpdateOptions;
};
