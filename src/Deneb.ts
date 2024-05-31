import '../style/visual.less';
import 'ace-builds';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import FormattingModel = powerbi.visuals.FormattingModel;

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './components/App';

import { getState } from './store';
import { canFetchMoreFromDataview, getRowCount } from './core/data/dataView';
import { getMappedDataset } from './core/data/dataset';
import { handlePropertyMigration } from './core/utils/versioning';
import { resolveReportViewport } from './core/ui/dom';
import {
    logDebug,
    logHeading,
    logHost,
    logTimeEnd,
    logTimeStart
} from './features/logging';
import {
    VegaExtensibilityServices,
    VegaPatternFillServices
} from './features/vega-extensibility';
import {
    I18nServices,
    getLocale,
    getLocalizationManager
} from './features/i18n';
import {
    VisualHostServices,
    getCategoricalDataViewFromOptions,
    getVisualHost,
    isVisualUpdateTypeResizeEnd,
    isVisualUpdateTypeVolatile,
    setRenderingFailed,
    setRenderingStarted
} from './features/visual-host';
import { APPLICATION_INFORMATION, FEATURES } from '../config';
import {
    VisualFormattingSettingsModel,
    VisualFormattingSettingsService,
    getVisualFormattingModel,
    getVisualFormattingService
} from '@deneb-viz/integration-powerbi';

/**
 * Run to indicate that the visual has started.
 */
logHeading(`${APPLICATION_INFORMATION?.displayName}`);
logHeading(`Version: ${APPLICATION_INFORMATION?.version}`, 12);

export class Deneb implements IVisual {
    private settings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        logHost('Constructor has been called.', { options });
        try {
            VisualHostServices.bind(options);
            I18nServices.bind(options);
            VegaPatternFillServices.bind();
            VisualFormattingSettingsService.bind(getLocalizationManager());
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
            logTimeStart('update');
            // Parse the settings for use in the visual
            this.settings = getVisualFormattingModel(options?.dataViews?.[0]);
            this.settings.resolveDeveloperSettings(FEATURES.developer_mode);
            // Handle the update options and dispatch to store as needed
            this.resolveUpdateOptions(options);
            logTimeEnd('update');
            return;
        } catch (e) {
            // Signal that we've encountered an error
            setRenderingFailed(e.message);
        }
    }

    private resolveUpdateOptions(options: VisualUpdateOptions) {
        logDebug('Resolving update options...', { options });
        logTimeStart('resolveUpdateOptions');
        VisualHostServices.update(options);
        // Signal we've begun rendering
        setRenderingStarted();
        this.resolveLocale();
        this.resolveViewport(options);
        VegaExtensibilityServices.bind(
            this.settings.theme.ordinal.ordinalColorCount.value
        );
        // Provide intial update options to store
        const { setVisualUpdate } = getState();
        setVisualUpdate({
            options,
            settings: this.settings
        });
        // Perform any necessary property migrations
        handlePropertyMigration(this.settings);
        // Data change or re-processing required?
        this.resolveDataset(options);
        const {
            interface: { isInitialized, setExplicitInitialize }
        } = getState();
        if (!isInitialized) {
            logDebug('Visual has not been initialized yet. Setting...');
            setExplicitInitialize();
        }
        logTimeEnd('resolveUpdateOptions');
    }

    /**
     * Resolve the dataset for the visual update, based on the current state and the incoming options.
     */
    private resolveDataset(options: VisualUpdateOptions) {
        let fetchSuccess = false;
        const {
            processing: { shouldProcessDataset },
            updateDataset,
            updateDatasetProcessingStage
        } = getState();
        const categorical = getCategoricalDataViewFromOptions(options);
        if (shouldProcessDataset) {
            logDebug('Visual dataset has changed and should be re-processed.');
            logTimeStart('processDataset');
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
                fetchSuccess = getVisualHost().fetchMoreData(true);
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
            logTimeEnd('processDataset');
        } else {
            logDebug('Visual dataset has not changed. No need to process.');
        }
    }

    /**
     * Resolve the locale for the visual update, based on the host or the overridden value in the developer settings.
     */
    private resolveLocale() {
        logDebug('Resolving locale options...');
        const locale = FEATURES.developer_mode
            ? (this.settings.developer.localization.locale.value as string)
            : getLocale();
        logDebug('Locale resolved.', { locale });
        I18nServices.update(locale);
    }

    /**
     * Manage persistent viewport sizing for view vs. editor
     */
    private resolveViewport(options: VisualUpdateOptions) {
        switch (true) {
            case isVisualUpdateTypeVolatile(options):
            case isVisualUpdateTypeResizeEnd(options.type): {
                logDebug('Resolving viewport options...');
                resolveReportViewport(
                    options.viewport,
                    options.viewMode,
                    options.editMode,
                    {
                        height: Number.parseFloat(
                            this.settings.stateManagement.viewport
                                .viewportHeight.value
                        ),
                        width: Number.parseFloat(
                            this.settings.stateManagement.viewport.viewportWidth
                                .value
                        )
                    }
                );
            }
        }
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the objects
     * and properties you want to expose to the users in the property pane.
     *
     * This is the newer way of populating the properties pane, using the new-style formatting cards.
     */
    public getFormattingModel(): FormattingModel {
        logDebug('[start] getformattingModel');
        const model = getVisualFormattingService().buildFormattingModel(
            this.settings
        );
        logDebug('[return] getFormattingModel', { model });
        return model;
    }
}
