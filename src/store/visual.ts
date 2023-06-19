import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualUpdateType = powerbi.VisualUpdateType;

import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TStoreState } from '.';
import VisualSettings from '../properties/VisualSettings';
import { resolveVisualMode, TVisualMode } from '../core/ui';
import {
    calculatePreviewMaximumHeight,
    calculateVegaViewport,
    getEditorPreviewAreaWidth,
    getPreviewAreaHeightInitial,
    getEditPaneDefaultWidth,
    getResizablePaneSize
} from '../core/ui/advancedEditor';
import { getReportViewport } from '../core/ui/dom';

const defaultViewport = { width: 0, height: 0 };

export interface IVisualSlice {
    visual4d3d3d: boolean;
    visualEditMode: EditMode;
    visualIsInFocusMode: boolean;
    visualMode: TVisualMode;
    visualSettings: VisualSettings;
    visualUpdates: number;
    visualUpdateType: VisualUpdateType;
    visualViewMode: ViewMode;
    visualViewportCurrent: IViewport;
    visualViewportReport: IViewport;
    visualViewportVega: IViewport;
    setVisual4d3d3d: (status: boolean) => void;
    setVisualUpdate: (payload: IVisualUpdatePayload) => void;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IVisualSlice>{
        visual4d3d3d: false,
        visualEditMode: EditMode.Default,
        visualIsInFocusMode: false,
        visualMode: 'SplashInitial',
        visualSettings: <VisualSettings>VisualSettings.getDefault(),
        visualUpdates: 0,
        visualUpdateType: null,
        visualViewMode: ViewMode.View,
        visualViewportCurrent: defaultViewport,
        visualViewportReport: defaultViewport,
        visualViewportVega: defaultViewport,
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

const handleSetVisualUpdate = (
    state: TStoreState,
    payload: IVisualUpdatePayload
): Partial<TStoreState> => {
    const init = state.visualUpdates === 0;
    const positionNew = payload.settings.editor.position;
    const positionSwitch = positionNew !== state.visualSettings.editor.position;
    const datasetViewObjects =
        payload.options.dataViews[0]?.metadata.objects || {};
    const viewMode = payload.options.viewMode;
    const editMode = payload.options.editMode;
    const isInFocus = payload.options.isInFocus;
    const updateType = payload.options.type;
    const visualMode = resolveVisualMode(
        state.datasetViewHasValidMapping,
        editMode,
        isInFocus,
        viewMode,
        state.specification
    );
    const viewportCurrent = payload.options.viewport;
    const viewportReport = getReportViewport(
        viewportCurrent,
        payload.settings.display
    );
    const edPaneDefWidth = getEditPaneDefaultWidth(
        viewportCurrent,
        positionNew
    );
    const edPaneExpWidth =
        visualMode === 'Editor' &&
        (state.editorPaneExpandedWidth === null || positionSwitch)
            ? edPaneDefWidth
            : state.editorPaneExpandedWidth;
    const edPaneWidth =
        visualMode === 'Editor' &&
        (state.editorPaneWidth === null || positionSwitch)
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
    const edPrevAreaHeight = shouldUpdateHeight(visualMode, editMode, init)
        ? getPreviewAreaHeightInitial(
              viewportCurrent.height,
              state.editorPreviewAreaHeight
          )
        : state.editorPreviewAreaHeight;
    const edPrevAreaHeightMax = shouldUpdateHeight(visualMode, editMode, init)
        ? calculatePreviewMaximumHeight(viewportCurrent.height)
        : state.editorPreviewAreaHeightMax;
    const isExpanded = shouldUpdateHeight(visualMode, editMode, init)
        ? edPrevAreaHeight !== edPrevAreaHeightMax
        : state.editorPreviewDebugIsExpanded;
    const latch = shouldUpdateHeight(visualMode, editMode, init)
        ? edPrevAreaHeight
        : state.editorPreviewAreaHeightLatch;
    const visualViewportVega = calculateVegaViewport(
        viewportCurrent,
        edPaneWidth,
        visualMode,
        positionNew
    );
    return {
        datasetViewObjects,
        editorIsNewDialogVisible: payload.settings.vega.isNewDialogOpen,
        editorPaneWidth: edPaneWidth,
        editorPaneDefaultWidth: edPaneDefWidth,
        editorPaneExpandedWidth: edPaneExpWidth,
        editorPreviewAreaHeight: edPrevAreaHeight,
        editorPreviewAreaHeightMax: edPrevAreaHeightMax,
        editorPreviewAreaWidth: edPrevAreaWidth,
        editorPreviewAreaHeightLatch: latch,
        editorPreviewDebugIsExpanded: isExpanded,
        visualEditMode: editMode,
        visualIsInFocusMode: isInFocus,
        visualMode,
        visualSettings: payload.settings,
        visualUpdates: state.visualUpdates + 1,
        visualUpdateType: updateType,
        visualViewMode: viewMode,
        visualViewportCurrent: viewportCurrent,
        visualViewportReport: viewportReport,
        visualViewportVega
    };
};

const shouldUpdateHeight = (
    visualMode: TVisualMode,
    visualEditMode: EditMode,
    init: boolean
) => visualMode === 'Editor' || (visualEditMode === EditMode.Advanced && init);
