import powerbi from 'powerbi-visuals-api';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ITooltipService = powerbi.extensibility.ITooltipService;

export { hostServices };

class HostServicesWrapper {
    fetchMoreData: (aggregateSegments?: boolean) => boolean;
    i18n: ILocalizationManager;
    launchUrl: (url: string) => void;
    persistProperties: (changes: VisualObjectInstancesToPersist) => void;
    selectionIdBuilder: () => ISelectionIdBuilder;
    selectionManager: ISelectionManager;
    tooltipService: ITooltipService;

    bindHostServices = (host: IVisualHost) => {
        this.fetchMoreData = host.fetchMoreData;
        this.i18n = host.createLocalizationManager();
        this.launchUrl = host.launchUrl;
        this.persistProperties = host.persistProperties;
        this.selectionIdBuilder = host.createSelectionIdBuilder;
        this.selectionManager = getNewSelectionManager(host);
        this.tooltipService = host.tooltipService
    };
}

const getNewSelectionManager = (host: IVisualHost) => {
    const selectionManager = host.createSelectionManager();
    selectionManager.registerOnSelectCallback(
        (ids: powerbi.extensibility.ISelectionId[]) => null // We may not need this, but this gives us an in
    );
    return selectionManager;
}

const hostServices = new HostServicesWrapper();
