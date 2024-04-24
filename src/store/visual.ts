import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import EditMode = powerbi.EditMode;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TStoreState } from '.';
import VisualSettings from '../properties/visual-settings';
import {
    calculatePreviewMaximumHeight,
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getEditPaneDefaultWidth,
    getResizablePaneSize
} from '../core/ui/advancedEditor';
import { getReportViewport } from '../core/ui/dom';
import { IVisualUpdateSliceProperties } from './visual-update';
import { getParsedSpec } from '../features/specification';
import { getSpecificationParseOptions } from '../features/specification/logic';
import { TSpecProvider } from '../core/vega';
import { logDebug } from '../features/logging';
import { isVisualUpdateVolatile } from '../features/visual-host';
import {
    IVisualUpdateHistoryRecord,
    InterfaceMode,
    getApplicationMode,
    getCorrectViewport
} from '../features/interface';
import { getOnboardingDialog } from '../features/modal-dialog';
import {
    IZoomOtherCommandTestOptions,
    IZoomLevelCommandTestOptions,
    isZoomOtherCommandEnabled,
    isZoomInCommandEnabled,
    isZoomOutCommandEnabled,
    isExportSpecCommandEnabled,
    IExportSpecCommandTestOptions
} from '../features/commands';
import { SpecProvider } from '@deneb-viz/core-dependencies';
import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { PROVIDER_VERSIONS } from '../../config';

const defaultViewport = { width: 0, height: 0 };

const MAX_UPDATE_HISTORY_COUNT = 100;

