import 'core-js/stable';
import 'regenerator-runtime/runtime';
import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import 'office-ui-fabric-core/dist/css/fabric.min.css';
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
import { loadTheme, initializeIcons } from 'office-ui-fabric-react';

import { theme } from './config';
import Debugger, { standardLog } from './Debugger';
import App from './components/App';
import VisualSettings from './properties/VisualSettings';

import {
    dataLoadingService,
    dataViewService,
    propertyService,
    specificationService
} from './services';

import store from './store';
import {
    visualConstructor,
    visualUpdate,
    updateDataProcessingStage,
    updateDataViewFlags,
    recordInvalidDataView,
    updateDataset
} from './store/visualReducer';

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
            Debugger.log('Initialising icons...');
            initializeIcons();
            store.dispatch(visualConstructor(options.host));
            Debugger.log('Setting container element...');
            this.container = options.element;
            Debugger.log('Setting host services...');
            this.host = options.host;
            Debugger.log('Binding property service...');
            propertyService.persistProperties = this.host.persistProperties;
            Debugger.log('Getting events service...');
            this.events = this.host.eventService;
            Debugger.log('Creating main React component...');
            this.reactRoot = React.createElement(App);
            ReactDOM.render(this.reactRoot, this.container);
            Debugger.log('Preventing context menu on host...');
            this.container.oncontextmenu = (ev) => {
                ev.preventDefault();
            };
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
            // VisualHelper.resolveUpdateOptions(options, settings);
            this.resolveUpdateOptions(options);

            // Signal that we've finished rendering
            Debugger.log('Visual updated successfully!');
            this.events.renderingFinished(options);
            return;
        } catch (e) {
            // Signal that we've encountered an error
            Debugger.log('Error during update!', e);
            this.events.renderingFailed(options, e);
        } finally {
            // Debugger.log('API', this.visualApi);
            // Debugger.log('Store', store.getState());
        }
    }

    @standardLog({ owner })
    private resolveUpdateOptions(options: VisualUpdateOptions) {
        Debugger.log('Resolving visual update options for API operations...');
        const settings = this.settings;

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
                    store.dispatch(updateDataProcessingStage('Fetching'));
                    Debugger.log(
                        'First data segment. Doing initial state checks...'
                    );
                    const hasValidDataViewMapping = dataViewService.validateDataViewMapping(
                            options.dataViews
                        ),
                        hasValidDataRoles =
                            hasValidDataViewMapping &&
                            dataViewService.validateDataViewRoles(
                                options.dataViews,
                                ['values']
                            ),
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
                dataLoadingService.handleDataFetch(
                    options,
                    this.settings.dataLimit,
                    this.host
                );
                if (!dataLoadingService.canFetchMore) {
                    store.dispatch(
                        updateDataset(
                            dataViewService.getMappedDataset(
                                options.dataViews[0]?.table,
                                this.host.createSelectionIdBuilder
                            )
                        )
                    );
                    Debugger.log('Finished processing dataView.');
                }
                break;
            }
            default: {
                // Resize
            }
        }

        const { selectionManager } = store.getState().visual;
        Debugger.log('Has selections', selectionManager.hasSelection());
        Debugger.log('Existing selections', selectionManager.getSelectionIds());

        if (store.getState().visual.dataProcessingStage === 'Processed') {
            specificationService.parse();
        }
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
                        enumerationObject = this.settings[
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
