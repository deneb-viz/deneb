import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '../style/visual.less';
import '../style/fabric-icons-inline.css';
import '../style/tabulator-deneb.less';
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
    handleDataFetch,
    validateDataViewMapping,
    validateDataViewRoles
} from './core/data/dataView';
import { theme } from './core/ui/fluent';
import { fillPatternServices, hostServices } from './core/services';
import { initializeIcons } from './core/ui/fluent';
import { getDataset, getMappedDataset } from './core/data/dataset';
import { handlePropertyMigration } from './core/utils/versioning';
import { resolveReportViewport } from './core/ui/dom';
import { getDatasetTemplateFields } from './core/data/fields';
import { DATASET_NAME } from './constants';
import { parseActiveSpecification } from './features/specification';

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
        switch (true) {
            case options.type === VisualUpdateType.All:
            case options.type === VisualUpdateType.Data:
            /**
             * This cooercion is needed due to a bug in the API w/ `VisualUpdateType.ResizeEnd`.
             * I've submitted a PR for a fix: https://github.com/microsoft/powerbi-visuals-api/pull/38
             */
            case options.type.toString() === '36': {
                resolveReportViewport(
                    options.viewport,
                    options.viewMode,
                    options.editMode,
                    settings.display
                );
            }
            default: {
            }
        }

        // Provide intial update options to store
        setVisualUpdate({
            options,
            settings
        });

        // Perform any necessary property migrations
        handlePropertyMigration();

        // Data change or re-processing required?
        switch (true) {
            case options.type === VisualUpdateType.All:
            case options.type === VisualUpdateType.Data:
            // This is needed due to an issue with the developer visual, where
            // MS have introduced an unknown `VisualUpdateType` type that is
            // not part of the API. Refer to powerbi-visuals-tools/#422 for
            // details of the issue.
            case options.type.toString() === '254': {
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
                                DATASET_NAME
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
                        getDatasetTemplateFields(getDataset().fields)
                    );
                }
                break;
            }
            default: {
            }
        }
        getState().datasetProcessingStage === 'Processed' &&
            parseActiveSpecification();
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
