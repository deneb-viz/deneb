import powerbi from 'powerbi-visuals-api';
import { isDeveloperModeEnabled } from '../../core/utils/developer';
import store from '../../store';
import { updateSelectors } from '../../store/visual';
import { TLocale } from '../ui/i18n';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ISelectionId = powerbi.visuals.ISelectionId;

/**
 * Proxy service for Power BI host services, plus any additional logic we wish to encapsulate.
 */
export class HostServices {
    fetchMoreData: (aggregateSegments?: boolean) => boolean;
    i18n: ILocalizationManager;
    launchUrl: (url: string) => void;
    locale: string;
    persistProperties: (changes: VisualObjectInstancesToPersist) => void;
    selectionIdBuilder: () => ISelectionIdBuilder;
    selectionManager: ISelectionManager;
    tooltipService: ITooltipService;

    bindHostServices = (host: IVisualHost) => {
        this.fetchMoreData = host.fetchMoreData;
        this.i18n = host.createLocalizationManager();
        this.launchUrl = host.launchUrl;
        this.locale = host.locale;
        this.persistProperties = host.persistProperties;
        this.selectionIdBuilder = host.createSelectionIdBuilder;
        this.selectionManager = getNewSelectionManager(host);
        this.tooltipService = host.tooltipService;
    };

    resolveLocaleFromSettings = (settingsLocale: TLocale) => {
        this.locale = (isDeveloperModeEnabled && settingsLocale) || this.locale;
    };
}

/**
 * Create a new selection manager and add selection callback management, to that bookmarks and other
 * events that set selections from outside the visual are correctly delegated to the visual dataset.
 */
const getNewSelectionManager = (host: IVisualHost) => {
    const selectionManager = host.createSelectionManager();
    selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => {
        store.dispatch(updateSelectors(ids));
    });
    return selectionManager;
};
