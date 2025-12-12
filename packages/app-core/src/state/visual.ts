import powerbi from 'powerbi-visuals-api';
import {
    getVisualFormattingModel,
    VisualFormattingSettingsModel
} from '@deneb-viz/powerbi-compat/properties';
import {
    type EditorPanePosition,
    type ExportSpecCommandTestOptions,
    getApplicationMode,
    getCorrectViewport,
    getEditorPreviewAreaWidth,
    getEditPaneDefaultWidth,
    getModalDialogRole,
    getPreviewAreaHeightInitial,
    getPreviewAreaHeightMaximum,
    getReportViewport,
    getResizablePaneSize,
    type InterfaceMode,
    isExportSpecCommandEnabled,
    isZoomInCommandEnabled,
    isZoomOtherCommandsEnabled,
    isZoomOutCommandEnabled,
    type VisualUpdateHistoryRecord,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions
} from '../lib';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { type VisualUpdateSliceProperties } from './visual-update';
import {
    isAdvancedEditor,
    isVisualUpdateEventVolatile
} from '@deneb-viz/powerbi-compat/visual-host';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getSpecificationParseOptions } from './helpers';
import { type StoreState } from './state';
import { logDebug } from '@deneb-viz/utils/logging';
import { PROVIDER_VERSION_CONFIGURATION } from '@deneb-viz/configuration';
import {
    type SelectionMode,
    type UsermetaTemplate
} from '@deneb-viz/template-usermeta';
import { type StateCreator } from 'zustand';

const MAX_UPDATE_HISTORY_COUNT = 100;
const DEFAULT_VIEWPORT = { width: 0, height: 0 };

export type VisualSlice = {
    visualSettings: VisualFormattingSettingsModel;
    visualUpdates: number;
    visualViewportCurrent: powerbi.IViewport;
    visualViewportReport: powerbi.IViewport;
    setVisualUpdate: (payload: VisualUpdatePayload) => void;
};

export type VisualUpdatePayload = {
    settings: VisualFormattingSettingsModel;
    options: powerbi.extensibility.visual.VisualUpdateOptions;
};

export const createVisualSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        VisualSlice
    > =>
    (set) => ({
        visualSettings: getVisualFormattingModel(),
        visualUpdates: 0,
        visualViewportCurrent: DEFAULT_VIEWPORT,
        visualViewportReport: DEFAULT_VIEWPORT,
        setVisualUpdate: (payload) =>
            set(
                (state) => handleSetVisualUpdate(state, payload),
                false,
                'setVisualUpdate'
            )
    });

// eslint-disable-next-line max-lines-per-function
const handleSetVisualUpdate = (
    state: StoreState,
    payload: VisualUpdatePayload
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
    const editMode = payload.options.editMode as powerbi.EditMode;
    const viewMode = payload.options.viewMode as powerbi.ViewMode;
    const isInFocus = payload.options.isInFocus ?? false;
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
        viewMode,
        visualUpdates: state.visualUpdates
    });
    const history: VisualUpdateHistoryRecord[] = [
        {
            editMode,
            interfaceMode: mode,
            isInFocus,
            type: updateType,
            viewMode,
            viewport: payload.options.viewport
        }
    ].concat(
        (state.visualUpdateOptions.history ?? []).slice(
            0,
            MAX_UPDATE_HISTORY_COUNT
        )
    );
    const viewportCurrent = getCorrectViewport(history);
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
                  edPaneExpWidth as number,
                  state.editorPaneIsExpanded,
                  viewportCurrent,
                  positionNew
              );
    const edPrevAreaWidth = getEditorPreviewAreaWidth(
        viewportCurrent.width,
        edPaneWidth,
        positionNew
    );
    const edPrevAreaHeight = shouldUpdateHeight(
        mode,
        viewMode,
        editMode,
        isInFocus,
        init
    )
        ? getPreviewAreaHeightInitial(
              viewportCurrent.height,
              state.editorPreviewAreaHeight as number
          )
        : state.editorPreviewAreaHeight;
    const edPrevAreaHeightMax = shouldUpdateHeight(
        mode,
        viewMode,
        editMode,
        isInFocus,
        init
    )
        ? getPreviewAreaHeightMaximum(viewportCurrent.height)
        : state.editorPreviewAreaHeightMax;
    const isExpanded = shouldUpdateHeight(
        mode,
        viewMode,
        editMode,
        isInFocus,
        init
    )
        ? edPrevAreaHeight !== edPrevAreaHeightMax
        : state.editorPreviewDebugIsExpanded;
    const latch = shouldUpdateHeight(mode, viewMode, editMode, isInFocus, init)
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
    const shouldProcessDataset = isVisualUpdateEventVolatile({
        currentProcessingFlag: state.processing.shouldProcessDataset,
        currentOptions: payload.options,
        currentSettings: payload.settings,
        previousOptions:
            state.visualUpdateOptions as powerbi.extensibility.visual.VisualUpdateOptions,
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateId: (payload as any).updateId
        }
    };
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            config:
                state.specification.status === 'valid'
                    ? payload.settings.vega.output.jsonConfig.value
                    : state.export.metadata?.config,
            provider: payload.settings.vega.output.provider
                .value as SpecProvider,
            providerVersion:
                PROVIDER_VERSION_CONFIGURATION[
                    payload.settings.vega.output.provider.value as SpecProvider
                ],
            interactivity: {
                tooltip:
                    payload.settings.vega.interactivity.enableTooltips.value,
                contextMenu:
                    payload.settings.vega.interactivity.enableContextMenu.value,
                selection:
                    payload.settings.vega.interactivity.enableSelection.value,
                selectionMode: payload.settings.vega.interactivity.selectionMode
                    .value as SelectionMode,
                highlight:
                    payload.settings.vega.interactivity.enableHighlight.value,
                dataPointLimit:
                    payload.settings.vega.interactivity.selectionMaxDataPoints
                        .value
            }
        }
    );
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
    visualViewMode: powerbi.ViewMode,
    visualEditMode: powerbi.EditMode,
    isInFocus: boolean,
    init: boolean
) =>
    mode === 'Editor' ||
    (isAdvancedEditor(visualViewMode, visualEditMode, isInFocus) && init);
