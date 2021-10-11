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

import Debugger, { standardLog } from './Debugger';
import App from './components/App';
import VisualSettings from './properties/VisualSettings';

import store from './store';
import {
    visualConstructor,
    visualUpdate,
    updateDataProcessingStage,
    updateDataViewFlags,
    recordInvalidDataView,
    updateDataset
} from './store/visual';
import {
    initializeImportExport,
    syncExportTemplateDataset
} from './store/templates';
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

const owner = 'Visual';

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
            Debugger.clear();
            Debugger.heading('Visual Constructor');
            Debugger.log('Loading theming...');
            loadTheme(theme);
            initializeIcons();
            hostServices.bindHostServices(options);
            store.dispatch(visualConstructor(options.host));
            store.dispatch(initializeImportExport());
            Debugger.log('Setting container element...');
            this.container = options.element;
            Debugger.log('Setting host services...');
            this.host = options.host;
            Debugger.log('Getting events service...');
            this.events = this.host.eventService;
            Debugger.log('Creating main React component...');
            this.reactRoot = React.createElement(App);
            ReactDOM.render(this.reactRoot, this.container);
            Debugger.log('Preventing context menu on host...');
            this.container.oncontextmenu = (ev) => {
                ev.preventDefault();
            };
            fillPatternServices.setPatternContainer(this.container);
        } catch (e) {
            Debugger.log('Error', e);
        }
    }

    @standardLog({ profile: true, report: true, owner })
    public update(options: VisualUpdateOptions) {
        Debugger.log('Options', options);
        // Handle main update flow
        try {
            // Signal we've begun rendering
            Debugger.log('Rendering started.');
            this.events.renderingStarted(options);

            // Parse the settings for use in the visual
            Debugger.log('Parsing visual settings...');
            this.settings = Deneb.parseSettings(
                options && options.dataViews && options.dataViews[0]
            );
            Debugger.log('Parsed settings', this.settings);

            // Handle the update options and dispatch to store as needed
            this.resolveUpdateOptions(options);

            // Signal that we've finished rendering
            Debugger.log('Visual updated successfully!');
            this.events.renderingFinished(options);
            return;
        } catch (e) {
            // Signal that we've encountered an error
            Debugger.log('Error during update!', e);
            this.events.renderingFailed(options, e);
        }
    }

    @standardLog({ owner })
    private resolveUpdateOptions(options: VisualUpdateOptions) {
        Debugger.log('Resolving visual update options for API operations...');
        const settings = this.settings;
        hostServices.resolveLocaleFromSettings(settings.developer.locale);

        // Provide intial update options to store
        store.dispatch(
            visualUpdate({
                options,
                settings
            })
        );

        // Data change or re-processing required?
        switch (options.type) {
            case VisualUpdateType.All:
            case VisualUpdateType.Data: {
                // If first segment, we test and set state accordingly for user feedback
                if (
                    options.operationKind ===
                    VisualDataChangeOperationKind.Create
                ) {
                    Debugger.log(
                        'First data segment. Doing initial state checks...'
                    );
                    store.dispatch(
                        updateDataProcessingStage({
                            dataProcessingStage: 'Fetching',
                            canFetchMore: canFetchMore()
                        })
                    );
                    Debugger.log(
                        'First data segment. Doing initial state checks...'
                    );
                    const hasValidDataViewMapping = validateDataViewMapping(
                            options.dataViews
                        ),
                        hasValidDataRoles =
                            hasValidDataViewMapping &&
                            validateDataViewRoles(options.dataViews, [
                                'dataset'
                            ]),
                        hasValidDataView =
                            hasValidDataViewMapping && hasValidDataRoles;
                    Debugger.log('Dispatching ');
                    store.dispatch(
                        updateDataViewFlags({
                            hasValidDataViewMapping,
                            hasValidDataRoles,
                            hasValidDataView
                        })
                    );
                }

                // If the DV didn't validate then we shouldn't expend effort mapping it and just display landing page
                if (
                    !store.getState().visual.dataViewFlags
                        .hasValidDataViewMapping
                ) {
                    Debugger.log(
                        "Data view isn't valid, so need to show Landing page."
                    );
                    store.dispatch(recordInvalidDataView());
                    break;
                }

                Debugger.log('Delegating additional data fetch...');
                handleDataFetch(options);
                if (!canFetchMore()) {
                    store.dispatch(
                        updateDataset({
                            categories:
                                options.dataViews[0]?.categorical?.categories,
                            dataset: getMappedDataset(
                                options.dataViews[0]?.categorical
                            )
                        })
                    );
                    store.dispatch(
                        syncExportTemplateDataset(
                            Object.entries(
                                store.getState().visual.dataset.metadata
                            ).map(([k, v]) => v.templateMetadata)
                        )
                    );
                    Debugger.log('Finished processing dataView.');
                }
                break;
            }
            default: {
            }
        }

        const { selectionManager } = hostServices;
        Debugger.log('Has selections', selectionManager.hasSelection());
        Debugger.log('Existing selections', selectionManager.getSelectionIds());
        store.getState().visual.dataProcessingStage === 'Processed' &&
            parseActiveSpec();
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    @standardLog()
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
        Debugger.log(`Object Enumeration: ${objectName}`);

        try {
            // We try where possible to use the standard method signature to process the instance, but there are some exceptions...
            switch (objectName) {
                default: {
                    // Check to see if the class has our method for processing business logic and run it if so
                    if (
                        typeof this.settings[`${objectName}`]
                            .processEnumerationObject === 'function'
                    ) {
                        Debugger.log(
                            'processEnumerationObject found. Executing...'
                        );
                        enumerationObject =
                            this.settings[
                                `${objectName}`
                            ].processEnumerationObject(enumerationObject);
                    } else {
                        Debugger.log(
                            "Couldn't find class processEnumerationObject function."
                        );
                    }
                }
            }
        } catch (e) {
            Debugger.log('Error', e);
        } finally {
            Debugger.log('Enumeration Object', enumerationObject);
            return enumerationObject;
        }
    }
}
