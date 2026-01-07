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

import { getDenebVisualState, useDenebVisualState } from './state';
import {
    handlePropertyMigration,
    bindPersistPropertiesHost,
    VisualFormattingSettingsService,
    getVisualFormattingService
} from './lib/persistence';
import { VisualHostServices } from './lib/host';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import {
    logDebug,
    logHeading,
    logHost,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { InteractivityManager } from './lib/interactivity';
import {
    getDenebState,
    type I18nLocale,
    updateFieldTracking
} from '@deneb-viz/app-core';
import { VegaExtensibilityServices } from '@deneb-viz/vega-runtime/extensibility';
import {
    canFetchMoreFromDataview,
    getCategoricalDataViewFromOptions,
    getCategoricalRowCount,
    getMappedDataset,
    hasDataViewChanged
} from './lib/dataset';
import { I18N_TRANSLATIONS } from './i18n';
import { initializeStoreSynchronization } from './lib/state';
import {
    createCrossFilterApplyHandler,
    createCrossFilterClearHandler
} from './lib/vega-embed';
import { APPLICATION_NAME, APPLICATION_VERSION } from './lib/application';

/**
 * Centralize/report developer mode from environment.
 */
const IS_DEVELOPER_MODE = toBoolean(process.env.PBIVIZ_DEV_MODE);

/**
 * Run to indicate that the visual has started.
 */
IS_DEVELOPER_MODE && console.clear();
logHeading(`${APPLICATION_NAME}`);
logHeading(`Version: ${APPLICATION_VERSION}`, 12);
logDebug(`Developer Mode: ${IS_DEVELOPER_MODE}`);

export class Deneb implements IVisual {
    #applicationWrapper: HTMLElement;
    #root: ReturnType<typeof createRoot>;
    #host: powerbi.extensibility.visual.IVisualHost;

    constructor(options: VisualConstructorOptions) {
        logHost('Constructor has been called.', { options });
        try {
            const { host } = options;
            this.#host = host;
            const {
                dataset: { setSelectors },
                host: { setHost },
                interactivity: { setSelectionLimitExceeded }
            } = getDenebVisualState();
            const {
                i18n: { setLocale }
            } = getDenebState();
            setHost(host);
            VisualHostServices.bind(options);
            bindPersistPropertiesHost(host);
            InteractivityManager.bind({
                host,
                limitExceededCallback: setSelectionLimitExceeded,
                selectorUpdateCallback: setSelectors
            });
            setLocale({
                locale: host.locale as I18nLocale,
                translationExtensions: [I18N_TRANSLATIONS]
            });
            VegaExtensibilityServices.bind(host.colorPalette);
            VegaExtensibilityServices.setExpressionHandlers({
                onCrossFilterClear: createCrossFilterClearHandler(),
                onCrossFilterApply: createCrossFilterApplyHandler()
            });
            VisualFormattingSettingsService.bind(
                options.host.createLocalizationManager()
            );
            initializeStoreSynchronization();
            const { element } = options;
            this.#applicationWrapper = document.createElement('div');
            this.#applicationWrapper.id = 'deneb-application-wrapper';
            element.appendChild(this.#applicationWrapper);
            this.handleSuppressOnObjectFormatting();
            this.#root = createRoot(this.#applicationWrapper);
            this.#root.render(createElement(App, { host }));
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
            logHost('Rendering event failed:', e.message);
            this.#host.eventService.renderingFailed(options);
        }
    }

    private resolveUpdateOptions(options: VisualUpdateOptions) {
        logDebug('Resolving update options...', { options });
        logTimeStart('resolveUpdateOptions');
        // Provide initial update options to store
        // TODO: we're side-loading these for now until we can refactor the Deneb app store and app to be less reliant
        const { setVisualUpdateOptions } =
            useDenebVisualState.getState().updates;
        setVisualUpdateOptions({ options, isDeveloperMode: IS_DEVELOPER_MODE });
        this.resolveLocale();
        const { settings } = getDenebVisualState();
        // Signal we've begun rendering
        logHost('Rendering event started.');
        this.#host.eventService.renderingStarted(options);
        // Perform any necessary property migrations
        handlePropertyMigration(settings);
        // Data change or re-processing required?
        this.resolveDataset(options);
        logTimeEnd('resolveUpdateOptions');
    }

    /**
     * Resolve the dataset for the visual update, based on the current state and the incoming options.
     */
    private resolveDataset(options: VisualUpdateOptions) {
        let fetchSuccess = false;
        const {
            dataset: { shouldProcess, setDataset, setIsFetchingAdditional },
            settings
        } = getDenebVisualState();
        const {
            vega: {
                interactivity: {
                    enableHighlight: { value: enableHighlight },
                    enableSelection: { value: enableSelection }
                }
            }
        } = settings;
        const {
            i18n: { locale }
        } = getDenebState();
        const categorical = getCategoricalDataViewFromOptions(options);

        // Do a quick check of the data view to see if it should be processed, to avoid unnecessary processing/syncing
        const canFetchMore = canFetchMoreFromDataview(
            settings,
            options?.dataViews?.[0]?.metadata
        );
        let dataChanged = false;
        if (shouldProcess) {
            dataChanged = hasDataViewChanged(
                categorical,
                enableSelection,
                enableHighlight
            );
            logDebug('Data changed check', { dataChanged });
        }

        if (shouldProcess && dataChanged) {
            logDebug('Visual dataset has changed and should be re-processed.');
            logTimeStart('processDataset');
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
                setIsFetchingAdditional({
                    isFetchingAdditional: true,
                    rowsLoaded
                });
                fetchSuccess = this.#host.fetchMoreData(true);
            }
            if (!fetchSuccess) {
                logDebug('No more data to fetch. Processing dataset...');
                setIsFetchingAdditional({
                    isFetchingAdditional: false,
                    rowsLoaded
                });
                const dataset = getMappedDataset(categorical, locale);
                setDataset(dataset);
                // Tracking is now only used for export (#486)
                // this.updateTracking();
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
        const { settings } = getDenebVisualState();
        const { locale, setLocale } = getDenebState().i18n;
        const localeNext = IS_DEVELOPER_MODE
            ? (settings.developer.localization.locale.value as string)
            : locale;
        if (localeNext !== locale) {
            logDebug('Locale has changed. Updating...', {
                localeCurrent: locale,
                localeNext
            });
            setLocale({
                locale: localeNext as I18nLocale
            });
        }
    }

    /**'
     * Perform the necessary tracking updates for the visual data and spec.
     */
    private async updateTracking() {
        logDebug('[Visual Update] Updating tracking and tokens...');
        const { settings } = getDenebVisualState();
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
        const { settings } = getDenebVisualState();
        const model =
            getVisualFormattingService().buildFormattingModel(settings);
        logDebug('[return] getFormattingModel', { model });
        return model;
    }
}
