import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { DEFAULTS } from '@deneb-viz/powerbi-host';

/**
 * Canvas scaling, exposed in the format pane on the `stateManagement`
 * object. It holds only the scale-to-zoom switch, so its "Reset to default"
 * reverts nothing else on that object (the viewport, support-field and
 * template version state stay untouched).
 */
export class ViewerCanvasScalingCard extends formattingSettings.SimpleCard {
    name = 'stateManagement';
    displayNameKey = 'Objects_Viewer_CanvasScaling';
    scaleToZoom = new formattingSettings.ToggleSwitch({
        name: 'scaleToZoom',
        displayNameKey: 'Objects_StateManagement_ScaleToZoom',
        descriptionKey: 'Objects_Viewer_ScaleToZoom_Description',
        value: DEFAULTS.stateManagement.scaleToZoom
    });
    slices = [this.scaleToZoom];
}
