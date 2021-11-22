import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { GetState, PartialState, SetState } from 'zustand';
import { TStoreState } from '.';
import VisualSettings from '../properties/VisualSettings';
import { resolveVisualMode, TVisualMode } from '../core/ui';
import {
    calculateVegaViewport,
    getEditorPreviewAreaWidth,
    getResizablePaneDefaultWidth,
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
    visualViewMode: ViewMode;
    visualViewportCurrent: IViewport;
    visualViewportReport: IViewport;
    visualViewportVega: IViewport;
    setVisual4d3d3d: (status: boolean) => void;
    setVisualUpdate: (payload: IVisualUpdatePayload) => void;
}

export const createVisualSlice = (
    set: SetState<TStoreState>,
    get: GetState<TStoreState>
) =>
    <IVisualSlice>{
        visual4d3d3d: false,
        visualEditMode: EditMode.Default,
        visualIsInFocusMode: false,
        visualMode: 'SplashInitial',
        visualSettings: <VisualSettings>VisualSettings.getDefault(),
        visualUpdates: 0,
        visualViewMode: ViewMode.View,
        visualViewportCurrent: defaultViewport,
        visualViewportReport: defaultViewport,
        visualViewportVega: defaultViewport,
        setVisual4d3d3d: (status) =>
            set((state) => handleSetVisual4d3d3d(state, status)),
        setVisualUpdate: (payload) =>
            set((state) => handleSetVisualUpdate(state, payload))
    };

interface IVisualUpdatePayload {
    settings: VisualSettings;
    options: VisualUpdateOptions;
}

const handleSetVisual4d3d3d = (
    state: TStoreState,
    status: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    visual4d3d3d: status
});

const handleSetVisualUpdate = (
    state: TStoreState,
    payload: IVisualUpdatePayload
): PartialState<TStoreState, never, never, never, never> => {
    const positionNew = payload.settings.editor.position;
    const positionSwitch = positionNew !== state.visualSettings.editor.position;
    const datasetViewObjects =
        payload.options.dataViews[0]?.metadata.objects || {};
    const visualViewMode = payload.options.viewMode;
    const visualEditMode = payload.options.editMode;
    const visualIsInFocusMode = payload.options.isInFocus;
    const visualMode = resolveVisualMode(
        state.datasetViewHasValidMapping,
        visualEditMode,
        visualIsInFocusMode,
        visualViewMode,
        state.editorSpec
    );
    const visualViewportCurrent = payload.options.viewport;
    const visualViewportReport =
        (visualMode !== 'Editor' && getReportViewport(visualViewportCurrent)) ||
        state.visualViewportReport;
    const editorPaneDefaultWidth = getResizablePaneDefaultWidth(
        visualViewportCurrent,
        positionNew
    );
    const editorPaneExpandedWidth =
        visualMode === 'Editor' &&
        (state.editorPaneExpandedWidth === null || positionSwitch)
            ? editorPaneDefaultWidth
            : state.editorPaneExpandedWidth;
    const editorPaneWidth =
        visualMode === 'Editor' &&
        (state.editorPaneWidth === null || positionSwitch)
            ? editorPaneDefaultWidth
            : getResizablePaneSize(
                  editorPaneExpandedWidth,
                  state.editorPaneIsExpanded,
                  visualViewportCurrent,
                  positionNew
              );
    const editorPreviewAreaWidth = getEditorPreviewAreaWidth(
        visualViewportCurrent.width,
        editorPaneWidth,
        positionNew
    );
    const visualViewportVega = calculateVegaViewport(
        visualViewportCurrent,
        editorPaneWidth,
        visualMode,
        positionNew
    );
    return {
        datasetViewObjects,
        editorIsNewDialogVisible: payload.settings.vega.isNewDialogOpen,
        editorPaneWidth,
        editorPaneDefaultWidth,
        editorPaneExpandedWidth,
        editorPreviewAreaWidth,
        visualEditMode,
        visualIsInFocusMode,
        visualMode,
        visualSettings: payload.settings,
        visualUpdates: state.visualUpdates + 1,
        visualViewMode,
        visualViewportCurrent,
        visualViewportReport,
        visualViewportVega
    };
};