export interface IVisualSlice {
    visual4d3d3d: boolean;
    visualSettings: VisualSettings;
    visualUpdates: number;
    visualViewportCurrent: IViewport;
    visualViewportReport: IViewport;
    setVisual4d3d3d: (status: boolean) => void;
    setVisualUpdate: (payload: IVisualUpdatePayload) => void;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IVisualSlice>{
        visual4d3d3d: false,
        visualSettings: <VisualSettings>VisualSettings.getDefault(),
        visualUpdates: 0,
        visualViewportCurrent: defaultViewport,
        visualViewportReport: defaultViewport,
        setVisual4d3d3d: (status) =>
            set(
                (state) => handleSetVisual4d3d3d(state, status),
                false,
                'setVisual4d3d3d'
            ),
        setVisualUpdate: (payload) =>
            set(
                (state) => handleSetVisualUpdate(state, payload),
                false,
                'setVisualUpdate'
            )
    };

export const createVisualSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IVisualSlice
> = sliceStateInitializer;

interface IVisualUpdatePayload {
    settings: VisualSettings;
    options: VisualUpdateOptions;
}

const handleSetVisual4d3d3d = (
    state: TStoreState,
    status: boolean
): Partial<TStoreState> => ({
    visual4d3d3d: status
});

// eslint-disable-next-line max-lines-per-function
const handleSetVisualUpdate = (
    state: TStoreState,
    payload: IVisualUpdatePayload
): Partial<TStoreState> => {
    logDebug('setVisualUpdate', payload);
    const init = state.visualUpdates === 0;
    const positionNew = payload.settings.editor.position;
    const positionSwitch = positionNew !== state.visualSettings.editor.position;
    const datasetViewObjects =
        payload.options.dataViews[0]?.metadata.objects || {};
    const editMode = payload.options.editMode;
    const isInFocus = payload.options.isInFocus;
    const updateType = payload.options.type;
    const mode = getApplicationMode({
        currentMode: state.interface.mode,
        dataset: state.dataset,
        editMode,
        isInFocus,
        specification: payload.settings.vega.jsonSpec,
        updateType
    });
    const history: IVisualUpdateHistoryRecord[] = [
        {
            editMode,
            interfaceMode: mode,
            isInFocus,
            type: updateType,
            viewMode: payload.options.viewMode,
            viewport: payload.options.viewport
        }
    ].concat(
        state.visualUpdateOptions.history.slice(0, MAX_UPDATE_HISTORY_COUNT)
    );
    const viewportCurrent = getCorrectViewport(history);
    payload.options.viewport;
    const viewportReport = getReportViewport(
        viewportCurrent,
        payload.settings.display
    );
    const edPaneDefWidth = getEditPaneDefaultWidth(
        viewportCurrent,
        positionNew
    );
    const edPaneExpWidth =
        mode === 'Editor' &&
        (state.editorPaneExpandedWidth === null || positionSwitch)
            ? edPaneDefWidth
            : state.editorPaneExpandedWidth;
    const edPaneWidth =
        mode === 'Editor' && (state.editorPaneWidth === null || positionSwitch)
            ? edPaneDefWidth
            : getResizablePaneSize(
                  edPaneExpWidth,
                  state.editorPaneIsExpanded,
                  viewportCurrent,
                  positionNew
              );
    const edPrevAreaWidth = getEditorPreviewAreaWidth(
        viewportCurrent.width,
        edPaneWidth,
        positionNew
    );
    const edPrevAreaHeight = shouldUpdateHeight(mode, editMode, init)
        ? getPreviewAreaHeightInitial(
              viewportCurrent.height,
              state.editorPreviewAreaHeight
          )
        : state.editorPreviewAreaHeight;
    const edPrevAreaHeightMax = shouldUpdateHeight(mode, editMode, init)
        ? calculatePreviewMaximumHeight(viewportCurrent.height)
        : state.editorPreviewAreaHeightMax;
    const isExpanded = shouldUpdateHeight(mode, editMode, init)
        ? edPrevAreaHeight !== edPrevAreaHeightMax
        : state.editorPreviewDebugIsExpanded;
    const latch = shouldUpdateHeight(mode, editMode, init)
        ? edPrevAreaHeight
        : state.editorPreviewAreaHeightLatch;
    const specOptions = getSpecificationParseOptions(state);
    const spec =
        state.datasetProcessingStage == 'Processed'
            ? getParsedSpec(state.specification, specOptions, {
                  ...specOptions,
                  ...{
                      config: payload.settings.vega.jsonConfig,
                      logLevel: payload.settings.vega.logLevel,
                      provider: <TSpecProvider>payload.settings.vega.provider,
                      spec: payload.settings.vega.jsonSpec,
                      viewportHeight: viewportReport.height,
                      viewportWidth: viewportReport.width,
                      visualMode: mode
                  }
              })
            : state.specification;
    const shouldProcessDataset = isVisualUpdateVolatile({
        currentProcessingFlag: state.processing.shouldProcessDataset,
        currentOptions: payload.options,
        currentSettings: payload.settings,
        previousOptions: state.visualUpdateOptions,
        previousSettings: state.visualSettings
    });
    // Check to see if onboarding dialog should be shown
    const modalDialogRole = getOnboardingDialog(
        payload.settings,
        mode,
        state.interface.modalDialogRole
    );
    const zoomOtherCommandTest: IZoomOtherCommandTestOptions = {
        specification: spec,
        interfaceMode: mode
    };
    const zoomLevelCommandTest: IZoomLevelCommandTestOptions = {
        value: state.editorZoomLevel,
        specification: spec,
        interfaceMode: mode
    };
    const exportSpecCommandTest: IExportSpecCommandTestOptions = {
        editorIsDirty:
            state.editor.stagedSpec !== payload.settings.vega.jsonSpec ||
            state.editor.stagedConfig !== payload.settings.vega.jsonConfig,
        specification: spec,
        interfaceMode: mode
    };
    const visualUpdateOptions: IVisualUpdateSliceProperties = {
        ...payload.options,
        ...{
            history,
            updateId: payload['updateId']
        }
    };
    const exportMetadata = getUpdatedExportMetadata(state.export.metadata, {
        config:
            state.specification.status === 'valid'
                ? payload.settings.vega.jsonConfig
                : state.export.metadata.config,
        provider: payload.settings.vega.provider as SpecProvider,
        providerVersion: PROVIDER_VERSIONS[payload.settings.vega.provider],
        interactivity: {
            tooltip: payload.settings.vega.enableTooltips,
            contextMenu: payload.settings.vega.enableContextMenu,
            selection: payload.settings.vega.enableSelection,
            selectionMode: payload.settings.vega.selectionMode,
            highlight: payload.settings.vega.enableHighlight,
            dataPointLimit: payload.settings.vega.selectionMaxDataPoints
        }
    });
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled(
                exportSpecCommandTest
            ),
            zoomFit: isZoomOtherCommandEnabled(zoomOtherCommandTest),
            zoomIn: isZoomInCommandEnabled(zoomLevelCommandTest),
            zoomOut: isZoomOutCommandEnabled(zoomLevelCommandTest),
            zoomReset: isZoomOtherCommandEnabled(zoomLevelCommandTest)
        },
        datasetViewObjects,
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        editorIsNewDialogVisible: payload.settings.vega.isNewDialogOpen,
        editorPaneWidth: edPaneWidth,
        editorPaneDefaultWidth: edPaneDefWidth,
        editorPaneExpandedWidth: edPaneExpWidth,
        editorPreviewAreaHeight: edPrevAreaHeight,
        editorPreviewAreaHeightMax: edPrevAreaHeightMax,
        editorPreviewAreaWidth: edPrevAreaWidth,
        editorPreviewAreaHeightLatch: latch,
        editorPreviewDebugIsExpanded: isExpanded,
        export: {
            ...state.export,
            metadata: exportMetadata
        },
        interface: {
            ...state.interface,
            modalDialogRole,
            mode
        },
        processing: {
            ...state.processing,
            shouldProcessDataset
        },
        specification: {
            ...state.specification,
            ...spec
        },
        visualSettings: payload.settings,
        visualUpdates: state.visualUpdates + 1,
        visualViewportCurrent: viewportCurrent,
        visualViewportReport: viewportReport,
        visualUpdateOptions
    };
};

const shouldUpdateHeight = (
    mode: InterfaceMode,
    visualEditMode: EditMode,
    init: boolean
) => mode === 'Editor' || (visualEditMode === EditMode.Advanced && init);
