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
import VisualUpdateType = powerbi.VisualUpdateType;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import DataViewCategorical = powerbi.DataViewCategorical;

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { loadTheme } from '@fluentui/react/lib/Styling';
import clone from 'lodash/clone';
import isEqual from 'lodash/isEqual';

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
import { hostServices } from './core/services';
import { initializeIcons } from './core/ui/fluent';
import { getMappedDataset } from './core/data/dataset';
import { handlePropertyMigration } from './core/utils/versioning';
import { resolveReportViewport } from './core/ui/dom';
import { DATASET_NAME } from './constants';
import { logDebug, logHeading, logHost } from './features/logging';
import { getVisualMetadata } from './core/utils/config';
import {
    VegaExtensibilityServices,
    VegaPatternFillServices
} from './features/vega-extensibility';
import { I18nServices, getLocale } from './features/i18n';
import { isFeatureEnabled } from './core/utils/features';

/**
 * Run to indicate that the visual has started.
 */
logHeading(`${getVisualMetadata()?.displayName}`);
logHeading(`Version: ${getVisualMetadata()?.version}`, 12);

export class Deneb implements IVisual {
    private settings: VisualSettings;
    private prevDataView: DataViewCategorical;
    private prevSettings: VisualSettings;

    constructor(options: VisualConstructorOptions) {
        logHost('Constructor has been called.', { options });
        try {
            loadTheme(theme);
            initializeIcons();
            hostServices.bindHostServices(options);
            I18nServices.bind(options);
            VegaPatternFillServices.bind();
            getState().initializeImportExport();
            const { element } = options;
            ReactDOM.render(React.createElement(App), element);
            element.oncontextmenu = (ev) => {
                ev.preventDefault();
            };
        } catch (e) {
            console?.error('Error', e);
        }
    }

    public update(options: VisualUpdateOptions) {
        // Handle main update flow
        try {
            // Parse the settings for use in the visual
            this.prevSettings = clone(this.settings);
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
        logDebug('Resolving update options...', { options });
        hostServices.visualUpdateOptions = options;
        // Signal we've begun rendering
        hostServices.renderingStarted();
        hostServices.resolveLocaleFromSettings(this.settings.developer.locale);
        I18nServices.update(
            isFeatureEnabled('developerMode')
                ? this.settings.developer.locale
                : getLocale()
        );
        VegaExtensibilityServices.bind(this.settings.theme.ordinalColorCount);
        const {
            setVisualUpdate,
            updateDataset,
            updateDatasetProcessingStage,
            updateDatasetViewFlags,
            updateDatasetViewInvalid
        } = getState();
        // Manage persistent viewport sizing for view vs. editor
        switch (true) {
            case VisualUpdateType.All === (options.type & VisualUpdateType.All):
            case VisualUpdateType.Data ===
                (options.type & VisualUpdateType.Data):
            case VisualUpdateType.ResizeEnd ===
                (options.type & VisualUpdateType.ResizeEnd): {
                logDebug('Persisting viewport to properties...');
                resolveReportViewport(
                    options.viewport,
                    options.viewMode,
                    options.editMode,
                    this.settings.display
                );
            }
        }
        // Provide intial update options to store
        setVisualUpdate({
            options,
            settings: this.settings
        });
        // Perform any necessary property migrations
        handlePropertyMigration();
        // Data change or re-processing required?
        const { categorical } = options.dataViews[0];
        const isDataVolatile =
            (VisualUpdateType.Data === (options.type & VisualUpdateType.Data) &&
                !isEqual(this.prevDataView, categorical)) ||
            this.prevSettings?.vega?.enableSelection !==
                this.settings.vega.enableSelection ||
            this.prevSettings?.vega?.enableHighlight !==
                this.settings.vega.enableHighlight;
        if (isDataVolatile) {
            logDebug('Visual dataset has changed and should be re-processed.');
            logDebug('Recording data view for next update...');
            this.prevDataView = clone(categorical);
            // If first segment, we test and set state accordingly for user feedback
            if (
                options.operationKind === VisualDataChangeOperationKind.Create
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
                        datasetViewHasValidMapping && datasetViewHasValidRoles;
                updateDatasetViewFlags({
                    datasetViewHasValidMapping,
                    datasetViewHasValidRoles,
                    datasetViewIsValid
                });
            }
            // If the DV didn't validate then we shouldn't expend effort mapping it and just display landing page
            if (!getState().datasetViewHasValidMapping) {
                logDebug('Dataset view is invalid. Displaying landing page.');
                updateDatasetViewInvalid();
                return;
            }
            handleDataFetch(options);
            if (!canFetchMore()) {
                const dataset = getMappedDataset(categorical);
                updateDataset({
                    categories: options.dataViews[0]?.categorical?.categories,
                    dataset
                });
            }
        } else {
            logDebug('Visual dataset has not changed. No need to process.');
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
    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        const instances = (<VisualObjectInstanceEnumerationObject>(
            VisualSettings.enumerateObjectInstances(
                this.settings || VisualSettings.getDefault(),
                options
            )
        )).instances;
        const objectName = options.objectName;
        let enumerationObject: VisualObjectInstanceEnumerationObject = {
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
        }
        return enumerationObject;
    }
}
