import powerbi from 'powerbi-visuals-api';
import { getState } from '../../store';
import { applySelection } from '../interactivity/selection';
import { TLocale } from '../ui/i18n';
import { isFeatureEnabled } from '../utils/features';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
/*  Pending API 4.0.0
    import IDownloadService = powerbi.extensibility.IDownloadService;
*/

/**
 * Proxy service for Power BI host services, plus any additional logic we wish to encapsulate.
 */
export class HostServices {
    allowInteractions: boolean;
    /*  Pending API 4.0.0
        download: IDownloadService;
    */
    colorPalette: ISandboxExtendedColorPalette;
    element: HTMLElement;
    events: IVisualEventService;
    fetchMoreData: (aggregateSegments?: boolean) => boolean;
    i18n: ILocalizationManager;
    launchUrl: (url: string) => void;
    locale: string;
    persistProperties: (changes: VisualObjectInstancesToPersist) => void;
    selectionIdBuilder: () => ISelectionIdBuilder;
    selectionManager: ISelectionManager;
    tooltipService: ITooltipService;
    visualUpdateOptions: VisualUpdateOptions;

    bindHostServices = (options: VisualConstructorOptions) => {
        const { element, host } = options;
        /*  Pending API 4.0.0
            this.download = options.host.downloadService;
        */
        this.allowInteractions = host.hostCapabilities.allowInteractions;
        this.colorPalette = host.colorPalette;
        this.element = element;
        this.events = options.host.eventService;
        this.fetchMoreData = host.fetchMoreData;
        this.i18n = host.createLocalizationManager();
        this.launchUrl = host.launchUrl;
        this.locale = host.locale;
        this.persistProperties = host.persistProperties;
        this.selectionIdBuilder = host.createSelectionIdBuilder;
        this.selectionManager = getNewSelectionManager(host);
        this.tooltipService = host.tooltipService;
    };

    getThemeColors = (): string[] =>
        this.colorPalette?.['colors']?.map((c: any) => c.value) || [];

    renderingFinished = () => {
        this.events.renderingFinished(this.visualUpdateOptions);
    };

    renderingFailed = (reason?: string) => {
        this.events.renderingFailed(this.visualUpdateOptions, reason);
    };

    resolveLocaleFromSettings = (settingsLocale: TLocale) => {
        this.locale =
            (isFeatureEnabled('developerMode') && settingsLocale) ||
            this.locale;
    };
}

/**
 * Create a new selection manager and add selection callback management, to that bookmarks and other
 * events that set selections from outside the visual are correctly delegated to the visual dataset.
 */
const getNewSelectionManager = (host: IVisualHost) => {
    const selectionManager = host.createSelectionManager();
    selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => {
        applySelection(ids);
    });
    return selectionManager;
};
