//import 'react-devtools';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '../style/visual.less';
import '../style/fabric-icons-inline.css';
import 'jsoneditor/dist/jsoneditor.css';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import VisualUpdateType = powerbi.VisualUpdateType;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { loadTheme } from '@fluentui/react/lib/Styling';

import App from './components/App';
import VisualSettings from './properties/VisualSettings';

import { getState } from './store';
import {
    canFetchMore,
    getMappedDataset,
    handleDataFetch,
    validateDataViewMapping,
    validateDataViewRoles
} from './core/data/dataView';
import { theme } from './core/ui/fluent';
import { parseActiveSpec } from './core/utils/specification';
import { fillPatternServices, hostServices } from './core/services';
import { initializeIcons } from './core/ui/fluent';
import { getDataset, getTemplateFieldsFromMetadata } from './core/data/dataset';
import { handlePropertyMigration } from './core/utils/versioning';
import { resolveReportViewport } from './core/ui/dom';

export class Deneb implements IVisual {
    private settings: VisualSettings;
    // The root element for the entire visual
    private container: HTMLElement;
    // React app container
    private reactRoot: React.FunctionComponentElement<{}>;
    // Visual host services
    private host: IVisualHost;
    // Handle rendering events
    private events: IVisualEventService;

    constructor(options: VisualConstructorOptions) {
        try {
            loadTheme(theme);
            initializeIcons();
            hostServices.bindHostServices(options);
            getState().initializeImportExport();
            this.container = options.element;
            this.host = options.host;
            this.events = this.host.eventService;
            this.reactRoot = React.createElement(App);
            ReactDOM.render(this.reactRoot, this.container);
            this.container.oncontextmenu = (ev) => {
                ev.preventDefault();
            };
            fillPatternServices.setPatternContainer(this.container);
        } catch (e) {
            console?.error('Error', e);
        }
    }

    public update(options: VisualUpdateOptions) {
        // Handle main update flow
        try {
            // Signal we've begun rendering
            this.events.renderingStarted(options);

            // Parse the settings for use in the visual
            this.settings = Deneb.parseSettings(
                options && options.dataViews && options.dataViews[0]
            );

            // No volatile operations occur during a resize event, and the DOM/Vega view takes care of handling any
            // responsiveness for anything that will change. No additional computations are needed, so we can save a few
            // cycles.
            if (
                options.type === VisualUpdateType.Resize &&
                !this.settings.performance.enableResizeRecalc
            )
                return;

            // Handle the update options and dispatch to store as needed
            this.resolveUpdateOptions(options);
            return;
        } catch (e) {
            // Signal that we've encountered an error
            hostServices.renderingFailed(e.message);
        }
    }

    private resolveUpdateOptions(options: VisualUpdateOptions) {
        const settings = this.settings;
        hostServices.visualUpdateOptions = options;
        hostServices.resolveLocaleFromSettings(settings.developer.locale);

        const {
            setVisualUpdate,
            syncTemplateExportDataset,
            updateDataset,
            updateDatasetProcessingStage,
            updateDatasetViewFlags,
            updateDatasetViewInvalid
        } = getState();

        // Manage persistent viewport sizing for view vs. editor
        resolveReportViewport(
            options.viewport,
            options.viewMode,
            options.editMode,
            settings.display
        );

        // Provide intial update options to store
        setVisualUpdate({
            options,
            settings
        });

        // Perform any necessary property migrations
        handlePropertyMigration();

        // Data change or re-processing required?
        switch (options.type) {
            case VisualUpdateType.All:
            case VisualUpdateType.Data: {
                // If first segment, we test and set state accordingly for user feedback
                if (
                    options.operationKind ===
                    VisualDataChangeOperationKind.Create
                ) {
                    updateDatasetProcessingStage({
                        dataProcessingStage: 'Fetching',
                        canFetchMore: canFetchMore()
                    });
                    const datasetViewHasValidMapping = validateDataViewMapping(
                            options.dataViews
                        ),
                        datasetViewHasValidRoles =
                            datasetViewHasValidMapping &&
                            validateDataViewRoles(options.dataViews, [
                                'dataset'
                            ]),
                        datasetViewIsValid =
                            datasetViewHasValidMapping &&
                            datasetViewHasValidRoles;
                    updateDatasetViewFlags({
                        datasetViewHasValidMapping,
                        datasetViewHasValidRoles,
                        datasetViewIsValid
                    });
                }

                // If the DV didn't validate then we shouldn't expend effort mapping it and just display landing page
                if (!getState().datasetViewHasValidMapping) {
                    updateDatasetViewInvalid();
                    break;
                }
                handleDataFetch(options);
                if (!canFetchMore()) {
                    updateDataset({
                        categories:
                            options.dataViews[0]?.categorical?.categories,
                        dataset: getMappedDataset(
                            options.dataViews[0]?.categorical
                        )
                    });
                    syncTemplateExportDataset(
                        getTemplateFieldsFromMetadata(getDataset().metadata)
                    );
                }
                break;
            }
            default: {
            }
        }
        getState().datasetProcessingStage === 'Processed' && parseActiveSpec();
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        let instances = (<VisualObjectInstanceEnumerationObject>(
                VisualSettings.enumerateObjectInstances(
                    this.settings || VisualSettings.getDefault(),
                    options
                )
            )).instances,
            objectName = options.objectName,
            enumerationObject: VisualObjectInstanceEnumerationObject = {
                containers: [],
                instances: instances
            };

        try {
            // We try where possible to use the standard method signature to process the instance, but there are some exceptions...
            switch (objectName) {
                default: {
                    // Check to see if the class has our method for processing business logic and run it if so
                    if (
                        typeof this.settings[`${objectName}`]
                            .processEnumerationObject === 'function'
                    ) {
                        enumerationObject =
                            this.settings[
                                `${objectName}`
                            ].processEnumerationObject(enumerationObject);
                    }
                }
            }
        } catch (e) {
            console.error('Error', e);
        } finally {
            return enumerationObject;
        }
    }
}
