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
import VisualUpdateType = powerbi.VisualUpdateType;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { loadTheme } from '@fluentui/react/lib/Styling';

import App from './components/App';
import VisualSettings from './properties/VisualSettings';

import { getState } from './store';
import { canFetchMoreFromDataview, getRowCount } from './core/data/dataView';
import { theme } from './core/ui/fluent';
import { hostServices } from './core/services';
import { initializeIcons } from './core/ui/fluent';
import { getMappedDataset } from './core/data/dataset';
import { handlePropertyMigration } from './core/utils/versioning';
import { resolveReportViewport } from './core/ui/dom';
import { logDebug, logHeading, logHost } from './features/logging';
import { getVisualMetadata } from './core/utils/config';
import {
    VegaExtensibilityServices,
    VegaPatternFillServices
} from './features/vega-extensibility';
import { I18nServices, getLocale } from './features/i18n';
import { isFeatureEnabled } from './core/utils/features';
import { getCategoricalDataViewFromOptions } from './features/visual-host';

/**
 * Run to indicate that the visual has started.
 */
logHeading(`${getVisualMetadata()?.displayName}`);
logHeading(`Version: ${getVisualMetadata()?.version}`, 12);

export class Deneb implements IVisual {
    private settings: VisualSettings;

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
            this.settings = Deneb.parseSettings(
                options && options.dataViews && options.dataViews[0]
            );
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
        const { setVisualUpdate, updateDataset, updateDatasetProcessingStage } =
            getState();
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
        handlePropertyMigration(this.settings);
        // Data change or re-processing required?
        let fetchSuccess = false;
        const {
            processing: { shouldProcessDataset }
        } = getState();
        const categorical = getCategoricalDataViewFromOptions(options);
        if (shouldProcessDataset) {
            logDebug('Visual dataset has changed and should be re-processed.');
            const canFetchMore = canFetchMoreFromDataview(
                this.settings,
                options?.dataViews?.[0]?.metadata
            );
            const rowsLoaded = getRowCount(categorical);
            // If first segment, we test and set state accordingly for user feedback
            if (
                options.operationKind === VisualDataChangeOperationKind.Create
            ) {
                logDebug('Initial data segment.');
            }
            if (canFetchMore) {
                logDebug(
                    `${rowsLoaded} row(s) loaded. Attempting to fetch more data...`
                );
                updateDatasetProcessingStage({
                    dataProcessingStage: 'Fetching',
                    rowsLoaded
                });
                fetchSuccess = hostServices.fetchMoreData(true);
            }
            if (!fetchSuccess) {
                logDebug('No more data to fetch. Processing dataset...');
                updateDatasetProcessingStage({
                    dataProcessingStage: 'Processing',
                    rowsLoaded
                });
                const dataset = getMappedDataset(categorical);
                updateDataset({
                    categories: categorical?.categories,
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
