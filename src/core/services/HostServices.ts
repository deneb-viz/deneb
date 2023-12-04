import powerbi from 'powerbi-visuals-api';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import IDownloadService = powerbi.extensibility.IDownloadService;
import { TLocale } from '../../features/i18n';
import { logHost } from '../../features/logging';
import { FEATURES } from '../../../config';

/**
 * Proxy service for Power BI host services, plus any additional logic we wish to encapsulate.
 */
export class HostServices {
    allowInteractions: boolean;
    download: IDownloadService;
    colorPalette: ISandboxExtendedColorPalette;
    displayWarningIcon: (hoverText: string, detailedText: string) => void;
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
        this.download = options.host.downloadService;
        this.allowInteractions = host.hostCapabilities.allowInteractions;
        this.colorPalette = host.colorPalette;
        this.displayWarningIcon = host.displayWarningIcon;
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
        logHost('Rendering event finished.');
        this.events.renderingFinished(this.visualUpdateOptions);
    };

    renderingFailed = (reason?: string) => {
        logHost('Rendering event failed:', reason);
        this.events.renderingFailed(this.visualUpdateOptions, reason);
    };

    renderingStarted = () => {
        logHost('Rendering event started.');
        this.events.renderingStarted(this.visualUpdateOptions);
    };

    resolveLocaleFromSettings = (settingsLocale: TLocale) => {
        this.locale =
            (FEATURES.developer_mode && settingsLocale) || this.locale;
    };
}

/**
 * Create a new selection manager and add selection callback management, to that bookmarks and other
 * events that set selections from outside the visual are correctly delegated to the visual dataset.
 */
const getNewSelectionManager = (host: IVisualHost) =>
    host.createSelectionManager();
