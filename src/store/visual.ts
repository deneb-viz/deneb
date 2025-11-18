import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { calculatePreviewMaximumHeight } from '../core/ui/advancedEditor';
import { getReportViewport } from '../core/ui/dom';
import { getParsedSpec } from '../features/specification';
import { getSpecificationParseOptions } from '../features/specification/logic';
import { logDebug } from '../features/logging';
import { isVisualUpdateVolatile } from '../features/visual-host';
import { getCorrectViewport } from '../features/interface';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { PROVIDER_VERSIONS } from '../../config';
import {
    VisualFormattingSettingsModel,
    getVisualFormattingModel
} from '@deneb-viz/powerbi-compat/properties';
import {
    type EditorPanePosition,
    type ExportSpecCommandTestOptions,
    type InterfaceMode,
    type StoreState,
    type VisualSlice,
    type VisualUpdateSliceProperties,
    type VisualUpdateHistoryRecord,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions,
    getModalDialogRole,
    getApplicationMode,
    isExportSpecCommandEnabled,
    isZoomOtherCommandsEnabled,
    isZoomInCommandEnabled,
    isZoomOutCommandEnabled,
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getEditPaneDefaultWidth,
    getResizablePaneSize
} from '@deneb-viz/app-core';

const defaultViewport = { width: 0, height: 0 };

const MAX_UPDATE_HISTORY_COUNT = 100;

const sliceStateInitializer = (set: NamedSet<StoreState>) =>
    <VisualSlice>{
        visual4d3d3d: false,
        visualSettings: getVisualFormattingModel(),
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
    StoreState,
    [['zustand/devtools', never]],
    [],
    VisualSlice
> = sliceStateInitializer;

interface IVisualUpdatePayload {
    settings: VisualFormattingSettingsModel;
    options: VisualUpdateOptions;
}

const handleSetVisual4d3d3d = (
    state: StoreState,
    status: boolean
): Partial<StoreState> => ({
    visual4d3d3d: status
});

// eslint-disable-next-line max-lines-per-function
const handleSetVisualUpdate = (
    state: StoreState,
    payload: IVisualUpdatePayload
): Partial<StoreState> => {
    logDebug('setVisualUpdate', payload);
    const init = state.visualUpdates === 0;
    const positionNew = <EditorPanePosition>(
        payload.settings.editor.json.position.value
    );
    const positionSwitch =
        positionNew !== state.visualSettings.editor.json.position.value;
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
        prevMode: state.interface.mode,
        prevUpdateType: state.visualUpdateOptions.type,
        specification: payload.settings.vega.output.jsonSpec.value,
        updateType,
        visualUpdates: state.visualUpdates
    });
    const history: VisualUpdateHistoryRecord[] = [
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
    const viewportReport = getReportViewport(viewportCurrent, {
        height: Number.parseFloat(
            payload.settings.stateManagement.viewport.viewportHeight.value
        ),
        width: Number.parseFloat(
            payload.settings.stateManagement.viewport.viewportWidth.value
        )
    });
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
                      config: payload.settings.vega.output.jsonConfig.value,
                      logLevel: <number>(
                          payload.settings.vega.logging.logLevel.value
                      ),
                      provider: <SpecProvider>(
                          payload.settings.vega.output.provider.value
                      ),
                      spec: payload.settings.vega.output.jsonSpec.value,
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
        previousOptions: state.visualUpdateOptions as VisualUpdateOptions,
        previousSettings: state.visualSettings
    });
    // Check to see if onboarding dialog should be shown
    const modalDialogRole = getModalDialogRole(
        payload.settings,
        mode,
        state.interface.modalDialogRole
    );
    const zoomOtherCommandTest: ZoomOtherCommandTestOptions = {
        specification: spec,
        interfaceMode: mode
    };
    const zoomLevelCommandTest: ZoomLevelCommandTestOptions = {
        value: state.editorZoomLevel,
        specification: spec,
        interfaceMode: mode
    };
    const exportSpecCommandTest: ExportSpecCommandTestOptions = {
        editorIsDirty:
            (state.editor.stagedSpec !== null &&
                state.editor.stagedSpec !==
                    payload.settings.vega.output.jsonSpec.value) ||
            (state.editor.stagedConfig !== null &&
                state.editor.stagedConfig !==
                    payload.settings.vega.output.jsonConfig.value),
        specification: spec,
        interfaceMode: mode
    };
    const visualUpdateOptions: VisualUpdateSliceProperties = {
        ...payload.options,
        ...{
            history,
            updateId: payload['updateId']
        }
    };
    const exportMetadata = getUpdatedExportMetadata(state.export.metadata, {
        config:
            state.specification.status === 'valid'
                ? payload.settings.vega.output.jsonConfig.value
                : state.export.metadata.config,
        provider: payload.settings.vega.output.provider.value as SpecProvider,
        providerVersion:
            PROVIDER_VERSIONS[payload.settings.vega.output.provider.value],
        interactivity: {
            tooltip: payload.settings.vega.interactivity.enableTooltips.value,
            contextMenu:
                payload.settings.vega.interactivity.enableContextMenu.value,
            selection:
                payload.settings.vega.interactivity.enableSelection.value,
            selectionMode: payload.settings.vega.interactivity.selectionMode
                .value as SelectionMode,
            highlight:
                payload.settings.vega.interactivity.enableHighlight.value,
            dataPointLimit:
                payload.settings.vega.interactivity.selectionMaxDataPoints.value
        }
    });
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled(
                exportSpecCommandTest
            ),
            zoomFit: isZoomOtherCommandsEnabled(zoomOtherCommandTest),
            zoomIn: isZoomInCommandEnabled(zoomLevelCommandTest),
            zoomOut: isZoomOutCommandEnabled(zoomLevelCommandTest),
            zoomReset: isZoomOtherCommandsEnabled(zoomLevelCommandTest)
        },
        datasetViewObjects,
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        editorIsNewDialogVisible:
            payload.settings.vega.state.isNewDialogOpen.value,
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
