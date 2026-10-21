import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { INTERACTIVITY_DEFAULTS } from '@deneb-viz/powerbi-compat/interactivity';
import { CROSS_FILTER_LIMITS, DEFAULTS } from '@deneb-viz/powerbi-host';

/**
 * The visual's interactivity and rendering settings, exposed in the format
 * pane on the `vega` object.
 *
 * It holds only the slices an author may change, because a card's "Reset to
 * default" reverts every slice it holds, hidden or not; the template's spec,
 * config and provider therefore live on a different card. Visibility rules
 * follow Deneb's settings pane.
 */
export class ViewerInteractivityCard extends formattingSettings.CompositeCard {
    name = 'vega';
    displayNameKey = 'Objects_Viewer_Interactivity';
    interactivity = new ViewerInteractivityGroup(Object());
    rendering = new ViewerRenderingGroup(Object());
    groups = [this.interactivity, this.rendering];

    /**
     * @param getProvider reads the current template's provider, which this
     *  card does not hold; advanced cross-filtering is Vega-only.
     */
    constructor(private readonly getProvider: () => string | undefined) {
        super();
    }

    onPreProcess(): void {
        const group = this.interactivity;
        group.tooltipDelay.visible = group.enableTooltips.value;
        group.enableContextMenuSelector.visible = group.enableContextMenu.value;
        group.selectionMode.visible =
            group.enableSelection.value && this.getProvider() !== 'vegaLite';
        group.selectionMaxDataPoints.visible =
            group.enableSelection.value &&
            group.selectionMode.value === 'simple';
    }
}

class ViewerInteractivityGroup extends formattingSettings.Group {
    name = 'interactivity';
    displayNameKey = 'Objects_Vega_Group_Interactivity';
    enableTooltips = new formattingSettings.ToggleSwitch({
        name: 'enableTooltips',
        displayNameKey: 'Objects_Vega_EnableTooltips',
        value: INTERACTIVITY_DEFAULTS.enableTooltips
    });
    tooltipDelay = new formattingSettings.NumUpDown({
        name: 'tooltipDelay',
        displayNameKey: 'Objects_Vega_TooltipDelay',
        options: {
            minValue: { value: 0, type: 0 },
            maxValue: { value: 10000, type: 1 }
        },
        value: DEFAULTS.vega.tooltipDelay
    });
    enableContextMenu = new formattingSettings.ToggleSwitch({
        name: 'enableContextMenu',
        displayNameKey: 'Objects_Vega_EnableContextMenu',
        value: INTERACTIVITY_DEFAULTS.enableContextMenu
    });
    enableContextMenuSelector = new formattingSettings.ToggleSwitch({
        name: 'enableContextMenuSelector',
        displayNameKey: 'Objects_Vega_EnableContextMenuSelector',
        value: INTERACTIVITY_DEFAULTS.enableContextMenuSelector
    });
    enableSelection = new formattingSettings.ToggleSwitch({
        name: 'enableSelection',
        displayNameKey: 'Objects_Vega_EnableSelection',
        value: INTERACTIVITY_DEFAULTS.enableSelection
    });
    selectionMode = new formattingSettings.AutoDropdown({
        name: 'selectionMode',
        displayNameKey: 'Objects_Vega_SelectionMode',
        value: INTERACTIVITY_DEFAULTS.selectionMode
    });
    selectionMaxDataPoints = new formattingSettings.NumUpDown({
        name: 'selectionMaxDataPoints',
        displayNameKey: 'Objects_Vega_SelectionMaxDataPoints',
        options: {
            minValue: {
                value: CROSS_FILTER_LIMITS.minDataPointsValue,
                type: 0
            },
            maxValue: {
                value: CROSS_FILTER_LIMITS.maxDataPointsValue,
                type: 1
            }
        },
        value: INTERACTIVITY_DEFAULTS.selectionMaxDataPoints
    });
    enableHighlight = new formattingSettings.ToggleSwitch({
        name: 'enableHighlight',
        displayNameKey: 'Objects_Vega_EnableHighlight',
        value: INTERACTIVITY_DEFAULTS.enableHighlight
    });
    slices = [
        this.enableTooltips,
        this.tooltipDelay,
        this.enableContextMenu,
        this.enableContextMenuSelector,
        this.enableSelection,
        this.selectionMode,
        this.selectionMaxDataPoints,
        this.enableHighlight
    ];
}

class ViewerRenderingGroup extends formattingSettings.Group {
    name = 'rendering';
    displayNameKey = 'Objects_Viewer_Group_Rendering';
    renderMode = new formattingSettings.AutoDropdown({
        name: 'renderMode',
        displayNameKey: 'Objects_Vega_RenderMode',
        value: PROJECT_DEFAULTS.renderMode
    });
    slices = [this.renderMode];
}
