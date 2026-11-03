import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { SettingsVegaInteractivityGroup } from './settings-vega';

/**
 * Interactivity settings for report authors, on the `vega` object, in the
 * groups Deneb's settings pane uses: tooltips, context menu, cross-filtering
 * and cross-highlighting.
 *
 * It holds only the slices an author may change, because a card's "Reset to
 * default" reverts every slice it holds, hidden or not; the template's spec,
 * config and provider therefore stay on the `vega` card. Visibility rules
 * follow Deneb's settings pane.
 */
export class SettingsInteractivity extends formattingSettings.CompositeCard {
    name = 'vega';
    displayNameKey = 'Objects_Interactivity';
    /** The `vega` card's interactivity slices, which this card lays out in groups. */
    interactivity = new SettingsVegaInteractivityGroup(Object());
    tooltips = new formattingSettings.Group({
        name: 'tooltips',
        displayNameKey: 'Objects_Interactivity_Group_Tooltips',
        slices: [
            this.interactivity.enableTooltips,
            this.interactivity.tooltipDelay
        ]
    });
    contextMenu = new formattingSettings.Group({
        name: 'contextMenu',
        displayNameKey: 'Objects_Interactivity_Group_ContextMenu',
        slices: [
            this.interactivity.enableContextMenu,
            this.interactivity.enableContextMenuSelector
        ]
    });
    crossFiltering = new formattingSettings.Group({
        name: 'crossFiltering',
        displayNameKey: 'Objects_Interactivity_Group_CrossFiltering',
        slices: [
            this.interactivity.enableSelection,
            this.interactivity.selectionMode,
            this.interactivity.selectionMaxDataPoints
        ]
    });
    crossHighlighting = new formattingSettings.Group({
        name: 'crossHighlighting',
        displayNameKey: 'Objects_Interactivity_Group_CrossHighlighting',
        slices: [this.interactivity.enableHighlight]
    });
    groups = [
        this.tooltips,
        this.contextMenu,
        this.crossFiltering,
        this.crossHighlighting
    ];

    /**
     * @param getProvider reads the current template's provider, which this
     *  card does not hold; advanced cross-filtering is Vega-only.
     */
    constructor(private readonly getProvider: () => string | undefined) {
        super();
    }

    onPreProcess(): void {
        const slices = this.interactivity;
        slices.tooltipDelay.disabled = !slices.enableTooltips.value;
        slices.enableContextMenuSelector.disabled =
            !slices.enableContextMenu.value;
        slices.selectionMode.visible =
            slices.enableSelection.value && this.getProvider() !== 'vegaLite';
        slices.selectionMaxDataPoints.visible =
            slices.enableSelection.value &&
            slices.selectionMode.value === 'simple';
    }
}
