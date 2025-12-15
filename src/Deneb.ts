import '../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import FormattingModel = powerbi.visuals.FormattingModel;

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

import { getDenebVisualState } from './store';
import { getMappedDataset } from './core/data/dataset';
import { handlePropertyMigration } from './lib/persistence';
import {
    VisualFormattingSettingsService,
    getVisualFormattingService
} from '@deneb-viz/powerbi-compat/properties';
import {
    canFetchMoreFromDataview,
    getCategoricalDataViewFromOptions,
    getCategoricalRowCount,
    getLocale,
    getLocalizationManager,
    getVisualHost,
    getVisualSettings,
    I18nServices,
    setRenderingFailed,
    setRenderingStarted,
    VisualHostServices
} from '@deneb-viz/powerbi-compat/visual-host';
import { APPLICATION_INFORMATION_CONFIGURATION } from '@deneb-viz/configuration';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import {
    logDebug,
    logHeading,
    logHost,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { VegaPatternFillServices } from '@deneb-viz/vega-runtime/pattern-fill';
import { InteractivityManager } from '@deneb-viz/powerbi-compat/interactivity';
import { getDenebState, updateFieldTracking } from '@deneb-viz/app-core';
import { VegaExtensibilityServices } from '@deneb-viz/vega-runtime/extensibility';
import { type SelectionMode } from '@deneb-viz/template-usermeta';

/**
 * Centralize/report developer mode from environment.
 */
const IS_DEVELOPER_MODE = toBoolean(process.env.PBIVIZ_DEV_MODE);

/**
 * Run to indicate that the visual has started.
 */
IS_DEVELOPER_MODE && console.clear();
logHeading(`${APPLICATION_INFORMATION_CONFIGURATION?.displayName}`);
logHeading(`Version: ${APPLICATION_INFORMATION_CONFIGURATION?.version}`, 12);
logDebug(`Developer Mode: ${IS_DEVELOPER_MODE}`);

export class Deneb implements IVisual {
    #applicationWrapper: HTMLElement;
    #root: ReturnType<typeof createRoot>;

    constructor(options: VisualConstructorOptions) {
        logHost('Constructor has been called.', { options });
        try {
            const { host } = options;
            const { setSelectionLimitExceeded } =
                getDenebVisualState().interactivity;
            const { updateDatasetSelectors } = getDenebState();
            VisualHostServices.bind(options);
            InteractivityManager.bind({
                host,
                limitExceededCallback: setSelectionLimitExceeded,
                selectorUpdateCallback: updateDatasetSelectors
            });
            I18nServices.bind(options);
            VegaPatternFillServices.bind();
            VegaExtensibilityServices.bind(host.colorPalette);
            VisualFormattingSettingsService.bind(getLocalizationManager());
            const { element } = options;
            this.#applicationWrapper = document.createElement('div');
            this.#applicationWrapper.id = 'deneb-application-wrapper';
            element.appendChild(this.#applicationWrapper);
            this.handleSuppressOnObjectFormatting();
            this.#root = createRoot(this.#applicationWrapper);
            this.#root.render(createElement(App));
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
            this.resolveUpdateOptions(options);
            logTimeEnd('update');
            return;
        } catch (e) {
            // Signal that we've encountered an error
            logDebug('Error during visual update.', { error: e });
            setRenderingFailed(e.message);
        }
    }

    private resolveUpdateOptions(options: VisualUpdateOptions) {
        logDebug('Resolving update options...', { options });
        logTimeStart('resolveUpdateOptions');
        VisualHostServices.update(options, IS_DEVELOPER_MODE);
        // Signal we've begun rendering
        setRenderingStarted();
        this.resolveLocale();
        // Provide intial update options to store
        const { setVisualUpdate } = getDenebState();
        const settings = getVisualSettings();
        const { setVisualSettings } = getDenebVisualState().settings;
        setVisualSettings(settings);
        // TODO: likely migrate to visual store action and add as dependency to main app
        setVisualUpdate({
            options,
            settings
        });
        // Perform any necessary property migrations
        handlePropertyMigration(settings);
        // Data change or re-processing required?
        this.resolveDataset(options);
        const {
            interface: { isInitialized, setExplicitInitialize }
        } = getDenebState();
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
        const settings = getVisualSettings();
        const {
            vega: {
                interactivity: {
                    enableHighlight: { value: enableHighlight },
                    enableSelection: { value: enableSelection },
                    selectionMode: { value: selectionMode }
                }
            }
        } = settings;
        const {
            processing: { shouldProcessDataset },
            specification: { logWarn },
            updateDataset,
            updateDatasetProcessingStage
        } = getDenebState();
        const categorical = getCategoricalDataViewFromOptions(options);
        if (shouldProcessDataset) {
            logDebug('Visual dataset has changed and should be re-processed.');
            logTimeStart('processDataset');
            const canFetchMore = canFetchMoreFromDataview(
                settings,
                options?.dataViews?.[0]?.metadata
            );
            const rowsLoaded = getCategoricalRowCount(categorical);
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
                const dataset = getMappedDataset(
                    categorical,
                    enableSelection,
                    enableHighlight
                );
                updateDataset({
                    dataset
                });
                // Tracking is now only used for export (#486)
                // this.updateTracking();
                VegaExtensibilityServices.update({
                    dataset: {
                        fields: dataset.fields,
                        values: dataset.values
                    },
                    selectionMode: selectionMode as SelectionMode,
                    logWarn
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
        const settings = getVisualSettings();
        const locale = IS_DEVELOPER_MODE
            ? (settings.developer.localization.locale.value as string)
            : getLocale();
        logDebug('Locale resolved.', { locale });
        I18nServices.update(locale);
    }

    /**'
     * Perform the necessary tracking updates for the visual data and spec.
     */
    private async updateTracking() {
        logDebug('[Visual Update] Updating tracking and tokens...');
        const settings = getVisualSettings();
        const {
            vega: {
                output: {
                    jsonSpec: { value: spec }
                }
            }
        } = settings;
        const {
            fieldUsage: { dataset: trackedFieldsCurrent }
        } = getDenebState();
        updateFieldTracking(spec, trackedFieldsCurrent);
    }

    /**
     * Ensure that double clicking on the application wrapper doesn't propagate to the host application (avoiding on-object formatting
     * from triggering in Desktop).
     */
    private handleSuppressOnObjectFormatting() {
        logDebug('Suppressing on object formatting...');
        this.#applicationWrapper.ondblclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the objects
     * and properties you want to expose to the users in the property pane.
     *
     * This is the newer way of populating the properties pane, using the new-style formatting cards.
     */
    public getFormattingModel(): FormattingModel {
        logDebug('[start] getformattingModel');
        const settings = getVisualSettings();
        const model =
            getVisualFormattingService().buildFormattingModel(settings);
        logDebug('[return] getFormattingModel', { model });
        return model;
    }
}
